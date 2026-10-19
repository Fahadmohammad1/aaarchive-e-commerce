import { expect, test } from "@playwright/test";

// The whole guest purchase on a phone (PRD §5.5–5.9): product → cart →
// checkout (COD) → success → tracking. Data: apps/api/test/fixtures.

const phone = () =>
  `017${String(Math.floor(10_000_000 + Math.random() * 89_999_999))}`;

test("a guest buys with cash on delivery and tracks the order", async ({
  page,
}) => {
  const customer = phone();

  await page.goto("/product/e2e-checkout-tee");
  await expect(
    page.getByRole("heading", { name: "E2E Checkout Tee" }),
  ).toBeVisible();
  await page.getByText("L", { exact: true }).first().click();
  await page
    .getByRole("button", { name: /add to cart/i })
    .first()
    .click();
  await expect(page.getByText("Cart (1)").first()).toBeVisible();
  await page.getByRole("link", { name: "Checkout", exact: true }).click();

  await page.locator("#co-name").fill("Test Customer");
  await page.locator("#co-phone").fill(customer);
  await page.getByText("Inside Dhaka").click();
  await page.locator("#co-district").selectOption("Dhaka");
  await page.locator("#co-area").fill("Mirpur");
  await page.locator("#co-address").fill("House 1, Road 1");
  // ৳1,290 + ৳70 delivery, priced by the API.
  await expect(
    page.getByRole("button", { name: /place order/i }).last(),
  ).toContainText("1,360");
  await page
    .getByRole("button", { name: /place order/i })
    .last()
    .click();

  await page.waitForURL(/\/order\/success\/AAR-\d+/);
  const orderNumber = page.url().split("/").pop() ?? "";
  await expect(page.getByText(orderNumber).first()).toBeVisible();
  await expect(page.getByText("Cart (0)").first()).toBeVisible();

  await page.goto(`/track-order?order=${orderNumber}`);
  await page.locator("#tr-phone").fill(customer);
  await page.getByRole("button", { name: /^track/i }).click();
  await expect(page.locator("section[aria-live] h2")).toHaveText(orderNumber);
  // The phone is masked on tracking (golden rule 5).
  await expect(page.getByText(customer)).toHaveCount(0);
});

test("the product page never contains a stock number", async ({ page }) => {
  await page.goto("/product/e2e-checkout-tee");
  const html = await page.content();
  // Fixture stock is 100 per variant; it must not leak (PRD §5.6).
  expect(html).not.toMatch(/"stock"\s*:/);
});
