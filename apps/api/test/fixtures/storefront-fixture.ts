import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";

// Data for the browser checkout test (apps/web/e2e): one published product
// with stock in two sizes, plus wallet numbers. Run after `prisma db seed`
// (zones, sizes, colours, settings). Safe to run again. Never on Supabase.
const url = process.env.DATABASE_URL ?? "";
if (/supabase\.(co|com)/.test(url))
  throw new Error("Refusing to run against Supabase");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const category = await prisma.category.upsert({
  where: { slug: "e2e-tees" },
  update: {},
  create: { name: "E2E Tees", slug: "e2e-tees" },
});
const sizes = await prisma.size.findMany({
  where: { name: { in: ["M", "L"] } },
});
const color = await prisma.color.findFirst({ where: { name: "Black" } });
if (!color || sizes.length < 2) throw new Error("Run `prisma db seed` first");

await prisma.product.deleteMany({ where: { slug: "e2e-checkout-tee" } });
await prisma.product.create({
  data: {
    name: "E2E Checkout Tee",
    slug: "e2e-checkout-tee",
    categoryId: category.id,
    basePrice: 1290,
    status: "PUBLISHED",
    variants: {
      create: sizes.map((s) => ({
        sizeId: s.id,
        colorId: color.id,
        sku: `E2E-TEE-${s.name}`,
        stock: 100,
      })),
    },
  },
});
await prisma.setting.upsert({
  where: { key: "payments" },
  update: {
    value: {
      cod: { enabled: true },
      bkash: { enabled: true, number: "01700000009", instructions: "" },
      nagad: { enabled: true, number: "01800000009", instructions: "" },
      codAdvanceDeliveryCharge: false,
    },
  },
  create: {
    key: "payments",
    value: {
      bkash: { enabled: true, number: "01700000009" },
      nagad: { enabled: true, number: "01800000009" },
    },
  },
});
console.log("Storefront fixture ready");
await prisma.$disconnect();
