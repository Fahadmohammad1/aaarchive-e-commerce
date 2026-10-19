export const contentKeys = {
  all: ["content"] as const,
  site: () => [...contentKeys.all, "site"] as const,
  admin: () => [...contentKeys.all, "admin"] as const,
  socialPosts: () => [...contentKeys.all, "social-posts"] as const,
  pages: () => [...contentKeys.all, "pages"] as const,
  page: (id: string) => [...contentKeys.all, "pages", id] as const,
  faq: () => [...contentKeys.all, "faq"] as const,
};
