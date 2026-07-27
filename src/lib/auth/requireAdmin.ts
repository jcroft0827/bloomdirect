// /lib/auth/requireAdmin.ts

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      authorized: false as const,
      status: 401,
      error: "You must be signed in.",
      session: null,
    };
  }

  if (session.user.role !== "admin") {
    return {
      authorized: false as const,
      status: 403,
      error: "Administrator access is required.",
      session: null,
    };
  }

  const adminShopId = session.user.shopId || session.user.id;

  if (!adminShopId) {
    return {
      authorized: false as const,
      status: 401,
      error: "The administrator account could not be identified.",
      session: null,
    };
  }

  return {
    authorized: true as const,
    status: 200,
    error: null,
    session,
    adminShopId,
  };
}