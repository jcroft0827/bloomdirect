// src/app/pos-integration/page.tsx
import Providers from "@/components/Providers";
import POSIntegrationClient from "./POSIntegrationClient";

export default function DashboardPage() {
  return (
    <Providers>
      <POSIntegrationClient />
    </Providers>
  );
}