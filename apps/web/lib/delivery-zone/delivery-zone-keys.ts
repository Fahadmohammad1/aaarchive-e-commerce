export const zoneKeys = {
  all: ["delivery-zones"] as const,
  admin: () => [...zoneKeys.all, "admin"] as const,
  store: () => [...zoneKeys.all, "store"] as const,
};
