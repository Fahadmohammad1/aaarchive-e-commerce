import type { StockStatus } from "@aaarchive/shared/stock";
import type { CardProduct } from "@/components/store/product-card";

// Development fixtures for the home page. In Phase 6 these come from
// GET /api/v1/content/home and the catalog endpoints; keep the shapes close
// to what the API will return so swapping the source is a one-file change.
// Images are Unsplash placeholders (design.md §9) — never ship them.

// Ask Unsplash for a 1600px source: the originals are several MB and make the
// Next image optimizer time out fetching them.
const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

export type HomeCategory = {
  slug: string;
  name: string;
  productCount: number;
  image: string;
};

export type HomeProduct = {
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  price: number;
  salePrice?: number;
  image: string;
  hoverImage?: string;
  colors: { name: string; hex: string }[];
  status: StockStatus;
  isNew?: boolean;
};

export type SocialPost = {
  id: string;
  image: string;
  label: string;
  platform: "Facebook" | "Instagram" | "TikTok";
  href: string;
};

export const announcement =
  "Free delivery all over Bangladesh on orders over ৳2,000";

export const hero = {
  headline: ["Made for every season,", "worn for every story"],
  audiences: [
    { label: "Men", href: "/shop?audience=men" },
    { label: "Women", href: "/shop?audience=women" },
    { label: "Kids", href: "/shop?audience=kids" },
  ],
  mainImage: unsplash("1506794778202-cad84cf45f1d"),
  sideImages: [
    unsplash("1614975059251-992f11792b9f"),
    unsplash("1503341504253-dff4815485f1"),
  ],
};

export const categoriesIntro = {
  heading: ["The archive", "index"],
  intro:
    "Everything we make, filed in one drawer. Pick a section and pull it open.",
};

export const categories: HomeCategory[] = [
  {
    slug: "hoodies",
    name: "Hoodies",
    productCount: 24,
    image: unsplash("1556821840-3a63f95609a7"),
  },
  {
    slug: "t-shirts",
    name: "T-Shirts",
    productCount: 36,
    image: unsplash("1521572163474-6864f9cf17ab"),
  },
  {
    slug: "panjabi",
    name: "Panjabi",
    productCount: 40,
    image: unsplash("1586790170083-2f9ceadc732d"),
  },
  {
    slug: "sweatshirts",
    name: "Sweatshirts",
    productCount: 18,
    image: unsplash("1620799140408-edc6dcb6d633"),
  },
  {
    slug: "joggers",
    name: "Joggers",
    productCount: 12,
    image: unsplash("1594633312681-425c7b97ccd1"),
  },
  {
    slug: "accessories",
    name: "Accessories",
    productCount: 9,
    image: unsplash("1622445275463-afa2ab738c34"),
  },
];

/** One styled look, listed piece by piece like a catalogue entry. */
export const lookFile = {
  heading: ["Look file", "No. 01"],
  label: "Filed under: Winter",
  intro:
    "One look, every piece in it, and what it costs. Wear it as filed or pull a single piece.",
  image: unsplash("1578681994506-b8f463449011"),
  items: [
    {
      slug: "logo-sweatshirt-black",
      code: "AAR-SW-021",
      hotspot: { x: 36, y: 62 },
      name: "Logo sweatshirt",
      price: 1950,
      image: unsplash("1614975059251-992f11792b9f"),
      colors: ["#111111", "#5e1310"],
    },
    {
      slug: "black-boxy-tee",
      code: "AAR-TS-014",
      hotspot: { x: 58, y: 40 },
      name: "Boxy heavyweight tee",
      price: 990,
      image: unsplash("1618354691373-d851c5c3a990"),
      colors: ["#111111", "#e9e4da"],
    },
    {
      slug: "corduroy-bucket-hat",
      code: "AAR-AC-003",
      hotspot: { x: 62, y: 14 },
      name: "Corduroy bucket hat",
      price: 750,
      image: unsplash("1578681994506-b8f463449011"),
      colors: ["#c8a27a", "#111111"],
    },
  ],
};

/** Campaign tile that leads the Latest entries grid. */
export const latestCampaign = {
  tag: "Archive 01",
  title: ["Winter", "drop"],
  text: "Heavy fleece, washed blacks and festive panjabi. Logged this season.",
  image: unsplash("1617127365659-c47fa864d8bc"),
  href: "/collection/archive-01-winter-drop",
};

export const collectionsIntro = {
  heading: ["Latest", "entries"],
  intro:
    "Fresh off the rail this season. Filter by what you are after, or start with the drop.",
};

export const products: HomeProduct[] = [
  {
    slug: "oversized-black-hoodie",
    name: "Oversized black hoodie",
    category: "Hoodies",
    categorySlug: "hoodies",
    price: 1800,
    salePrice: 1450,
    image: unsplash("1614975059251-992f11792b9f"),
    hoverImage: unsplash("1556821840-3a63f95609a7"),
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Grey", hex: "#8a8a8a" },
    ],
    status: "in_stock",
    isNew: true,
  },
  {
    slug: "grey-washed-hoodie",
    name: "Washed grey hoodie",
    category: "Hoodies",
    categorySlug: "hoodies",
    price: 1650,
    image: unsplash("1556821840-3a63f95609a7"),
    colors: [{ name: "Grey", hex: "#8a8a8a" }],
    status: "low_stock",
    isNew: true,
  },
  {
    slug: "white-eid-panjabi",
    name: "White cotton panjabi",
    category: "Panjabi",
    categorySlug: "panjabi",
    price: 2450,
    image: unsplash("1586790170083-2f9ceadc732d"),
    colors: [{ name: "White", hex: "#f3ede2" }],
    status: "in_stock",
    isNew: true,
  },
  {
    slug: "black-graphic-tee",
    name: "Archive graphic tee",
    category: "T-Shirts",
    categorySlug: "t-shirts",
    price: 890,
    image: unsplash("1503341504253-dff4815485f1"),
    hoverImage: unsplash("1503342217505-b0a15ec3261c"),
    colors: [{ name: "Black", hex: "#111111" }],
    status: "in_stock",
    isNew: true,
  },
  {
    slug: "logo-sweatshirt-black",
    name: "Logo sweatshirt",
    category: "Sweatshirts",
    categorySlug: "sweatshirts",
    price: 1950,
    image: unsplash("1578681994506-b8f463449011"),
    colors: [{ name: "Black", hex: "#111111" }],
    status: "in_stock",
    isNew: true,
  },
  {
    slug: "printed-cotton-tee",
    name: "Printed cotton tee",
    category: "T-Shirts",
    categorySlug: "t-shirts",
    price: 950,
    salePrice: 790,
    image: unsplash("1576566588028-4147f3842f27"),
    colors: [{ name: "Sand", hex: "#e4ddc0" }],
    status: "in_stock",
    isNew: true,
  },
  {
    slug: "crew-sweatshirt",
    name: "Crew sweatshirt",
    category: "Sweatshirts",
    categorySlug: "sweatshirts",
    price: 1850,
    image: unsplash("1620799140408-edc6dcb6d633"),
    colors: [{ name: "Off-white", hex: "#e9e4da" }],
    status: "out_of_stock",
    isNew: true,
  },
  {
    slug: "relaxed-white-tee",
    name: "Relaxed white tee",
    category: "T-Shirts",
    categorySlug: "t-shirts",
    price: 790,
    image: unsplash("1622445275463-afa2ab738c34"),
    colors: [{ name: "White", hex: "#f3ede2" }],
    status: "in_stock",
    isNew: true,
  },
  {
    slug: "festive-panjabi-maroon",
    name: "Maroon festive panjabi",
    category: "Panjabi",
    categorySlug: "panjabi",
    price: 2950,
    image: unsplash("1617137968427-85924c800a22"),
    colors: [{ name: "Maroon", hex: "#5e1310" }],
    status: "in_stock",
  },
  {
    slug: "tapered-joggers",
    name: "Tapered joggers",
    category: "Joggers",
    categorySlug: "joggers",
    price: 1350,
    image: unsplash("1594633312681-425c7b97ccd1"),
    colors: [{ name: "Blush", hex: "#d9a59a" }],
    status: "in_stock",
  },
  {
    slug: "white-essential-tee",
    name: "Essential white tee",
    category: "T-Shirts",
    categorySlug: "t-shirts",
    price: 690,
    image: unsplash("1521572163474-6864f9cf17ab"),
    colors: [{ name: "White", hex: "#f3ede2" }],
    status: "in_stock",
  },
  {
    slug: "black-crew-sweatshirt",
    name: "Black crew sweatshirt",
    category: "Sweatshirts",
    categorySlug: "sweatshirts",
    price: 1750,
    image: unsplash("1614975059251-992f11792b9f"),
    colors: [{ name: "Black", hex: "#111111" }],
    status: "in_stock",
  },
];

/** Tabs for the collections grid: "new" first, then categories. Max 8 per tab (PRD H4). */
export const collectionTabs = [
  { value: "new", label: "New" },
  { value: "hoodies", label: "Hoodies" },
  { value: "panjabi", label: "Panjabi" },
  { value: "t-shirts", label: "T-Shirts" },
  { value: "sweatshirts", label: "Sweatshirts" },
  { value: "joggers", label: "Joggers" },
] as const;

/** Four promises, shown as garment care labels. */
export const madeToKeep = {
  heading: ["Made to", "be kept"],
  intro:
    "We would rather sell you one piece you wear for years than five you forget. This is how we make that happen.",
  image: unsplash("1520975954732-35dd22299614"),
  labels: [
    {
      icon: "weather",
      title: "Cut for our weather",
      text: "Breathable cotton for Dhaka heat, fleece for winter nights.",
      spec: "Breathable · Layerable",
    },
    {
      icon: "fabric",
      title: "Fabric by the gram",
      text: "Every product lists its GSM, so you know exactly how heavy it is.",
      spec: "GSM on every tag",
    },
    {
      icon: "payment",
      title: "Pay at your door",
      text: "Cash on delivery anywhere in Bangladesh, or bKash and Nagad.",
      spec: "COD · bKash · Nagad",
    },
    {
      icon: "exchange",
      title: "Wrong size? Swap it",
      text: "Exchange for another size without the back-and-forth.",
      spec: "Size exchange",
    },
  ],
} as const;

export const social = {
  heading: ["Follow our", "style journey"],
  intro: "Real fits from our feed. Tag @aaarchive to get filed in the archive.",
  followHref: "https://www.instagram.com/aaarchive",
  posts: [
    {
      id: "p1",
      image: unsplash("1529139574466-a303027c1d8b"),
      label: "12K+ likes",
      platform: "Instagram",
      href: "https://www.instagram.com/aaarchive",
    },
    {
      id: "p2",
      image: unsplash("1552374196-1ab2a1c593e8"),
      label: "8K+ views",
      platform: "TikTok",
      href: "https://www.tiktok.com/@aaarchive",
    },
    {
      id: "p3",
      image: unsplash("1617114919297-3c8ddb01f599"),
      label: "9K+ likes",
      platform: "Facebook",
      href: "https://www.facebook.com/aaarchive",
    },
    {
      id: "p4",
      image: unsplash("1488161628813-04466f872be2"),
      label: "15K+ views",
      platform: "TikTok",
      href: "https://www.tiktok.com/@aaarchive",
    },
    {
      id: "p5",
      image: unsplash("1516257984-b1b4d707412e"),
      label: "6K+ likes",
      platform: "Instagram",
      href: "https://www.instagram.com/aaarchive",
    },
    {
      id: "p6",
      image: unsplash("1622445275463-afa2ab738c34"),
      label: "11K+ likes",
      platform: "Facebook",
      href: "https://www.facebook.com/aaarchive",
    },
  ] satisfies SocialPost[],
};

export const footer = {
  blurb:
    "An archive of looks — hoodies, panjabi and everyday pieces worth keeping, season after season. Made for Bangladesh.",
  image: unsplash("1441984904996-e0b6ba687e04"),
  socials: [
    {
      label: "FB",
      name: "Facebook",
      href: "https://www.facebook.com/aaarchive",
    },
    {
      label: "IG",
      name: "Instagram",
      href: "https://www.instagram.com/aaarchive",
    },
    { label: "TT", name: "TikTok", href: "https://www.tiktok.com/@aaarchive" },
    { label: "WA", name: "WhatsApp", href: "https://wa.me/8801700000000" },
  ],
};

export const contactLinks = {
  whatsapp: "https://wa.me/8801700000000",
  messenger: "https://m.me/aaarchive",
};

/** A fixture product in the card shape the API returns (until Phase 6). */
export function toCardProduct(p: HomeProduct): CardProduct {
  const alt = `${p.name} — ${p.colors[0]?.name ?? ""}`;
  return {
    slug: p.slug,
    name: p.name,
    category: { name: p.category },
    price: p.salePrice ?? p.price,
    compareAt: p.salePrice !== undefined ? p.price : null,
    image: { src: p.image, alt },
    hoverImage: p.hoverImage ? { src: p.hoverImage, alt: "" } : null,
    stockStatus: p.status === "out_of_stock" ? "out_of_stock" : "in_stock",
  };
}
