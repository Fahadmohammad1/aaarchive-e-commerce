import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { MediaModule } from "../media/media.module.js";
import { ProductsModule } from "../products/products.module.js";
import {
  AdminContentController,
  AdminFaqController,
  AdminPagesController,
  AdminSocialPostsController,
} from "./admin-content.controller.js";
import { ContactService } from "./contact.service.js";
import { ContentController } from "./content.controller.js";
import { ContentService } from "./content.service.js";
import { PagesService } from "./pages.service.js";
import { SitemapService } from "./sitemap.service.js";
import { SocialPostsService } from "./social-posts.service.js";

@Module({
  imports: [AuthModule, MediaModule, ProductsModule],
  controllers: [
    ContentController,
    AdminContentController,
    AdminSocialPostsController,
    AdminPagesController,
    AdminFaqController,
  ],
  providers: [
    ContentService,
    PagesService,
    SocialPostsService,
    ContactService,
    SitemapService,
  ],
})
export class ContentModule {}
