import type { Metadata } from "next";
import { Suspense } from "react";

import BloomSpinner from "@/components/BloomSpinner";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your GetBloomDirect account password.",
  alternates: {
    canonical: "/reset-password",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <BloomSpinner />
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}