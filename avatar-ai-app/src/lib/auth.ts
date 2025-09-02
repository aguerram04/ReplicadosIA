import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import {
  findOrCreateUserByEmail,
  recordUserLoginEvent,
  recordUserLogoutByUser,
} from "@/lib/db-helpers";
import { headers } from "next/headers";

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

providers.push(
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      name: { label: "Nombre", type: "text", required: false },
    },
    async authorize(credentials) {
      if (!credentials?.email) return null;
      const user = await findOrCreateUserByEmail(credentials.email, {
        name: credentials.name || undefined,
      });
      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name ?? null,
      } as any;
    },
  })
);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      try {
        if ((user as any)?.email) {
          await findOrCreateUserByEmail((user as any).email, {
            name: (user as any).name || undefined,
          });
        }
      } catch (e) {
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      // On new sign-in, always resolve the canonical DB user and stamp its _id
      if (user && (user as any).email) {
        const dbUser = await findOrCreateUserByEmail((user as any).email, {
          name: (user as any).name || undefined,
        });
        token.id = dbUser._id.toString();
        token.email = dbUser.email;
        token.name = dbUser.name ?? null;
        (token as any).role =
          (dbUser as any).role ??
          ((dbUser as any).isAdmin ? "admin" : "user") ??
          "user";
        (token as any).isAdmin = (dbUser as any).isAdmin ?? false;
        return token;
      }

      // Backfill/normalize on any request that has an email (covers refresh/session fetch)
      if (token.email) {
        const dbUser = await findOrCreateUserByEmail(token.email as string, {
          name: (token.name as string) || undefined,
        });
        token.id = token.id || dbUser._id.toString();
        (token as any).role =
          (dbUser as any).role ??
          ((dbUser as any).isAdmin ? "admin" : "user") ??
          "user";
        (token as any).isAdmin = (dbUser as any).isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = (token.name as string) ?? null;
        (session.user as any).role = (token as any).role || "user";
        (session.user as any).isAdmin = Boolean((token as any).isAdmin);
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      try {
        const hdrs = headers();
        const ip =
          hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || undefined;
        const userAgent = hdrs.get("user-agent") || undefined;
        if ((user as any)?.email) {
          const dbUser = await findOrCreateUserByEmail((user as any).email, {
            name: (user as any).name || undefined,
          });
          await recordUserLoginEvent({
            userId: dbUser._id.toString(),
            email: dbUser.email,
            name: dbUser.name ?? null,
            provider: account?.provider,
            ip,
            userAgent,
            success: true,
          });
        }
      } catch {}
    },
    async signOut({ token }) {
      try {
        const userId = (token as any)?.id as string | undefined;
        if (userId) {
          await recordUserLogoutByUser({ userId });
        }
      } catch {}
    },
  },
};
