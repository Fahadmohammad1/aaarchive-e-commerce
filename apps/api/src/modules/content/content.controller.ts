import { contactMessageSchema } from "@aaarchive/shared/content";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import type { z } from "zod";
import { Public } from "../../common/auth/auth.decorators.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { ContactService } from "./contact.service.js";
import { ContentService } from "./content.service.js";
import { PagesService } from "./pages.service.js";

/** Public content (PRD §5.1, §5.2, §5.11). Cached by the storefront per tag. */
@Public()
@Controller()
export class ContentController {
  constructor(
    private readonly content: ContentService,
    private readonly pages: PagesService,
    private readonly contact: ContactService,
  ) {}

  /** Every home section, resolved; a section not set up yet is null. */
  @Get("content/home")
  home() {
    return this.content.home();
  }

  /** Announcement, menu and footer. */
  @Get("content/site")
  site() {
    return this.content.site();
  }

  @Get("pages/:slug")
  page(@Param("slug") slug: string) {
    return this.pages.publicPage(slug);
  }

  @Get("faq")
  faq() {
    return this.pages.publicFaq();
  }

  /** Contact form: its own limit (rules.md §8.5). */
  @Post("contact")
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  send(
    @Body(new ZodValidationPipe(contactMessageSchema))
    body: z.output<typeof contactMessageSchema>,
    @Req() req: Request,
  ) {
    return this.contact.send(body, req.ip);
  }
}
