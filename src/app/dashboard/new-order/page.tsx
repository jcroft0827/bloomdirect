// src/app/dashboard/new-order/page.tsx
import Providers from "@/components/Providers";
import NewOrderClient from "./NewOrderClient";
import { Suspense } from "react";

export default function NewOrderPage() {
return (
  <Providers>
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />

            <p className="mt-4 text-sm font-medium text-slate-500">
              Preparing your order...
            </p>
          </div>
        </div>
      }
    >
      <NewOrderClient />
    </Suspense>
  </Providers>
);
}