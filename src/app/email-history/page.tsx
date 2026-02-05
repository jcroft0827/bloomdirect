// src/app/email-history/page.tsx
import EmailHistoryClient from "./EmailHistoryClient";
import Providers from "@/components/Providers";

export default function EmailHistoryPage() {
  return (
    <Providers>
      <EmailHistoryClient />
    </Providers>
  );
}