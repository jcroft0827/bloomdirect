// src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      isPro: boolean;
      proSince?: string | null;
      // any additional fields you expose
      [key: string]: any;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    isPro?: boolean;
    proSince?: string | null;
    logo?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string | null;
    name?: string | null;
    isPro?: boolean;
    proSince?: string | null;
    logo?: string | null;
    // `sub` will still be set by NextAuth if present
  }
}
