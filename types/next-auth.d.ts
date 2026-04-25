import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    emailVerified?: Date | null;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      email: string;
      emailVerified: Date | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string | null;
    picture?: string | null;
    emailVerified?: string | null;
  }
}
