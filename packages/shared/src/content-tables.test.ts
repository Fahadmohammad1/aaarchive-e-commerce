import { describe, expect, test } from "bun:test";
import { staffCreateSchema, staffUpdateSchema } from "./auth.js";
import {
  contactMessageSchema,
  faqInputSchema,
  pageInputSchema,
  pagePath,
  socialPostInputSchema,
} from "./content.js";
import {
  isSettingKey,
  paymentSettingsSchema,
  settingSchemas,
  storeSettingsSchema,
  trackingSettingsSchema,
} from "./settings.js";

const image = { mediaId: "m1", alt: "Fit check" };

describe("content tables", () => {
  test("social posts need an https link and an image with alt", () => {
    const ok = socialPostInputSchema.parse({
      image,
      label: "12K+ likes",
      platform: "INSTAGRAM",
      link: "https://instagram.com/p/x",
    });
    expect(ok.isActive).toBe(true);
    expect(
      socialPostInputSchema.safeParse({ ...ok, link: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      socialPostInputSchema.safeParse({
        ...ok,
        image: { mediaId: "m1", alt: "" },
      }).success,
    ).toBe(false);
  });

  test("pages: slug format, empty SEO fields become null, addresses", () => {
    const page = pageInputSchema.parse({
      slug: "returns",
      title: "Return policy",
      content: "## Window\\n3 days",
      seoTitle: "",
      seoDesc: " ",
    });
    expect(page.seoTitle).toBeNull();
    expect(page.seoDesc).toBeNull();
    expect(
      pageInputSchema.safeParse({ ...page, slug: "Returns!" }).success,
    ).toBe(false);
    expect(pagePath("about")).toBe("/about");
    expect(pagePath("size-guide")).toBe("/size-guide");
    expect(pagePath("returns")).toBe("/policies/returns");
  });

  test("FAQ and contact form", () => {
    expect(
      faqInputSchema.parse({ question: "COD?", answer: "Yes." }).sortOrder,
    ).toBe(0);
    expect(
      contactMessageSchema.safeParse({
        name: "R",
        contact: "0171",
        message: "hi",
      }).success,
    ).toBe(false);
  });
});

describe("settings", () => {
  test("every row parses from {} with complete defaults", () => {
    for (const schema of Object.values(settingSchemas)) {
      expect(schema.safeParse({}).success).toBe(true);
    }
    expect(isSettingKey("store")).toBe(true);
    expect(isSettingKey("secret")).toBe(false);
  });

  test("store phones are normalised; empty means not set", () => {
    const s = storeSettingsSchema.parse({
      whatsapp: "+880 1712-345689",
      phone: "",
    });
    expect(s.whatsapp).toBe("01712345689");
    expect(s.phone).toBe("");
    expect(
      storeSettingsSchema.safeParse({ messenger: "http://m.me/x" }).success,
    ).toBe(false);
  });

  test("wallet numbers and tracking ids are checked", () => {
    expect(
      paymentSettingsSchema.safeParse({ bkash: { number: "12345" } }).success,
    ).toBe(false);
    expect(trackingSettingsSchema.safeParse({ ga4Id: "UA-1" }).success).toBe(
      false,
    );
    expect(trackingSettingsSchema.parse({ ga4Id: "G-ABC123" }).ga4Id).toBe(
      "G-ABC123",
    );
  });
});

describe("staff", () => {
  test("create and update", () => {
    expect(
      staffCreateSchema.safeParse({
        name: "Rina",
        email: "RINA@example.com",
        role: "STAFF",
        password: "short",
      }).success,
    ).toBe(false);
    expect(staffUpdateSchema.safeParse({}).success).toBe(false);
    expect(staffUpdateSchema.parse({ isActive: false })).toEqual({
      isActive: false,
    });
  });
});
