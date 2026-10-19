import {
  faqInputSchema,
  pageInputSchema,
  socialPostInputSchema,
} from "@aaarchive/shared/content";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import type { z } from "zod";
import { CurrentUser, Roles } from "../../common/auth/auth.decorators.js";
import type { RequestUser } from "../../common/auth/request-user.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { ContentService } from "./content.service.js";
import { PagesService } from "./pages.service.js";
import { SocialPostsService } from "./social-posts.service.js";

/**
 * Content → Home / Site (PRD §6.7). Reads OWNER/STAFF; writes OWNER. The
 * body is validated in the service with the schema of `:key`.
 */
@Controller("admin/content")
@UseGuards(SameOriginGuard)
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  list() {
    return this.content.adminList();
  }

  @Put(":key")
  @Roles("OWNER")
  save(
    @Param("key") key: string,
    @Body() body: { data?: unknown },
    @CurrentUser() user: RequestUser,
  ) {
    return this.content.save(key, body?.data, user);
  }
}

/** Content → Social posts. */
@Controller("admin/social-posts")
@UseGuards(SameOriginGuard)
export class AdminSocialPostsController {
  constructor(private readonly posts: SocialPostsService) {}

  @Get()
  list() {
    return this.posts.list();
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(socialPostInputSchema))
    body: z.output<typeof socialPostInputSchema>,
  ) {
    return this.posts.create(body);
  }

  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(socialPostInputSchema))
    body: z.output<typeof socialPostInputSchema>,
  ) {
    return this.posts.update(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.posts.remove(id);
  }
}

/** Content → Pages. */
@Controller("admin/pages")
@UseGuards(SameOriginGuard)
export class AdminPagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  list() {
    return this.pages.listPages();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.pages.getPage(id);
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(pageInputSchema))
    body: z.output<typeof pageInputSchema>,
  ) {
    return this.pages.createPage(body);
  }

  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(pageInputSchema))
    body: z.output<typeof pageInputSchema>,
  ) {
    return this.pages.updatePage(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.pages.removePage(id);
  }
}

/** Content → FAQ. */
@Controller("admin/faq")
@UseGuards(SameOriginGuard)
export class AdminFaqController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  list() {
    return this.pages.listFaq();
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(faqInputSchema))
    body: z.output<typeof faqInputSchema>,
  ) {
    return this.pages.createFaq(body);
  }

  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(faqInputSchema))
    body: z.output<typeof faqInputSchema>,
  ) {
    return this.pages.updateFaq(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.pages.removeFaq(id);
  }
}
