import type { Metadata } from "next";
import { StaffScreen } from "./_components/staff-screen";

export const metadata: Metadata = { title: "Staff" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function StaffPage() {
  return <StaffScreen />;
}
