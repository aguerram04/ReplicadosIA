import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findOrCreateUserByEmail } from "@/lib/db-helpers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.email = user.email;
        token.name = user.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = (token.name as string) ?? null;
      }
      return session;
    },
  },
});
