export const reportKeys = {
  all: ["reports"] as const,
  summary: () => [...reportKeys.all, "summary"] as const,
};
