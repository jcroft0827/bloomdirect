// /app/dashboard/incoming/page.tsx

import { Suspense } from "react";
import Providers from "@/components/Providers";
import OrdersDashboard from "./OrdersDashboard";

function OrdersDashboardFallback() {
  return (
    <div className="p-6">
      <p className="text-sm text-muted-foreground">
        Loading incoming orders...
      </p>
    </div>
  );
}

export default function IncomingPage() {
  return (
    <Providers>
      <Suspense fallback={<OrdersDashboardFallback />}>
        <OrdersDashboard />
      </Suspense>
    </Providers>
  );
}