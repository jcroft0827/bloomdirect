// src/app/dashboard/page.tsx
import DashboardClient from "./DashboardClient";
import Providers from "@/components/Providers";

export default function DashboardPage() {
  return (
    <Providers>
      <DashboardClient />
    </Providers>
  );
}
