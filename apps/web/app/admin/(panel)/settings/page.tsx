import type { Metadata } from "next";
import { SettingsScreen } from "./_components/settings-screen";

export const metadata: Metadata = { title: "Settings" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function SettingsPage() {
  return <SettingsScreen />;
}
