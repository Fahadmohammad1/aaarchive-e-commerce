import type { Metadata } from "next";
import { DashboardHome } from "./_components/dashboard-home";

export const metadata: Metadata = { title: "Dashboard" };
// Rendered after the browser session check: see layout.tsx.
export const instant = false;

/** Today's numbers and what needs attention (PRD §6.1). */
export default function DashboardPage() {
  return <DashboardHome />;
}
