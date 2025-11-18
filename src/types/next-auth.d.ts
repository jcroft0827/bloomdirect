// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;

      // ←←← YOUR CUSTOM FIELDS — ADD ANYTHING YOU WANT ←←←
      shopId?: string;
      shopName?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      isPro?: boolean;
      proSince?: string;     // ISO date
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    shopId?: string;
    shopName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    isPro?: boolean;
    proSince?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    shopId?: string;
    shopName?: string;
    isPro?: boolean;
    proSince?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }
}