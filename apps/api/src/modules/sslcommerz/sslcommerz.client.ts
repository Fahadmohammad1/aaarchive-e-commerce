import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.schema.js";

// SSLCommerz's HTTP API, called with fetch (no SDK; owner, 2026-10-21).
// https://developer.sslcommerz.com/doc/v4/

const SANDBOX = "https://sandbox.sslcommerz.com";
const LIVE = "https://securepay.sslcommerz.com";

export type SessionRequest = {
  tranId: string;
  amount: number;
  orderNumber: string;
  customer: {
    name: string;
    email: string | null;
    phone: string;
    address: string;
    city: string;
  };
  itemCount: number;
};

@Injectable()
export class SslcommerzClient {
  private readonly logger = new Logger(SslcommerzClient.name);
  private readonly storeId: string | undefined;
  private readonly storePassword: string | undefined;
  private readonly base: string;
  private readonly siteOrigin: string;
  readonly sandbox: boolean;

  constructor(config: ConfigService<Env, true>) {
    this.storeId = config.get("SSLCOMMERZ_STORE_ID", { infer: true });
    this.storePassword = config.get("SSLCOMMERZ_STORE_PASSWORD", {
      infer: true,
    });
    this.sandbox = config.get("SSLCOMMERZ_SANDBOX", { infer: true });
    this.base = this.sandbox ? SANDBOX : LIVE;
    this.siteOrigin = new URL(
      config.get("FRONTEND_ORIGIN", { infer: true }),
    ).origin;
  }

  /** Online payment can only be switched on with merchant credentials. */
  get configured(): boolean {
    return Boolean(this.storeId && this.storePassword);
  }

  /** Opens a payment session; returns the page to send the customer to. */
  async createSession(request: SessionRequest): Promise<string> {
    // Return URLs go through the website's /api/v1 proxy like every API call.
    const back = `${this.siteOrigin}/api/v1/payments/sslcommerz`;
    const body = new URLSearchParams({
      store_id: this.storeId ?? "",
      store_passwd: this.storePassword ?? "",
      total_amount: request.amount.toFixed(2),
      currency: "BDT",
      tran_id: request.tranId,
      success_url: `${back}/success`,
      fail_url: `${back}/fail`,
      cancel_url: `${back}/cancel`,
      ipn_url: `${back}/ipn`,
      // SSLCommerz requires an email; the order may not have one.
      cus_name: request.customer.name,
      cus_email: request.customer.email ?? "no-email@aaarchive.invalid",
      cus_phone: request.customer.phone,
      cus_add1: request.customer.address.slice(0, 50),
      cus_city: request.customer.city,
      cus_country: "Bangladesh",
      // Our courier delivers; SSLCommerz does not need shipping details.
      shipping_method: "NO",
      num_of_item: String(request.itemCount),
      product_name: `Order ${request.orderNumber}`,
      product_category: "Clothing",
      product_profile: "physical-goods",
      value_a: request.orderNumber,
    });
    const answer = await this.call(`${this.base}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const url = answer.GatewayPageURL;
    if (answer.status !== "SUCCESS" || typeof url !== "string" || !url) {
      this.logger.error(
        `SSLCommerz session refused for ${request.orderNumber}: ${String(answer.failedreason ?? answer.status)}`,
      );
      throw new Error("SSLCommerz session refused");
    }
    return url;
  }

  /** The validation API's answer for one val_id. */
  validate(valId: string): Promise<Record<string, unknown>> {
    const url = new URL(`${this.base}/validator/api/validationserverAPI.php`);
    url.search = new URLSearchParams({
      val_id: valId,
      store_id: this.storeId ?? "",
      store_passwd: this.storePassword ?? "",
      v: "1",
      format: "json",
    }).toString();
    return this.call(url.toString(), { method: "GET" });
  }

  /** Every attempt SSLCommerz has for one of our transaction ids. */
  findByTranId(tranId: string): Promise<Record<string, unknown>> {
    const url = new URL(
      `${this.base}/validator/api/merchantTransIDvalidationAPI.php`,
    );
    url.search = new URLSearchParams({
      tran_id: tranId,
      store_id: this.storeId ?? "",
      store_passwd: this.storePassword ?? "",
      format: "json",
    }).toString();
    return this.call(url.toString(), { method: "GET" });
  }

  private async call(
    url: string,
    init: RequestInit,
  ): Promise<Record<string, unknown>> {
    if (!this.configured) throw new Error("SSLCommerz is not configured");
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`SSLCommerz answered ${res.status}`);
    const body: unknown = await res.json();
    if (!body || typeof body !== "object") {
      throw new Error("SSLCommerz sent an unexpected answer");
    }
    return body as Record<string, unknown>;
  }
}
