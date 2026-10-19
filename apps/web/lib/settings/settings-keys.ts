export const settingsKeys = {
  all: ["settings"] as const,
  public: () => [...settingsKeys.all, "public"] as const,
  couriers: () => [...settingsKeys.all, "couriers"] as const,
  admin: () => [...settingsKeys.all, "admin"] as const,
};
