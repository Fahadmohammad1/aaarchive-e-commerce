import type { Metadata } from "next";
import { DashboardWelcome } from "./_components/dashboard-welcome";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder until Phase 5 adds the stats (PRD §6.1).
export default function DashboardPage() {
  return <DashboardWelcome />;
}
