import { cacheTags } from "@aaarchive/shared/cache-tags";
import {
  type CourierSettings,
  type DeliverySettings,
  type PaymentSettings,
  SETTING_KEYS,
  type SettingKey,
  type StockSettings,
  type StoreSettings,
  settingSchemas,
  walletAvailable,
} from "@aaarchive/shared/settings";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  collectMediaIds,
  loadMedia,
  type ResolvedImage,
  resolveImage,
} from "../content/content-media.js";
import { MediaService } from "../media/media.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";

type SettingValue<K extends SettingKey> = z.output<(typeof settingSchemas)[K]>;

/** What the storefront may know about the store's settings (PRD §6.8). */
export type PublicSettings = {
  store: {
    name: string;
    phone: string;
    whatsapp: string;
    messenger: string;
    email: string;
    address: string;
    logo: ResolvedImage | null;
  };
  seo: { title: string; description: string; ogImage: ResolvedImage | null };
  tracking: { ga4Id: string; metaPixelId: string; clarityId: string };
  payments: {
    cod: { enabled: boolean };
    bkash: { enabled: boolean; number: string; instructions: string };
    nagad: { enabled: boolean; number: string; instructions: string };
    codAdvanceDeliveryCharge: boolean;
  };
  delivery: { freeDeliveryThreshold: number | null };
  stock: { maxQtyPerVariant: number };
};

/**
 * `Setting` rows read through their shared schemas (`settingSchemas`), so a
 * missing or half-filled row still yields a complete value. Every row is
 * edited in Settings (PRD §6.8, Owner only).
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async get<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
    const schema: z.ZodType = settingSchemas[key];
    const row = await this.prisma.setting.findUnique({ where: { key } });
    const parsed = schema.safeParse(row?.value ?? {});
    if (parsed.success) return parsed.data as SettingValue<K>;
    // A bad row must not take checkout down: fall back to the defaults.
    this.logger.error(`Setting "${key}" is invalid; using defaults`);
    return schema.parse({}) as SettingValue<K>;
  }

  payments(): Promise<PaymentSettings> {
    return this.get("payments");
  }
  stock(): Promise<StockSettings> {
    return this.get("stock");
  }
  delivery(): Promise<DeliverySettings> {
    return this.get("delivery");
  }
  couriers(): Promise<CourierSettings> {
    return this.get("couriers");
  }
  store(): Promise<StoreSettings> {
    return this.get("store");
  }

  /** Every setting for the dashboard, with the media its images reference. */
  async adminAll() {
    const entries = await Promise.all(
      SETTING_KEYS.map(async (key) => [key, await this.get(key)] as const),
    );
    const values = Object.fromEntries(entries);
    const mediaMap = await loadMedia(
      this.prisma,
      this.media,
      collectMediaIds(values),
    );
    return { settings: values, media: Object.fromEntries(mediaMap) };
  }

  /** Replaces one setting (OWNER). Unknown keys are 404; values are validated. */
  async save(key: string, value: unknown) {
    if (!(SETTING_KEYS as string[]).includes(key)) {
      throw new NotFoundException({
        message: "Unknown setting",
        code: "NOT_FOUND",
      });
    }
    const settingKey = key as SettingKey;
    const schema: z.ZodType = settingSchemas[settingKey];
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid setting",
        code: "VALIDATION_ERROR",
        details: z.flattenError(parsed.error),
      });
    }
    for (const id of collectMediaIds(parsed.data)) {
      await this.media.assertExists(id);
    }
    const data = parsed.data as object;
    await this.prisma.setting.upsert({
      where: { key: settingKey },
      update: { value: data },
      create: { key: settingKey, value: data },
    });
    this.logger.log(`Setting "${settingKey}" saved`);
    // Store info, SEO, tracking and payments show on every page; stock
    // settings change product stock status and the quantity cap.
    void this.revalidation.revalidate(
      settingKey === "stock"
        ? [cacheTags.site, cacheTags.products]
        : [cacheTags.site],
    );
    return data;
  }

  async publicSettings(): Promise<PublicSettings> {
    const [store, seo, tracking, payments, delivery, stock] = await Promise.all(
      [
        this.get("store"),
        this.get("seo"),
        this.get("tracking"),
        this.payments(),
        this.delivery(),
        this.stock(),
      ],
    );
    const mediaMap = await loadMedia(
      this.prisma,
      this.media,
      collectMediaIds([store.logo, seo.ogImage]),
    );
    // A wallet without a number cannot be paid, so it is shown as off.
    const wallet = (w: PaymentSettings["bkash"]) => ({
      enabled: walletAvailable(w),
      number: w.number,
      instructions: w.instructions,
    });
    return {
      store: {
        name: store.name,
        phone: store.phone,
        whatsapp: store.whatsapp,
        messenger: store.messenger,
        email: store.email,
        address: store.address,
        logo: resolveImage(mediaMap, store.logo),
      },
      seo: {
        title: seo.title,
        description: seo.description,
        ogImage: resolveImage(mediaMap, seo.ogImage),
      },
      tracking,
      payments: {
        cod: { enabled: payments.cod.enabled },
        bkash: wallet(payments.bkash),
        nagad: wallet(payments.nagad),
        codAdvanceDeliveryCharge: payments.codAdvanceDeliveryCharge,
      },
      delivery: { freeDeliveryThreshold: delivery.freeDeliveryThreshold },
      stock: { maxQtyPerVariant: stock.maxQtyPerVariant },
    };
  }
}
