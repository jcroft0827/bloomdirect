// lib/auth.ts

import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import bcrypt from "bcryptjs";
import { ensureDefaultDesignerChoice } from "./offerings/ensureDefaultOfferings";
import { checkBloomWebsiteRateLimit } from "./bloom-websites/checkBloomWebsiteRateLimit";
import { randomUUID } from "node:crypto";
import ShopSession from "@/models/ShopSession";


const SHOP_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const SHOP_SESSION_TOUCH_INTERVAL_MS = 15 * 60 * 1000;

function getHeaderString(headersValue: unknown, name: string) {
  if (!headersValue || typeof headersValue !== "object") return "";

  const record = headersValue as Record<string, unknown>;
  const value = record[name] ?? record[name.toLowerCase()];

  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join(",");
  return "";
}

async function createTrackedShopSession({
  shopId,
  userAgent = "",
}: {
  shopId: string;
  userAgent?: string;
}) {
  const now = new Date();
  const sessionId = randomUUID();

  await ShopSession.create({
    shopId,
    sessionId,
    userAgent: userAgent.slice(0, 500),
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + SHOP_SESSION_MAX_AGE_SECONDS * 1000),
  });

  return sessionId;
}

function revokeJwtToken(token: any) {
  token.sessionRevoked = true;
  token.id = undefined;
  token.shopId = undefined;
  token.email = undefined;
  token.name = undefined;
  token.role = undefined;
  token.isPro = false;
  token.proSince = null;
  token.sub = undefined;
  return token;
}

function buildRateLimitRequest(headersValue: unknown) {
  const headers = new Headers();

  if (headersValue && typeof headersValue === "object") {
    for (const [key, value] of Object.entries(
      headersValue as Record<string, unknown>,
    )) {
      if (typeof value === "string") {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.map(String).join(","));
      }
    }
  }

  return new Request("http://localhost/internal-login-rate-limit", { headers });
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectToDB();

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const rateLimitRequest = buildRateLimitRequest(request?.headers);

        const [accountLimit, clientLimit] = await Promise.all([
          checkBloomWebsiteRateLimit({
            request: rateLimitRequest,
            scope: "login-account",
            subject: normalizedEmail,
            limit: 10,
            windowMs: 15 * 60 * 1000,
          }),
          checkBloomWebsiteRateLimit({
            request: rateLimitRequest,
            scope: "login-client",
            subject: "all-accounts",
            limit: 60,
            windowMs: 15 * 60 * 1000,
          }),
        ]);

        if (!accountLimit.allowed || !clientLimit.allowed) {
          return null;
        }

        // Shop model excludes password by default; authentication opts in.
        const shop = await Shop.findOne({ email: normalizedEmail }).select(
          "+password"
        );

        if (!shop) return null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const valid = await bcrypt.compare(credentials.password, (shop as any).password);
        if (!valid) return null;

        // update lastLogin (non-blocking best-effort)
        try {
          shop.lastLogin = new Date();
          await shop.save();

          await ensureDefaultDesignerChoice(shop._id.toString());
        } catch (err) {
          console.warn("Failed to update lastLogin", err);
        }

        const sessionId = await createTrackedShopSession({
          shopId: shop._id.toString(),
          userAgent: getHeaderString(request?.headers, "user-agent"),
        });

        // Return fields that jwt() should pick up
        return {
          id: shop._id.toString(),
          shopId: shop._id.toString(),
          email: shop.email,
          name: shop.shopName,
          isPro: shop.isPro,
          proSince: shop.proSince ? shop.proSince.toISOString() : null,
          role: shop.role,
          sessionId,
          // logo: shop.logo ?? null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: SHOP_SESSION_MAX_AGE_SECONDS },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Runs at sign-in and on each request when using jwt sessions
    async jwt({ token, user }) {
      // user exists only at sign-in
      if (user) {
        token.id = (user as any).id ?? token.id;
        token.shopId = (user as any).shopId ?? token.shopId;
        token.email = (user as any).email ?? token.email;
        token.name = (user as any).name ?? token.name;
        token.isPro = (user as any).isPro ?? Boolean(token.isPro);
        token.proSince = (user as any).proSince ?? token.proSince ?? null;
        // token.logo = (user as any).logo ?? token.logo ?? null;
        token.role = (user as any).role ?? token.role;
        token.sessionId = (user as any).sessionId ?? token.sessionId;
        token.sessionRevoked = false;
        return token;
      }

      // Subsequent requests: validate the tracked browser session and refresh
      // dynamic shop bits from Mongo. Existing JWTs created before tracked
      // sessions were introduced are enrolled on first refresh.
      const shopId = token.id ?? token.sub;
      if (shopId) {
        try {
          await connectToDB();

          const shop = await Shop.findById(shopId).select(
            "isPro proSince shopName logo role sessionsValidAfter",
          );

          if (!shop) {
            return revokeJwtToken(token);
          }

          let sessionId = token.sessionId as string | undefined;

          if (!sessionId) {
            const issuedAtMs = Number(token.iat || 0) * 1000;
            const validAfterMs = shop.sessionsValidAfter?.getTime?.() ?? 0;

            if (validAfterMs && issuedAtMs < validAfterMs) {
              return revokeJwtToken(token);
            }

            sessionId = await createTrackedShopSession({
              shopId: String(shopId),
              userAgent: "Legacy session",
            });
            token.sessionId = sessionId;
          }

          const trackedSession = await ShopSession.findOne({
            shopId,
            sessionId,
            expiresAt: { $gt: new Date() },
          }).select("lastSeenAt");

          if (!trackedSession) {
            return revokeJwtToken(token);
          }

          const now = Date.now();
          const lastSeenAt = trackedSession.lastSeenAt?.getTime?.() ?? 0;

          if (now - lastSeenAt >= SHOP_SESSION_TOUCH_INTERVAL_MS) {
            await ShopSession.updateOne(
              { _id: trackedSession._id },
              { $set: { lastSeenAt: new Date(now) } },
            );
          }

          token.sessionRevoked = false;
          token.isPro = shop.isPro;
          token.proSince = shop.proSince ? shop.proSince.toISOString() : null;
          token.name = shop.shopName ?? token.name;
          token.role = shop.role ?? token.role;
          // token.logo = shop.logo ?? token.logo;
        } catch (err) {
          console.warn("Error refreshing jwt from DB:", err);
        }
      }

      return token;
    },

    // What the client receives in `useSession()`
    async session({ session, token }) {
      session.user = session.user || ({} as any);
      // prefer token.id (set at login) or token.sub
      session.user.id = (token.id as string) ?? (token.sub as string) ?? session.user.id;
      session.user.shopId = (token.shopId as string) ?? session.user.shopId;
      session.user.email = (token.email as string) ?? session.user.email;
      session.user.name = (token.name as string) ?? session.user.name;
      session.user.isPro = Boolean(token.isPro);
      // token.proSince may be string | null
      session.user.proSince = (token.proSince as string | null) ?? undefined;
      // optional
      (session.user as any).logo = (token.logo as string | null) ?? null;
      // role / tracked session security
      session.user.role = token.role as string;
      session.user.sessionId = (token.sessionId as string | undefined) ?? undefined;
      session.user.sessionRevoked = Boolean(token.sessionRevoked);

      if (session.user.sessionRevoked) {
        session.user.id = "";
        session.user.shopId = "";
        session.user.email = null;
        session.user.name = null;
        session.user.role = undefined;
        session.user.isPro = false;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch (err) {
        // ignore
      }
      return baseUrl;
    },
  },
  events: {
    async signOut({ token }) {
      const sessionId = token?.sessionId as string | undefined;

      if (!sessionId) return;

      try {
        await connectToDB();
        await ShopSession.deleteOne({ sessionId });
      } catch (err) {
        console.warn("Failed to remove tracked shop session on sign out:", err);
      }
    },
  },
};

export default authOptions;
