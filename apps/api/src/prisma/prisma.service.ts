import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Env } from "../config/env.schema.js";
import { PrismaClient } from "../generated/prisma/client.js";

// Prisma 7 talks to Postgres through a driver adapter. The client connects
// lazily on the first query, so the app boots even while the DB is down and
// /health reports it instead.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get("DATABASE_URL", { infer: true }),
      }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
