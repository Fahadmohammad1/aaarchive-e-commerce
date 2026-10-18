import type { ProductStatus } from "@aaarchive/shared/product";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

const tone: Record<ProductStatus, string> = {
  PUBLISHED: "border-success text-success",
  DRAFT: "text-muted-foreground",
  ARCHIVED: "border-transparent bg-muted text-muted-foreground",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge variant="outline" className={cn(tone[status])}>
      {getAdminMessages().products.status[status]}
    </Badge>
  );
}
