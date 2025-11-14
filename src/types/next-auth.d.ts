import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      shopId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    shopId?: string;
  }
}