"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { format, getMessages } from "@/lib/i18n/i18n";

export function DashboardWelcome() {
  const t = getMessages().admin;
  const { user } = useAuth();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-semibold text-2xl">
        {format(t.welcome, { name: user?.name ?? "" })}
      </h1>
      <p className="text-muted-foreground">{t.dashboardSoon}</p>
    </div>
  );
}
