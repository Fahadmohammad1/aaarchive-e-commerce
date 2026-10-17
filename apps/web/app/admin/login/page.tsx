import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      {/* useSearchParams (for ?next=) needs a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
