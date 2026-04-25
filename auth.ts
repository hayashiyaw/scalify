import { PrismaAdapter } from "@auth/prisma-adapter";
import { type User } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { User as NextAuthUser } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/db";

const authCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = authCredentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const validPassword = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!validPassword) {
          return null;
        }

        return toAuthUser(user);
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        const u = user as NextAuthUser;
        token.id = u.id;
        token.email = u.email ?? undefined;
        token.name = u.name;
        token.picture = u.image;
        token.emailVerified = u.emailVerified
          ? u.emailVerified.toISOString()
          : null;
      }
      if (trigger === "update" && session) {
        const s = session as {
          name?: string | null;
          email?: string;
          emailVerified?: Date | string | null;
          image?: string | null;
        };
        if (s.name !== undefined) token.name = s.name;
        if (s.email !== undefined) token.email = s.email;
        if (s.image !== undefined) token.picture = s.image;
        if ("emailVerified" in s) {
          if (s.emailVerified === null) {
            token.emailVerified = null;
          } else if (s.emailVerified instanceof Date) {
            token.emailVerified = s.emailVerified.toISOString();
          } else if (typeof s.emailVerified === "string") {
            token.emailVerified = s.emailVerified;
          }
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = String(token.id);
        if (token.email) {
          session.user.email = token.email;
        }
        session.user.name = token.name ?? null;
        session.user.image = token.picture ?? null;
        session.user.emailVerified = token.emailVerified
          ? new Date(token.emailVerified)
          : null;
      }
      return session;
    },
  },
});

function toAuthUser(user: User): NextAuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    emailVerified: user.emailVerified,
  };
}
