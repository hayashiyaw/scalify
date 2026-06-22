"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import { getTrustedClientIp } from "@/lib/auth/client-ip";
import {
  checkRateLimit,
  recordRateLimitAttempt,
  type RateLimitOptions,
} from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/db";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[0-9]/, "Password must include a number.")
    .regex(/[^a-zA-Z0-9]/, "Password must include a symbol."),
});

const SIGNUP_RATE_LIMIT: RateLimitOptions = {
  maxAttempts: 5,
  windowMs: 60 * 60 * 1000,
};

const SIGNUP_IP_RATE_LIMIT: RateLimitOptions = {
  maxAttempts: 20,
  windowMs: 60 * 60 * 1000,
};

const SIGNUP_GENERIC_ERROR =
  "Unable to create an account with these details. Try logging in or use a different email.";

const SIGNUP_RATE_LIMIT_MESSAGE =
  "Too many signup attempts. Please wait and try again later.";

function signupEmailRateLimitKey(email: string): string {
  return `signup:${email.toLowerCase()}`;
}

function signupIpRateLimitKey(ip: string): string {
  return `signup-ip:${ip}`;
}

export type SignupActionState = {
  message: string | null;
  success: boolean;
  fieldErrors: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
};

export async function signupAction(
  _state: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      message: "Please fix the highlighted fields.",
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = parsed.data.email.toLowerCase();
  const clientIp = await getTrustedClientIp();

  const emailRateLimit = checkRateLimit(
    signupEmailRateLimitKey(email),
    SIGNUP_RATE_LIMIT,
  );
  if (!emailRateLimit.allowed) {
    return {
      message: SIGNUP_RATE_LIMIT_MESSAGE,
      success: false,
      fieldErrors: {},
    };
  }

  if (clientIp) {
    const ipRateLimit = checkRateLimit(signupIpRateLimitKey(clientIp), SIGNUP_IP_RATE_LIMIT);
    if (!ipRateLimit.allowed) {
      return {
        message: SIGNUP_RATE_LIMIT_MESSAGE,
        success: false,
        fieldErrors: {},
      };
    }
  }

  recordRateLimitAttempt(signupEmailRateLimitKey(email), SIGNUP_RATE_LIMIT);
  if (clientIp) {
    recordRateLimitAttempt(signupIpRateLimitKey(clientIp), SIGNUP_IP_RATE_LIMIT);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      message: SIGNUP_GENERIC_ERROR,
      success: false,
      fieldErrors: {},
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        message: "Account created, but automatic login failed. Please log in.",
        success: false,
        fieldErrors: {},
      };
    }
    throw error;
  }

  return {
    message: "Account created. You are now logged in.",
    success: true,
    fieldErrors: {},
  };
}

export async function logoutAction() {
  await signOut({ redirect: false });
}
