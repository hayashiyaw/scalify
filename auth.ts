import { PrismaAdapter } from "@auth/prisma-adapter";
import { type User } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { User as NextAuthUser } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  recordRateLimitAttempt,
  type RateLimitOptions,
} from "@/lib/auth/rate-limit";

const authCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LOGIN_RATE_LIMIT: RateLimitOptions = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
};

function loginRateLimitKey(email: string): string {
  return `login:${email.toLowerCase()}`;
}

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

        const email = parsed.data.email.toLowerCase();
        const rateLimit = checkRateLimit(loginRateLimitKey(email), LOGIN_RATE_LIMIT);
        if (!rateLimit.allowed) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.passwordHash) {
          recordRateLimitAttempt(loginRateLimitKey(email), LOGIN_RATE_LIMIT);
          return null;
        }

        const validPassword = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!validPassword) {
          recordRateLimitAttempt(loginRateLimitKey(email), LOGIN_RATE_LIMIT);
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
    jwt: async ({ token, user, trigger }) => {
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
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
        });
        if (!dbUser) {
          return token;
        }
        token.name = dbUser.name;
        token.email = dbUser.email ?? undefined;
        token.picture = dbUser.image;
        token.emailVerified = dbUser.emailVerified
          ? dbUser.emailVerified.toISOString()
          : null;
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
