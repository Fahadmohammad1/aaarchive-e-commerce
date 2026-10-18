"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

// Placeholder until Phase 5 adds the stats (PRD §6.1).
export function DashboardWelcome() {
  const t = getAdminMessages();
  const { user } = useAuth();
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="font-semibold text-2xl">
        {format(t.welcome, { name: user?.name ?? "" })}
      </h1>
      <p className="max-w-prose text-muted-foreground">{t.dashboardSoon}</p>
      <Button asChild size="lg" className="mt-2">
        <Link href="/admin/categories">
          {t.dashboardStart}
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
