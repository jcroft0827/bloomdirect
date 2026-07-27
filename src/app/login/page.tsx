import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Log In",

  description:
    "Log in to your GetBloomDirect florist account to manage orders, messages, your shop profile, reporting, and account settings.",

  alternates: {
    canonical: "/login",
  },

  robots: {
    index: false,
    follow: true,
    nocache: true,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
