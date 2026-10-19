import type { OrderStatus, PaymentStatus } from "@aaarchive/shared/order";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

const statusTone: Record<OrderStatus, string> = {
  PENDING: "border-primary text-primary",
  CONFIRMED: "text-foreground",
  PROCESSING: "text-foreground",
  SHIPPED: "border-foreground text-foreground",
  DELIVERED: "border-success text-success",
  CANCELLED: "border-destructive text-destructive",
  RETURNED: "border-destructive text-destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={cn(statusTone[status])}>
      {getAdminMessages().orderStatus[status]}
    </Badge>
  );
}

const paymentTone: Record<PaymentStatus, string> = {
  UNPAID: "text-muted-foreground",
  PENDING_VERIFICATION: "border-primary text-primary",
  PAID: "border-success text-success",
  PARTIALLY_PAID: "text-foreground",
  REFUNDED: "text-muted-foreground",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={cn(paymentTone[status])}>
      {getAdminMessages().paymentStatus[status]}
    </Badge>
  );
}
