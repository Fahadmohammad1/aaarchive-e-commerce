# Product Requirements Document — Aaarchive Online Store

| | |
|---|---|
| **Product** | Aaarchive — clothing e-commerce website |
| **Market** | Bangladesh |
| **Products** | Hoodies, panjabi, and related apparel |
| **Version** | 1.0 (MVP) |
| **Status** | Draft |
| **Last updated** | 17 October 2026 |
| **Related docs** | `architecture.md` (how it is built) · `design.md` (visual system) · `rules.md` · `phases.md` (build plan) · `memory.md` |

---

## 1. Overview

Aaarchive is a new Bangladeshi clothing brand selling hoodies, panjabi and other apparel online. The website is the brand's own storefront: customers browse collections, choose a size and colour, and place an order using Cash on Delivery or a manual bKash/Nagad payment. A private admin dashboard lets the team manage products, stock, orders and coupons.

The business is just starting, so the MVP is built and run **entirely on free tools and free tiers**. Paid services (payment gateway, SMS, paid hosting, etc.) are added only when sales justify them.

### 1.1 Goals

1. Launch a fast, mobile-first store that looks premium and matches the brand's editorial style (see `design.md`).
2. Let customers order in under 2 minutes without creating an account.
3. Accept orders by COD and manual bKash/Nagad with zero gateway fees.
4. Reduce fake/refused COD orders through order confirmation and simple safeguards.
5. Give the team one dashboard to manage products, stock, orders and coupons.
6. Rank on Google and convert traffic from Facebook/Instagram ads and posts.

### 1.2 Non-goals (MVP)

- Payment gateway integration (bKash PGW, Nagad PGW). *SSLCommerz is built but **off by default** (owner, 21 Oct 2026, §5.8): the Owner can switch it on once a merchant account exists.*
- SMS / OTP notifications
- Multi-vendor marketplace
- Multi-currency or international shipping
- Loyalty points, referrals, gift cards
- AI recommendations, live chat software
- Native mobile app
- Courier API automation (tracking numbers are entered manually at first)

### 1.3 Success metrics (first 3 months)

| Metric | Target |
|---|---|
| Mobile Lighthouse performance score | ≥ 85 |
| Largest Contentful Paint (4G) | < 2.5 s |
| Checkout completion rate (cart → order) | ≥ 40% |
| Fake / refused COD order rate | < 10% |
| Monthly running cost (excluding domain & courier) | ৳0 |

---

## 2. Constraints

| Constraint | Detail |
|---|---|
| **Budget** | Free tools and free tiers only. Unavoidable business costs: domain (yearly), courier charges per delivery, bKash/Nagad cash-out fees. |
| **Hosting** | Must allow **commercial use** on the free plan. Vercel Hobby is **not** allowed (non-commercial only). |
| **Market** | Customers are mostly on mobile, mostly arrive from Facebook/Instagram, prefer COD, and rarely read email. |
| **Language** | English UI for MVP. Product names may include Bangla. Bangla UI is a Release 2 item, so all UI strings must be kept in one place (i18n-ready). |
| **Currency** | BDT only, displayed as `৳1,250`. Whole taka, no decimals. |

---

## 3. Users and roles

| Role | Description | Access |
|---|---|---|
| **Guest customer** | Browses and orders without an account. The main user. | Storefront, checkout, order tracking |
| **Registered customer** *(optional)* | Same as guest, plus saved address and order history. | Storefront + "My Orders" |
| **Admin (Owner)** | Full control of the store. | Everything in the dashboard, including settings and staff |
| **Staff (Order Manager)** | Confirms orders by phone, updates status, verifies payments. | Orders, customers, read-only products |

### 3.1 Key user stories

- As a customer, I want to see which sizes are available before choosing, so I don't pick an unavailable one.
- As a customer, I want a size chart with real measurements, so I order the right fit.
- As a customer, I want to order with just my name, phone and address, without making an account.
- As a customer, I want to pay cash on delivery or by bKash/Nagad.
- As a customer, I want to check my order status with my phone number and order ID.
- As staff, I want to see new orders and call customers to confirm them before shipping.
- As staff, I want to match a customer's bKash TrxID to our bKash statement and mark the order as paid.
- As the owner, I want to see exact stock numbers per size/colour and know what is running low.
- As the owner, I want to create discount codes for Eid and other campaigns.

---

## 4. Scope summary

Releases are scope tiers. The build of Release 1 is broken into Phases 0–7 in `phases.md`.

| Area | Release 1 — MVP | Release 2 (after launch) | Release 3 (when growing, may be paid) |
|---|---|---|---|
| Catalog | Categories, collections, variants, size chart, search, filters | Product reviews, "notify me" when back in stock | Recommendations |
| Checkout | Guest checkout, COD, manual bKash/Nagad, coupons, delivery zones, saved addresses (signed-in customers), SSLCommerz online payment (built, off by default) | Reorder | bKash / Nagad payment gateways |
| Orders | Status flow, tracking page, invoices, manual tracking number | Courier API (Steadfast / Pathao) | Automated fraud scoring |
| Customers | Optional account (email/Google), order history | Bangla UI | SMS notifications |
| Admin | Products, stock, orders, coupons, payments, basic reports, **sales analytics (Owner)**, settings, **CSV/Excel export** | Staff activity log, CSV import | Advanced analytics (cohorts, forecasting, profit and margin) |
| Marketing | Meta Pixel, GA4, Clarity, FB catalog feed, SEO | Abandoned cart (email), newsletter | Loyalty / referrals |

---

## 5. Functional requirements — Storefront

### 5.1 Global layout

- **Header:** Menu button (left), logo (centre), Cart button with item count (right). Sticky on scroll.
- **Menu (overlay):** Shop, collections, categories, Track Order, About, FAQ, Contact.
- **Footer:** Brand blurb, social links (Facebook, Instagram, TikTok, WhatsApp), policy links, nav bar, copyright.
- **Floating contact:** WhatsApp and Messenger click-to-chat buttons on every page (free, no third-party widget).
- **Announcement bar (optional):** One line set from the admin (e.g., "Free delivery over ৳2,000").

### 5.2 Home page

Sections are described visually in `design.md §6`. Functional requirements:

| # | Section | Requirement |
|---|---|---|
| H1 | Hero | Main image + 2 side images, headline, audience pills (e.g., Men / Women / Kids — configurable). Pills link to filtered shop. All hero content editable in admin. |
| H2 | Browse by Category | Horizontal slider of category cards showing category name and **product count** (not stock). "Browse All" button. Prev/next controls and swipe on mobile. |
| H3 | Designed for Every Style | Featured look: one main image with 2 floating product cards (name, colour swatches, link). Category links along the bottom. Editable in admin. |
| H4 | Exclusive Collections | Tabs by category; masonry grid of products showing category tag and price. "Browse More" links to shop. Max 8 products per tab. |
| H5 | Why Us | Image + 4 value points (e.g., Comfortable Fabric, Premium Quality, Fast Delivery, Easy Exchange). Text editable. |
| H6 | Follow Our Style Journey | Slider of 4–8 social posts (image + view/like label + link to the Facebook/Instagram/TikTok post). Images uploaded manually in admin — **no paid social API**. |
| H7 | Footer | As in 5.1. |

### 5.3 Shop / category listing (`/shop`, `/category/[slug]`, `/collection/[slug]`)

- Grid of product cards: image (hover shows second image on desktop), name, price, sale price (strikethrough original), category tag, stock badge if **all** variants are out of stock.
- **Filters:** category, size, colour, price range, in-stock only.
- **Sort:** Newest (default), Price low→high, Price high→low, Best selling.
- Filters and sort reflected in the URL query string (shareable, SEO-friendly).
- Pagination: "Load more" button, 12 products per page.
- Empty state with a link back to all products.

### 5.4 Search

- Search icon in header opens a search overlay.
- Searches product name, category, tags and SKU (PostgreSQL full-text search; trigram for typo tolerance).
- Shows up to 6 instant results while typing (debounced 300 ms); Enter goes to `/search?q=`.

### 5.5 Product details page (`/product/[slug]`)

- **Gallery:** 3–8 images, swipe on mobile, thumbnails on desktop, tap-to-zoom.
- **Info:** Name, category tag, price / sale price, short description.
- **Colour selector:** swatches. Changing colour switches gallery images if colour-specific images exist.
- **Size selector:** buttons for each size. Out-of-stock sizes are shown crossed out and cannot be selected.
- **Stock status** for the selected variant (see §5.6).
- **Quantity:** 1 to max per order (default max 5 per variant).
- **Size chart:** button opens a modal with a measurement table in inches (chest, length, shoulder, sleeve; panjabi may add other measurements). Size chart is defined per product or reused from a template.
- **Details tabs/accordion:** Description, Fabric & GSM, Care instructions, Delivery & Exchange.
- **Delivery info:** Estimated delivery time and charge per zone.
- **Buttons:** "Add to Cart" and "Buy Now" (goes straight to checkout).
- **Share:** Copy link, Facebook, WhatsApp.
- **Related products:** 4 products from the same category.
- Sticky "Add to Cart" bar on mobile when the main button scrolls out of view.

### 5.6 Stock display rules (important)

Exact stock numbers are **never shown publicly**. They are visible only in the admin dashboard.

| Status | Condition | Label shown |
|---|---|---|
| `in_stock` | stock > low-stock threshold | "In Stock" |
| `low_stock` | 0 < stock ≤ threshold | "Low Stock" (or "Only a few left") |
| `out_of_stock` | stock ≤ 0 | "Out of Stock" |

Requirements:

1. Status is calculated **on the server**. Public APIs and server-rendered HTML must never contain the stock number (not in JSON, props, hydration data or HTML attributes).
2. Low-stock threshold: global default (3) in settings, with optional per-product override.
3. Status is **per variant** (size + colour). A product is shown as "Out of Stock" on listing pages only when **all** variants are out of stock.
4. Quantity is capped per order (default 5 per variant) so customers cannot discover stock by raising the quantity.
5. If the requested quantity exceeds stock, show a generic message: *"Not enough stock for this quantity. Please try a smaller amount."* Never show the number available.
6. Stock is re-checked and decremented **atomically** when the order is placed (conditional update inside a transaction) to prevent overselling.
7. Stock is restored automatically when an order moves to **Cancelled** or **Returned**.

### 5.7 Cart

- Slide-out cart drawer + full cart page (`/cart`).
- Stored in browser storage for guests; synced to the account when logged in.
- Shows image, name, size, colour, unit price, quantity (+/−), line total, remove.
- Coupon code field with clear success/error messages.
- Subtotal; delivery charge shown as "calculated at checkout".
- When the cart opens, re-validate items: if a variant went out of stock or the price changed, show a notice and update.

### 5.8 Checkout (`/checkout`)

Single page, no account required.

**Fields**

| Field | Rules |
|---|---|
| Full name | Required, 2–60 chars |
| Phone | Required, Bangladeshi mobile format `01XXXXXXXXX` (11 digits, starts with 013–019). Normalise `+880` / `880` prefixes. |
| Alternative phone | Optional |
| Email | Optional (order confirmation email if given) |
| Delivery zone | Required: Inside Dhaka / Dhaka Suburbs / Outside Dhaka (zones and prices set in admin) |
| District | Required (dropdown of 64 districts) |
| Area / Thana | Required (text) |
| Full address | Required (house, road, landmark) |
| Order note | Optional |
| Payment method | Required: Cash on Delivery / bKash / Nagad |

**Order summary:** items, subtotal, discount, delivery charge, **total**.

**Payment methods**

1. **Cash on Delivery (COD)**
   - Customer pays the full amount to the courier.
   - *Optional setting:* require the **delivery charge in advance** via bKash/Nagad for COD orders (toggle in admin). If on, the customer must enter the advance TrxID.
2. **bKash (manual)**
   - Show the store's bKash number, the exact amount to send, and short instructions ("Send Money / Payment to 01XXXXXXXXX").
   - Customer enters: sender bKash number and **Transaction ID (TrxID)**.
   - Order is created with payment status **Pending Verification**.
3. **Nagad (manual)** — same as bKash.
4. **Online payment (SSLCommerz)** — *added 21 Oct 2026 at the owner's request; off until the Owner turns it on in Settings → Payments, which needs the merchant credentials on the server.*
   - The order is created first (stock held, payment status Unpaid), then the customer pays on SSLCommerz's page (card, bKash, Nagad, internet banking).
   - The order becomes **Paid** only when the API confirms the payment with SSLCommerz's validation API (amount, currency and transaction must match). Payments SSLCommerz flags as risky wait for staff (Pending Verification).
   - A failed or cancelled payment cancels the order, returns its stock and releases its coupon use; the cart stays so the customer can retry. Orders not paid within 45 minutes (setting on the server) are cancelled the same way.
   - SSLCommerz charges a fee per payment, so it is a paid service: switching it on is the Owner's decision.
**Validation and protection**

- Cloudflare Turnstile (free) on the checkout form.
- Rate limit: max 3 orders per phone number per hour and 10 per IP per hour.
- Phone numbers on the admin **blocklist** cannot place COD orders (they can still pay in advance).
- TrxID must be unique across all orders (prevents reusing one payment).
- Server recalculates all prices, discounts and delivery charges. **Never trust prices sent by the client.**

**After placing the order**

- Redirect to `/order/success/[orderNumber]` showing order number, summary, payment instructions (if any), and "We will call you to confirm your order."
- Send confirmation email if an email was given.
- Fire `Purchase` event to Meta Pixel and GA4.

### 5.9 Order tracking (`/track-order`)

- Customer enters **phone number + order number**.
- Shows status timeline, items, total, payment status, and courier name + tracking number (with a link to the courier's tracking page) once shipped.
- No login needed.

### 5.10 Customer account (optional)

*In Release 1 (owner, 21 Oct 2026). Guest checkout stays: an account is never required to order.*

- Sign up / log in with email + password or Google (free OAuth; shown only once the Google credentials are set on the server). Forgot password by emailed link.
- My Orders (list + details, same view as tracking), saved addresses (up to 10, one default) that fill checkout, profile (name, phone), change password, sign out on all devices.
- Orders placed while signed in join the account. Guest orders join it in two ways: automatically when they were placed with the account's **verified** email, or when the customer **adds an order with its phone number + order number** (the tracking proof). *Linking by phone number alone was dropped (21 Oct 2026): without SMS verification anyone could type someone else's number and see their orders (rules.md §8.3).*
- Customer sessions are separate from the dashboard's: customers cannot sign in to `/admin`, and staff accounts cannot sign in on the shop.

### 5.11 Content pages

About Us, Contact (form + WhatsApp + Facebook + address), FAQ, Size Guide, Delivery Policy, Return & Exchange Policy, Privacy Policy, Terms & Conditions. All editable as rich text in the admin.

---

## 6. Functional requirements — Admin dashboard (`/admin`)

Protected by login. Role-based access (Owner, Staff).

### 6.1 Dashboard home

- Today's / this month's orders and revenue (only Delivered + Paid counted as revenue; show pending separately).
- Orders by status (counts with links).
- Payments awaiting verification (count + link).
- Low-stock variants (top 10, lowest first).
- Best-selling products (this month).

### 6.2 Products

- List with search, filters (category, status, low stock), and sort by stock.
- Create/edit product:
  - Name, slug (auto, editable), short description, full description (rich text), fabric, GSM, care instructions
  - Category (one), collections (many), tags
  - Base price, sale price (optional), sale start/end date (optional)
  - Images: upload, reorder, set main, mark per-colour images
  - Size chart: choose a template or custom table
  - Low-stock threshold override (optional)
  - SEO title and description (optional, auto-filled)
  - Status: Draft / Published / Archived
  - Featured flag (for home sections)
- **Variants:** generate from sizes × colours. Each variant has SKU, stock (number), optional price override, active flag.
- **Quick stock edit:** inline stock editing in a variant table.
- Duplicate product.

### 6.3 Categories and collections

- CRUD with name, slug, image, description, sort order, show-on-home flag.
- Categories are the main type (Hoodies, Panjabi, T-Shirts…). Collections are campaigns/groups (Eid Collection, Winter Drop, New Arrivals).

### 6.4 Orders

- List with filters: status, payment status, payment method, date range, delivery zone; search by order number, phone or name.
- Order detail: customer info, address, items (with SKU), totals, payment info (method, sender number, TrxID), notes, status history (who changed what and when).
- **Status flow:**

```
Pending ──► Confirmed ──► Processing ──► Shipped ──► Delivered
   │            │              │             │
   └────────────┴──────────────┴─────► Cancelled
                                             │
                               Shipped ──► Returned
```

| Status | Meaning |
|---|---|
| Pending | New order, not yet confirmed by phone |
| Confirmed | Staff called and the customer confirmed |
| Processing | Being packed |
| Shipped | Handed to courier; courier name + tracking number required |
| Delivered | Customer received it |
| Cancelled | Cancelled before delivery (stock restored) |
| Returned | Refused or returned after shipping (stock restored) |

- **Payment status:** Unpaid / Pending Verification / Paid / Refunded / Partially Paid (for advance delivery charge).
- **Verify payment:** button to mark a bKash/Nagad payment as Verified (→ Paid) or Rejected, with a note.
- Add internal notes; record call attempts ("No answer", "Confirmed", "Asked to call later").
- Print **invoice / packing slip** (print-friendly page, saved as PDF by the browser).
- Bulk actions: change status, print packing slips.
- Edit order (before shipping): change items, quantities, address, delivery charge; stock adjusts accordingly.

### 6.5 Customers

- List of customers (by phone number), including guests.
- Per customer: orders, total spent, delivered count, cancelled/returned count, **success rate**.
- **Blocklist:** block a phone number with a reason.

### 6.6 Coupons

- Code, type (percentage or fixed ৳), value, minimum order amount, maximum discount (for %), start/end date, total usage limit, per-phone usage limit, applies to (all / category / product), active flag.
- Usage count shown in the list.

### 6.7 Content — everything is editable from the dashboard

*Owner requirement (18 Oct 2026): **every piece of content a customer sees is managed from the dashboard.** Nothing customer-facing needs a code change or redeploy to update.*

| What | Where it is edited |
|---|---|
| Products, variants, stock, images, categories (name, photo, order, show on home), collections, sizes, colours, size charts | Catalog screens (§6.2, §6.3) |
| Delivery zones, coupons, payment methods/numbers/instructions | §6.6, §6.8 |
| **Home page**, one form per section: hero (headline, audience pills, 3 images), archive index (heading, intro; categories come from the catalog), look file (heading, label, intro, image, products + hotspot positions), latest entries (heading, intro, filter tabs, campaign tile), made to be kept (heading, intro, image, 4 promises with icon), social (heading, intro, follow link) | Content → Home |
| Social posts (image, label, platform, link, order) | Content → Social posts |
| Announcement bar, header menu links, footer (blurb, image, social links, policy chips, link bar) | Content → Site |
| About, contact, size guide, policies (rich text + SEO) | Content → Pages |
| FAQ questions and answers (order, show/hide) | Content → FAQ |
| Logo, store contact (phone, WhatsApp, Messenger, email, address), default SEO title/description/share image, tracking IDs | Settings (§6.8) |

Rules:

1. Every section form validates with the same schema the API uses; a section cannot be saved in a state the storefront cannot render (e.g. a hero without its main image).
2. Saving publishes immediately and refreshes the affected storefront pages (cache revalidation). There is no draft/preview in the MVP.
3. Images are uploaded through the API's media pipeline (§9.3) into Supabase Storage, and every image has alt text.
4. **Not editable:** interface wording such as button labels ("Add to cart", "Browse all") and error messages. These live in the translation files so the Bangla UI (Release 2) can translate them.

### 6.8 Settings

- Store info: name (Aaarchive), logo, contact phone, WhatsApp number, email, address, social links.
- Delivery zones: name, charge, estimated days; free-delivery threshold (optional).
- Payments: enable/disable COD, bKash, Nagad, SSLCommerz (online; only when its credentials are set on the server); bKash/Nagad numbers and instructions; "advance delivery charge for COD" toggle.
- Stock: default low-stock threshold, max quantity per variant per order.
- Size chart templates.
- Tracking IDs: Meta Pixel ID, GA4 ID, Clarity ID.
- Staff users and roles (Owner only).

### 6.9a Sales analytics (Owner only)

*Approved by the owner, 21 Oct 2026.* `/admin/analytics`: pick a period (presets or custom dates); KPI tiles compared with the previous period (orders, sales, revenue, average order, units, discounts, cancel/return rate), a daily chart, and breakdowns by category, product, payment method, status, delivery zone, size, colour, coupon and new vs returning customers. Same money rules as the dashboard home (§6.1). No stock numbers.

### 6.9 Export to CSV / Excel

*Added to the MVP on 18 Oct 2026 at the owner's request (was "CSV import/export" in Release 2; import stays in Release 2).*

Every admin list screen has an **Export** menu with two choices: **CSV** and **Excel (.xlsx)**.

| Screen | Export contains (one row per…) |
|---|---|
| Orders | order: number, date, status, payment method/status, customer name, phone, zone, district, area, address, items summary, subtotal, discount, delivery charge, total, coupon, courier, tracking number |
| Order items | order item: order number, date, status, product, SKU, size, colour, unit price, quantity, line total (for packing and sales analysis) |
| Products & stock | variant: product, category, SKU, size, colour, **stock**, price, sale price, status |
| Customers | customer (by phone): name, phone, orders, delivered, cancelled/returned, success rate, total spent, blocked |
| Payments | payment: order number, method, amount, sender number, TrxID, status, verified by, verified at |
| Coupons | coupon: code, type, value, limits, dates, usage count, active |

Requirements:

1. The export uses **the filters and search currently applied** on the screen (e.g., "Pending orders this week"), not the whole table, and says so in the file name: `aaarchive-orders-2026-10-18.csv`.
2. Exports are generated by the API and respect the same role rules as the screen (Staff can export orders, order items, payments and customers; products/stock and coupons are Owner-only unless the Owner allows it).
3. Money is exported as whole taka numbers (no `৳` sign) so spreadsheets can sum them; dates in `YYYY-MM-DD HH:mm` (Asia/Dhaka).
4. CSV is UTF-8 with a BOM so Excel shows Bangla names correctly. Cells starting with `=`, `+`, `-` or `@` are escaped (CSV-injection protection).
5. Excel files have a bold, frozen header row, sensible column widths, and number formatting for money.
6. Large exports stream (no size limit in practice for this store; a guard of 50,000 rows per export).
7. Stock numbers appear **only** in the admin products/stock export. This does not change the public stock rule (§5.6).

---

## 7. Data model (high level)

```
User            id, name, email, phone, passwordHash?, googleId?, emailVerifiedAt?, role (CUSTOMER|STAFF|OWNER), createdAt
AccountToken    id, userId, purpose (VERIFY_EMAIL|RESET_PASSWORD), tokenHash, expiresAt, usedAt?
Address         id, userId, name, phone, zoneId, district, area, address, isDefault
Category        id, name, slug, image, description, sortOrder, showOnHome
Collection      id, name, slug, image, description, sortOrder, isActive
Product         id, name, slug, shortDesc, description, fabric, gsm, care, categoryId,
                basePrice, salePrice?, saleStart?, saleEnd?, lowStockThreshold?,
                sizeChartId?, status, isFeatured, seoTitle?, seoDesc?, createdAt
ProductImage    id, productId, url, publicId, alt, colorId?, sortOrder
ProductCollection productId, collectionId
Color           id, name, hex
Size            id, name, sortOrder           (S, M, L, XL, XXL / 38, 40, 42…)
Variant         id, productId, sizeId, colorId, sku, stock, priceOverride?, isActive
SizeChart       id, name, columns(json), rows(json)
DeliveryZone    id, name, charge, estimatedDays, sortOrder, isActive
Coupon          id, code, type, value, minOrder, maxDiscount?, startsAt?, endsAt?,
                usageLimit?, perPhoneLimit?, scope, scopeIds(json), isActive, usedCount
Order           id, orderNumber, userId?, customerName, phone, altPhone?, email?,
                zoneId, district, area, address, note?, subtotal, discount, deliveryCharge,
                total, couponCode?, paymentMethod, paymentStatus, status,
                courierName?, trackingNumber?, createdAt, updatedAt
OrderItem       id, orderId, variantId, productName, sizeName, colorName, sku,
                unitPrice, quantity, lineTotal          (snapshot at order time)
Payment         id, orderId, method (BKASH|NAGAD|SSLCOMMERZ), amount, senderNumber?, trxId? (unique), status,
                verifiedById?, verifiedAt?, note?, gatewayValId? (unique, SSLCommerz)
OrderEvent      id, orderId, type (STATUS|NOTE|CALL|PAYMENT), from?, to?, note?, byUserId, createdAt
BlockedPhone    id, phone, reason, createdById, createdAt
SocialPost      id, image, link, label, platform, sortOrder
Page            id, slug, title, content, seoTitle?, seoDesc?
FaqItem         id, question, answer, sortOrder, isActive
ContentBlock    key, data(json), updatedById?           (one row per editable section, §6.7)
Setting         key, value(json)
```

- Order numbers are short and readable, e.g. `AAR-24105` (prefix + sequence), not UUIDs.
- `OrderItem` stores a snapshot of name, size, colour and price so old orders don't change when products are edited.
- All money stored as **integers in taka**.

---

## 8. Technical architecture

### 8.1 Stack

Two separate apps in one repository (Bun workspaces): a **Next.js** frontend and a **NestJS** API. How they fit together is specified in `architecture.md`.

| Layer | Choice | Notes |
|---|---|---|
| Repository | Monorepo: `apps/web`, `apps/api`, `packages/shared` | **Bun** as package manager, **Biome** for lint/format |
| Frontend | **Next.js (App Router) + TypeScript** | Storefront and admin. Server Components for SEO pages |
| Client data fetching | **TanStack Query** | All client-side reads/writes of API data (admin, account, cart, checkout, search, tracking) |
| UI | Tailwind CSS + **shadcn/ui** (storefront and admin) + Lucide icons | Storefront components are built on shadcn and styled per `design.md` |
| Forms & validation | React Hook Form + **Zod** (schemas shared by both apps via `packages/shared`) | |
| Backend | **NestJS + TypeScript** | REST API at `/api/v1`. Owns all business rules, auth and data |
| ORM | **Prisma** | Pooled connection for runtime, direct/session connection for migrations |
| Database | PostgreSQL on **Supabase free tier** | Used only as Postgres: no Supabase Auth, Storage or client SDK |
| Media (images) | **Supabase Storage** (same project as the database) | Uploaded through the API, which validates, strips metadata and makes WebP sizes; public bucket, cached by Cloudflare in production (decision 18 Oct 2026, replaces Cloudinary) |
| Auth | NestJS: JWT access token + httpOnly refresh cookie, argon2, roles | Admin/staff; optional customer accounts with Google OAuth |
| Email | Resend or Brevo free tier | Order confirmation, password reset |
| Bot protection | Cloudflare Turnstile | Checkout, login, contact form |
| Search | PostgreSQL full-text + `pg_trgm` | |
| Analytics | GA4, Meta Pixel, Microsoft Clarity | All free |
| Hosting | Web: **Cloudflare Workers via OpenNext**. API: free tier that allows commercial use (e.g., Oracle Cloud Always Free VM with Docker) | To be confirmed — see `architecture.md` §7 |
| DNS / CDN | Cloudflare (free) | |
| Backups | GitHub Actions scheduled `pg_dump` → private storage | Supabase free tier has no daily backups |
| Error tracking | Sentry free tier | |
| Source control / CI | GitHub + GitHub Actions | Lint, type-check, test, build on every PR |

> **Do not deploy on Vercel Hobby** — its terms prohibit commercial use.
> Free-tier limits change; re-check Supabase (database, storage size, egress), Cloudflare and Resend limits before launch.

### 8.2 Rendering strategy

| Page | Strategy |
|---|---|
| Home, category, collection, product | Static generation + on-demand revalidation (revalidate on product/stock change from admin) |
| Stock status on product page | Fetched fresh on the server (short cache or dynamic segment) so status is current |
| Cart, checkout, track order, account | Dynamic |
| Admin | Dynamic, client-heavy |

### 8.3 API (NestJS, base path `/api/v1`) — outline

Paths below are relative to `/api/v1`. The web reaches them through a same-origin rewrite.

**Public**

```
GET  /products?category=&size=&color=&min=&max=&sort=&page=
GET  /products/:slug                 → includes variants with stockStatus (no numbers)
GET  /search?q=
POST /cart/validate              → re-check items, prices, stock status
POST /coupons/apply              → { code, items, phone } → discount
POST /orders                         → place order (Turnstile token required)
POST /orders/track               → { phone, orderNumber }
```

**Admin** (auth + role check on every route)

```
CRUD /admin/products, /variants, /categories, /collections, /coupons, /zones, /pages
GET  /admin/orders?status=&payment=&q=&from=&to=
PATCH /admin/orders/:id/status
POST /admin/orders/:id/notes
POST /admin/payments/:id/verify | /reject
CRUD /admin/blocked-phones
GET  /admin/reports/summary
POST /admin/media                    → upload an image (validated, resized to WebP sizes, stored in Supabase Storage)
```

### 8.4 Order placement logic

1. Validate input with Zod; verify Turnstile token.
2. Check rate limits and phone blocklist.
3. Load variants from DB; recalculate prices, coupon and delivery charge on the server.
4. In one DB transaction:
   - For each item: `UPDATE variant SET stock = stock - qty WHERE id = ? AND stock >= qty`. If any update affects 0 rows → abort with `OUT_OF_STOCK` (generic message to user). In Prisma: `variant.updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })` and check `count`.
   - Create `Order`, `OrderItem`s, `Payment` (if bKash/Nagad), first `OrderEvent`.
   - Increment coupon `usedCount`.
5. After commit: send email (if any), return order number.

---

## 9. Non-functional requirements

### 9.1 Performance

- Mobile-first; LCP < 2.5 s and CLS < 0.1 on 4G.
- All images served through the image CDN in WebP/AVIF with responsive `srcset`; hero image preloaded; others lazy-loaded.
- Fonts self-hosted via `next/font`, subset, `font-display: swap`.
- Heavy visual effects (noise texture, glitch wordmark, parallax) must be CSS-only or very light JS and disabled on low-end devices / `prefers-reduced-motion`.
- JS bundle for storefront pages < 150 KB gzipped (excluding images).

### 9.2 SEO

- Server-rendered HTML for all public pages.
- Unique title and meta description per page; Open Graph and Twitter images (important for Facebook sharing).
- Schema.org JSON-LD: `Product` (with `offers.availability` from stock status), `BreadcrumbList`, `Organization`.
- `sitemap.xml` and `robots.txt` generated automatically; admin, cart, checkout excluded.
- Clean URLs: `/product/black-oversized-hoodie`, `/category/panjabi`.
- Canonical URLs on filtered listing pages.

### 9.3 Security

*Owner requirement (18 Oct 2026): the site is used by real customers and must hold up against attackers. The detailed, enforced checklist is `rules.md` §8.*


- HTTPS everywhere (Cloudflare).
- Admin routes protected server-side (middleware + per-route role check).
- Passwords hashed (argon2 or bcrypt).
- Rate limiting on login, checkout, coupon apply, track order.
- Input validation on every API with Zod; output encoding to prevent XSS.
- Image uploads only through the API media pipeline: jpg/png/webp up to 8 MB, content-checked, metadata (EXIF/GPS) stripped, re-encoded to WebP; staff only.
- Secrets only in environment variables, never in the repo.
- Stock numbers, cost prices and customer data never exposed by public endpoints.
- Customer phone numbers masked in order tracking results (e.g., `017••••••89`).

### 9.4 Accessibility

- WCAG 2.1 AA colour contrast for text (see `design.md §2` — accent yellow on dark passes; dark text on yellow passes).
- All images have alt text (product name + colour by default).
- Full keyboard navigation for menus, sliders, modals, size selector.
- Visible focus styles.
- Respect `prefers-reduced-motion`.

### 9.5 Reliability

- Daily automated database backup; test a restore before launch.
- Error monitoring with alerts to email.
- Uptime check (free tier of UptimeRobot or Better Stack).

---

## 10. Analytics and tracking

| Event | GA4 | Meta Pixel |
|---|---|---|
| Page view | `page_view` | `PageView` |
| View product | `view_item` | `ViewContent` |
| Add to cart | `add_to_cart` | `AddToCart` |
| Begin checkout | `begin_checkout` | `InitiateCheckout` |
| Place order | `purchase` | `Purchase` |
| Search | `search` | `Search` |

- Microsoft Clarity for heatmaps and session recordings.
- **Facebook/Instagram product catalog feed:** `/api/v1/feeds/facebook.xml` (served by the API) (or CSV) listing published products with price, availability, image and link, for Facebook Shop and catalog ads.

---

## 11. Notifications

| Trigger | Customer | Admin / staff |
|---|---|---|
| Order placed | Success page + email (if given) | Dashboard badge; optional email |
| Order confirmed / shipped / delivered | Email (if given); tracking page always up to date | — |
| Payment pending verification | — | Dashboard badge |
| Low stock | — | Dashboard widget |

SMS is out of scope for MVP (paid). Phone confirmation calls are done manually by staff.

---

## 12. Pages / sitemap

**Storefront**

```
/                         Home
/shop                     All products
/category/[slug]          Category listing
/collection/[slug]        Collection listing
/product/[slug]           Product details
/search?q=                Search results
/cart                     Cart
/checkout                 Checkout
/order/success/[number]   Order success
/track-order              Track order
/account                  Login / register
/account/orders           My orders
/account/orders/[number]  Order details
/account/addresses        Saved addresses
/about  /contact  /faq  /size-guide
/policies/delivery  /policies/returns  /policies/privacy  /policies/terms
```

**Admin**

```
/admin                    Dashboard
/admin/orders  /admin/orders/[id]
/admin/products  /admin/products/new  /admin/products/[id]
/admin/categories  /admin/collections
/admin/customers  /admin/customers/[phone]
/admin/coupons
/admin/content            Home sections, pages, FAQ, announcement
/admin/settings           Store, delivery, payments, stock, size charts, tracking, staff
```

---

## 13. Release plan

Release 1 (MVP) is built in eight phases. Tasks, exit criteria and progress are tracked in `phases.md`.

| Phase | Scope | Est. duration |
|---|---|---|
| **0. Foundation** | Monorepo, CI, Supabase + Prisma schema, seed, design tokens, API client, TanStack Query, deploy pipeline | 1 week |
| **1. Authentication** | Admin/staff login, refresh, roles, guards | 0.5 week |
| **2. Admin & catalog** | Admin shell; products/variants/stock/categories/collections/images/size charts | 1.5 weeks |
| **3. Storefront catalog** | Layout, shop/category/collection, product page, search, SEO basics | 1.5 weeks |
| **4. Cart & checkout** | Cart, checkout, COD + manual bKash/Nagad, coupons, delivery zones, order placement, success, tracking, emails | 1.5 weeks |
| **5. Order management** | Order list/detail, status flow, payment verification, invoices, customers, blocklist, dashboard stats | 1.5 weeks |
| **6. Home, content & settings** | Home sections, content pages, settings, staff; customer accounts if Q6 = yes | 1 week |
| **7. Launch prep** | SEO, analytics, FB feed, performance & accessibility passes, monitoring, backups, production deploy | 1 week |
| **Launch** | Soft launch to friends/followers → public launch | — |

### 13.1 Launch checklist

- [ ] All products uploaded with real photos, size charts and stock
- [ ] Delivery zones and charges set
- [ ] bKash/Nagad numbers set and tested with real small payments
- [ ] 10+ test orders through the full flow (place → confirm → ship → deliver, and cancel/return)
- [ ] Stock numbers confirmed absent from page source and API responses
- [ ] Policies published (delivery, return/exchange, privacy, terms)
- [ ] Meta Pixel and GA4 events verified
- [ ] Backup and restore tested
- [ ] Lighthouse mobile ≥ 85 on home, category and product pages
- [ ] Domain, HTTPS, and Google Search Console set up

---

## 14. Open questions

1. Logo and domain for Aaarchive (e.g., `aaarchive.com` / `aaarchive.com.bd` — check availability).
2. Audience pills on the hero: Men / Women / Kids, or men-only at launch?
3. Delivery zones and charges (e.g., Inside Dhaka / Dhaka Suburbs / Outside Dhaka — or based on the warehouse city).
4. Enable "advance delivery charge for COD" at launch, or only if fake orders become a problem?
5. Exchange policy details: exchange window (e.g., 3 days), who pays return delivery.
6. ~~Will customer accounts be in MVP, or guest-only at first?~~ — In Release 1 (owner, 21 Oct 2026), guest checkout kept (§5.10).
7. Max quantity per variant per order (default 5).
8. Bangla UI timeline.
