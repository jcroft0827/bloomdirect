// middleware.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = [
  "/dashboard",
  "/incoming",
  "/outgoing",
  "/settings",
  "/send",
  "/orders",
];

export async function middleware(req: any) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const { pathname } = req.nextUrl;

  // If user is not signed in and tries to access a protected route → redirect to login
  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !token) {
    const loginUrl = new URL("/login");
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/incoming/:path*",
    "/outgoing/:path*",
    "/settings/:path*",
    "/send/:path*",
    "/orders/:path*",
  ],
};