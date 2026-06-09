// src/app/dashboard/verification/page.tsx
import VerificationClient from "./VerificationClient";
import Providers from "@/components/Providers";

export default function VerificationPage() {
  return (
    <Providers>
      <VerificationClient />
    </Providers>
  );
}