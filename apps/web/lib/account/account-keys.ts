export const accountKeys = {
  all: ["account"] as const,
  profile: () => [...accountKeys.all, "profile"] as const,
  orders: () => [...accountKeys.all, "orders"] as const,
  order: (orderNumber: string) =>
    [...accountKeys.all, "order", orderNumber] as const,
  addresses: () => [...accountKeys.all, "addresses"] as const,
};
