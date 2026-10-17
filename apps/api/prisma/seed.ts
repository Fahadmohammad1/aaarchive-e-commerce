// Reference data every environment needs (docs/phases.md Phase 0).
// Idempotent: run it as often as you like — existing rows are left alone, so
// it never overwrites what an admin has changed.
//   bun run --filter @aaarchive/api db:seed
// The first Owner account is created from SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD
// (and optional SEED_OWNER_NAME) when they are set and the email is unused.
import { emailSchema } from "@aaarchive/shared/auth";
import { type ContentKey, contentSchemas } from "@aaarchive/shared/content";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { checkNewPassword } from "../src/modules/auth/password-policy.js";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL to seed.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

// Apparel sizes, then panjabi chest sizes (inches).
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "38", "40", "42", "44", "46"];

const COLORS = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#F3EDE2" },
  { name: "Off-white", hex: "#E9E4DA" },
  { name: "Grey", hex: "#8A8A8A" },
  { name: "Navy", hex: "#1F2A44" },
  { name: "Maroon", hex: "#5E1310" },
  { name: "Olive", hex: "#5B5B3A" },
  { name: "Sand", hex: "#E4DDC0" },
];

// PRD open question 3: charges and estimates are placeholders until the owner
// confirms them. Edit them in the admin, not here.
const ZONES = [
  { name: "Inside Dhaka", charge: 70, estimatedDays: "1–2 days" },
  { name: "Dhaka Suburbs", charge: 100, estimatedDays: "2–3 days" },
  { name: "Outside Dhaka", charge: 130, estimatedDays: "3–5 days" },
];

// PRD §6.8. Values the owner has not decided yet are empty or null.
const SETTINGS: Record<string, unknown> = {
  store: {
    name: "Aaarchive",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    messenger: "",
    /** Uploaded logo ({ mediaId, alt }); null = the bundled logo in apps/web/public. */
    logo: null,
  },
  seo: {
    title: "Aaarchive — Hoodies, Panjabi & Streetwear",
    description:
      "Aaarchive is a Bangladeshi clothing label: hoodies, panjabi and everyday pieces worth keeping. Cash on delivery all over Bangladesh.",
    ogImage: null,
  },
  stock: { lowStockThreshold: 3, maxQtyPerVariant: 5 },
  delivery: { freeDeliveryThreshold: null },
  payments: {
    cod: { enabled: true },
    bkash: { enabled: true, number: "", instructions: "" },
    nagad: { enabled: true, number: "", instructions: "" },
    codAdvanceDeliveryCharge: false,
  },
  tracking: { ga4Id: "", metaPixelId: "", clarityId: "" },
};

// Starting text for the editable sections that need no photo (PRD §6.7).
// Sections with required images (hero, look file, campaign, promises) are
// created by the admin; until then the storefront leaves them out.
const CONTENT: Partial<Record<ContentKey, unknown>> = {
  "site.announcement": {
    enabled: false,
    text: "Free delivery all over Bangladesh on orders over ৳2,000",
  },
  "site.navigation": {
    menu: [
      { label: "Shop all", href: "/shop" },
      { label: "Categories", href: "/shop#categories" },
      { label: "Track order", href: "/track-order" },
      { label: "About us", href: "/about" },
      { label: "FAQs", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
    footer: [
      { label: "Home", href: "/" },
      { label: "About us", href: "/about" },
      { label: "Shop all", href: "/shop" },
      { label: "FAQs", href: "/faq" },
      { label: "Track order", href: "/track-order" },
      { label: "Contact", href: "/contact" },
    ],
  },
  "site.footer": {
    blurb:
      "An archive of looks — hoodies, panjabi and everyday pieces worth keeping, season after season. Made for Bangladesh.",
    image: null,
    socials: [],
    policyLinks: [
      { label: "Privacy policy", href: "/policies/privacy" },
      { label: "Terms & conditions", href: "/policies/terms" },
      { label: "Return policy", href: "/policies/returns" },
    ],
  },
  "home.categories": {
    heading: ["The archive", "index"],
    intro:
      "Everything we make, filed in one drawer. Pick a section and pull it open.",
  },
  "home.social": {
    heading: ["Follow our", "style journey"],
    intro:
      "Real fits from our feed. Tag @aaarchive to get filed in the archive.",
    followHref: "https://www.instagram.com/aaarchive",
  },
};

async function main() {
  for (const [sortOrder, name] of SIZES.entries()) {
    await prisma.size.upsert({
      where: { name },
      update: {},
      create: { name, sortOrder },
    });
  }
  for (const [sortOrder, color] of COLORS.entries()) {
    await prisma.color.upsert({
      where: { name: color.name },
      update: {},
      create: { ...color, sortOrder },
    });
  }
  for (const [sortOrder, zone] of ZONES.entries()) {
    await prisma.deliveryZone.upsert({
      where: { name: zone.name },
      update: {},
      create: { ...zone, sortOrder },
    });
  }
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as object },
    });
  }
  for (const [key, data] of Object.entries(CONTENT) as [
    ContentKey,
    unknown,
  ][]) {
    // Same validation the API applies to admin edits.
    const parsed = contentSchemas[key].parse(data);
    await prisma.contentBlock.upsert({
      where: { key },
      update: {},
      create: { key, data: parsed },
    });
  }
  await seedOwner();
  console.log(
    `Seeded ${SIZES.length} sizes, ${COLORS.length} colours, ${ZONES.length} zones, ${Object.keys(SETTINGS).length} settings, ${Object.keys(CONTENT).length} content blocks.`,
  );
}

/** Creates the first Owner. Never overwrites an existing account or password. */
async function seedOwner() {
  const rawEmail = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!rawEmail || !password) {
    console.log(
      "Owner: skipped (set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD).",
    );
    return;
  }
  const email = emailSchema.parse(rawEmail);
  const problem = checkNewPassword(password, email);
  if (problem) {
    throw new Error(
      `SEED_OWNER_PASSWORD rejected: ${problem}. Use 10+ characters, not a common password, not containing your email name.`,
    );
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Owner: ${email} already exists — left unchanged.`);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      name: process.env.SEED_OWNER_NAME?.trim() || "Owner",
      role: "OWNER",
      passwordHash: await hash(password),
    },
  });
  console.log(
    `Owner: created ${email}. Remove SEED_OWNER_PASSWORD from .env now.`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
