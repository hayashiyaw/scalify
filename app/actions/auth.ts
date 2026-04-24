"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      message: "This email is already in use.",
      success: false,
      fieldErrors: { email: ["This email is already in use."] },
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
