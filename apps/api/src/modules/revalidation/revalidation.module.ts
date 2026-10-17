import { Global, Module } from "@nestjs/common";
import { RevalidationService } from "./revalidation.service.js";

/** Global: every catalog/content module revalidates after its writes. */
@Global()
@Module({
  providers: [RevalidationService],
  exports: [RevalidationService],
})
export class RevalidationModule {}
