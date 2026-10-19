import { cacheTags } from "@aaarchive/shared/cache-tags";
import type {
  faqInputSchema,
  pageInputSchema,
} from "@aaarchive/shared/content";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import {
  isNotFound,
  isUniqueViolation,
} from "../../common/prisma/prisma-errors.js";
import type { FaqItem, Page } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";

type PageInput = z.output<typeof pageInputSchema>;
type FaqInput = z.output<typeof faqInputSchema>;

function toPage(p: Page) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    content: p.content,
    seoTitle: p.seoTitle,
    seoDesc: p.seoDesc,
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toFaq(f: FaqItem) {
  return {
    id: f.id,
    question: f.question,
    answer: f.answer,
    sortOrder: f.sortOrder,
    isActive: f.isActive,
  };
}

/**
 * Content pages and the FAQ (PRD §5.11). Bodies are Markdown-lite, never
 * HTML (user decision 2026-10-19), so nothing needs sanitising.
 */
@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  // ── Pages ────────────────────────────────────────────────────────────────

  async listPages() {
    const rows = await this.prisma.page.findMany({ orderBy: { title: "asc" } });
    return { data: rows.map(toPage) };
  }

  async getPage(id: string) {
    const row = await this.prisma.page.findUnique({ where: { id } });
    if (!row) throw notFound("Page");
    return toPage(row);
  }

  async publicPage(slug: string) {
    const row = await this.prisma.page.findUnique({ where: { slug } });
    if (!row) throw notFound("Page");
    const { id: _id, ...page } = toPage(row);
    return page;
  }

  async createPage(input: PageInput) {
    const row = await this.prisma.page
      .create({ data: input })
      .catch(pageRethrow);
    void this.revalidatePage(row.slug);
    return toPage(row);
  }

  async updatePage(id: string, input: PageInput) {
    const before = await this.prisma.page.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!before) throw notFound("Page");
    const row = await this.prisma.page
      .update({ where: { id }, data: input })
      .catch(pageRethrow);
    void this.revalidatePage(row.slug, before.slug);
    return toPage(row);
  }

  async removePage(id: string) {
    const row = await this.prisma.page
      .delete({ where: { id } })
      .catch(pageRethrow);
    void this.revalidatePage(row.slug);
  }

  private revalidatePage(...slugs: string[]) {
    return this.revalidation.revalidate([
      cacheTags.content,
      ...[...new Set(slugs)].map(cacheTags.page),
    ]);
  }

  // ── FAQ ──────────────────────────────────────────────────────────────────

  async listFaq() {
    const rows = await this.prisma.faqItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return { data: rows.map(toFaq) };
  }

  async publicFaq() {
    const rows = await this.prisma.faqItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
    }));
  }

  async createFaq(input: FaqInput) {
    const row = await this.prisma.faqItem.create({ data: input });
    void this.revalidation.revalidate([cacheTags.faq, cacheTags.content]);
    return toFaq(row);
  }

  async updateFaq(id: string, input: FaqInput) {
    const row = await this.prisma.faqItem
      .update({ where: { id }, data: input })
      .catch((e) => {
        if (isNotFound(e)) throw notFound("Question");
        throw e;
      });
    void this.revalidation.revalidate([cacheTags.faq, cacheTags.content]);
    return toFaq(row);
  }

  async removeFaq(id: string) {
    await this.prisma.faqItem.delete({ where: { id } }).catch((e) => {
      if (isNotFound(e)) throw notFound("Question");
      throw e;
    });
    void this.revalidation.revalidate([cacheTags.faq, cacheTags.content]);
  }
}

function notFound(what: string) {
  return new NotFoundException({
    message: `${what} not found`,
    code: "NOT_FOUND",
  });
}

function pageRethrow(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new ConflictException({
      message: "Another page already uses this address",
      code: "SLUG_TAKEN",
    });
  }
  if (isNotFound(error)) throw notFound("Page");
  throw error;
}
