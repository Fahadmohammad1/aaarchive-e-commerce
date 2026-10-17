// Every user-facing UI string. Content written by the team (headlines,
// product names, intros) is data from the API, not here. Bangla: bn.ts in
// Release 2, same shape.
export const en = {
  brand: "Aaarchive",
  header: {
    menu: "Menu",
    cart: "Cart ({count})",
    search: "Search",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    home: "Aaarchive home",
  },
  nav: {
    shop: "Shop all",
    collections: "Collections",
    categories: "Categories",
    trackOrder: "Track order",
    about: "About us",
    faq: "FAQs",
    contact: "Contact",
    home: "Home",
    sizeGuide: "Size guide",
  },
  actions: {
    browseAll: "Browse all",
    browseMore: "Browse more",
    learnMore: "Learn more",
    followUs: "Follow us",
    previous: "Previous",
    next: "Next",
    viewPost: "View post on {platform}",
    shopTheLook: "Shop the look",
    shopTheDrop: "Shop the drop",
    shopPiece: "Shop {name}",
    shopCategory: "Shop {category}",
  },
  product: {
    items: "{count} items",
    sale: "-{percent}%",
    outOfStock: "Out of stock",
    originalPrice: "Original price",
    filter: "Filter by category",
  },
  contact: {
    whatsapp: "Chat on WhatsApp",
    messenger: "Chat on Messenger",
  },
  look: {
    pieces: "{count} pieces",
    total: "Look total",
  },
  footer: {
    shop: "Shop",
    help: "Help",
    policies: "Policies",
    delivery: "Delivery policy",
    payments: "We accept",
    paymentMethods: "Cash on delivery · bKash · Nagad",
    privacy: "Privacy policy",
    terms: "Terms & conditions",
    returns: "Return policy",
    social: "Follow Aaarchive",
    rights: "© {year} Aaarchive. All rights reserved.",
  },
} as const;

export type Messages = typeof en;
