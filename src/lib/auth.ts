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
        if (shop && bcrypt.compareSync(credentials?.password || "", shop.password)) {
          return {
            id: shop._id.toString(),
            name: shop.shopName,
            email: shop.email,
            shopId: shop._id.toString(),
          };
        }
        return null;
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  // THIS IS ALL YOU NEED FOR WWW + HTTPS
  useSecureCookies: true,
  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },

  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) token.shopId = user.shopId;
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token.shopId) session.user.shopId = token.shopId;
      return session;
    },
    // This one line fixes the "Error www.getbloomdirect.com" forever
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
} satisfies import("next-auth").NextAuthOptions;