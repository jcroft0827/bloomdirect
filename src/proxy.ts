import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import {
  isPotentialBloomWebsiteCustomHostname,
  normalizeBloomWebsiteHostname,
} from "@/lib/bloom-websites/storefront-hostname";

function getRequestHostname(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");

  return normalizeBloomWebsiteHostname(host);
}

export async function proxy(request: NextRequest) {
  const hostname = getRequestHostname(request);
  const pathname = request.nextUrl.pathname;

  if (!isPotentialBloomWebsiteCustomHostname(hostname)) {
    /*
     * Next.js 16 supports one Proxy entry point. Keep the existing
     * dashboard session gate here alongside custom-domain routing so
     * authentication is not lost when the legacy middleware file is removed.
     */
    if (pathname.startsWith("/dashboard")) {
      try {
        const token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
          return NextResponse.redirect(new URL("/login", request.url));
        }
      } catch (error) {
        console.error("Proxy authentication error:", error);
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    return NextResponse.next();
  }

  /*
   * Keep application APIs and framework assets on their
   * real paths. Storefront browser requests can still call
   * /api/websites/storefront/... on the custom hostname
   * without being rewritten into the page router.
   */

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  /*
   * Never trust middleware as the tenant authorization
   * layer. It only carries the normalized hostname into a
   * Node/server route. MongoDB verification happens there.
   */
  const destination = request.nextUrl.clone();
  const safeHostname = encodeURIComponent(hostname);

  destination.pathname =
    pathname === "/"
      ? `/websites/live/${safeHostname}`
      : `/websites/live/${safeHostname}${pathname}`;

  const response = NextResponse.rewrite(destination);

  response.headers.set("x-bloom-storefront-host", hostname);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)",
  ],
};
