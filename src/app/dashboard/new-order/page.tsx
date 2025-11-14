// src/app/dashboard/new-order/page.tsx
import Providers from "@/components/Providers";
import NewOrderClient from "./NewOrderClient";

export default function NewOrderPage() {
  return (
    <Providers>
      <NewOrderClient />
    </Providers>
  );
}