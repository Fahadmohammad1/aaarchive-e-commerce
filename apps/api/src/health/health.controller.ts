import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/auth/auth.decorators.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let database: "up" | "down" = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }
    return { status: "ok", database };
  }
}
