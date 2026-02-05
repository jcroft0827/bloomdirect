import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectToDB();

        // Shop model acts as "user" — select password explicitly
        const shop = await Shop.findOne({ email: credentials.email }).select(
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
        } catch (err) {
          console.warn("Failed to update lastLogin", err);
        }

        // Return fields that jwt() should pick up
        return {
          id: shop._id.toString(),
          shopId: shop._id.toString(),
          email: shop.email,
          name: shop.shopName,
          isPro: shop.isPro,
          proSince: shop.proSince ? shop.proSince.toISOString() : null,
          // logo: shop.logo ?? null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
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
        return token;
      }

      // subsequent requests: refresh dynamic bits from DB (keeps isPro current)
      const shopId = token.id ?? token.sub;
      if (shopId) {
        try {
          await connectToDB();
          const shop = await Shop.findById(shopId).select("isPro proSince shopName logo");
          if (shop) {
            token.isPro = shop.isPro;
            token.proSince = shop.proSince ? shop.proSince.toISOString() : null;
            token.name = shop.shopName ?? token.name;
            // token.logo = shop.logo ?? token.logo;
          }
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
};

export default authOptions;
