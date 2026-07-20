import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "BloomDirect",
  description: "Florists helping florists — no wire fees ever",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#d8b4fe",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "12px 16px",
              fontWeight: "600",
              textAlign: "center",
            },
            success: {
              duration: 3000,
              style: {
                background: "#059669",
                color: "#ffffff",
              }
            },
            error: {
              duration: 5000,
              style: {
                background: "#dc2626",
                color: "#ffffff",
              }
            },
          }}
        />
      </body>
    </html>
  );
}