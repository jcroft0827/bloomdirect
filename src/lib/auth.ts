// src/lib/auth.ts
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<any> {
        await connectToDB();
        const shop = await Shop.findOne({ email: credentials?.email });
        if (
          shop &&
          bcrypt.compareSync(credentials?.password || "", shop.password)
        ) {
          return {
            id: shop._id.toString(),
            name: shop.shopName,
            email: shop.email,
            shopId: shop._id.toString(),
            isPro: Boolean(shop.isPro),      // ← Force boolean
          };
        }
        return null;
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: true,
  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain:
          process.env.NODE_ENV === "production"
            ? ".getbloomdirect.com"
            : undefined,
      },
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.shopId = user.shopId;
        token.isPro = user.isPro;        // ← Direct copy
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.shopId = token.shopId as string;
      session.user.isPro = Boolean(token.isPro); // ← Final safety net
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
} satisfies import("next-auth").NextAuthOptions;