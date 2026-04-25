import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  avatarObjectKeyBelongsToUser,
  createS3ObjectStorageFromProcess,
  isWellFormedAvatarObjectKey,
  objectKeyFromPublicUrl,
} from "@/lib/storage";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(120, "Name is too long.");

const updateProfileSchema = z.object({
  name: nameSchema,
});

const updateEmailSchema = z.object({
  newEmail: z.string().trim().email("Enter a valid email address."),
  currentPassword: z.string().min(1, "Current password is required."),
});

const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^a-zA-Z0-9]/, "Password must include a symbol.");

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: newPasswordSchema,
});

const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  confirmEmail: z.string().trim().min(1, "Type your account email to confirm."),
});

const presignAvatarSchema = z.object({
  contentType: z.string().trim().min(1, "Avatar content type is required."),
  contentLength: z
    .number()
    .finite("Avatar size must be a number.")
    .positive("Avatar size must be positive."),
});

const finalizeAvatarSchema = z.object({
  objectKey: z
    .string()
    .trim()
    .min(1, "Avatar object key is required.")
    .refine((v) => isWellFormedAvatarObjectKey(v), "Avatar object key is invalid."),
});

export class UnauthorizedAccountError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "UnauthorizedAccountError";
  }
}

export class AccountWrongPasswordError extends Error {
  constructor() {
    super("That password does not match your account.");
    this.name = "AccountWrongPasswordError";
  }
}

export class AccountEmailTakenError extends Error {
  constructor() {
    super("That email is already used by another account.");
    this.name = "AccountEmailTakenError";
  }
}

export class AccountNoPasswordError extends Error {
  constructor() {
    super("This account does not have a password set.");
    this.name = "AccountNoPasswordError";
  }
}

export class AccountEmailConfirmMismatchError extends Error {
  constructor() {
    super("The confirmation email must match your account email exactly.");
    this.name = "AccountEmailConfirmMismatchError";
  }
}

export class AccountStorageUnavailableError extends Error {
  constructor() {
    super("Avatar uploads are not configured right now.");
    this.name = "AccountStorageUnavailableError";
  }
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    throw new UnauthorizedAccountError();
  }
  return id;
}

async function verifyPassword(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    throw new AccountNoPasswordError();
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AccountWrongPasswordError();
  }
}

export type AccountSessionPatch = {
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
};

function toAccountSessionPatch(input: {
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
}): AccountSessionPatch {
  return {
    name: input.name,
    email: input.email,
    emailVerified: input.emailVerified,
    image: input.image,
  };
}

function tryCreateStorage() {
  try {
    return createS3ObjectStorageFromProcess();
  } catch {
    return null;
  }
}

async function bestEffortDeleteAvatarByPublicUrl(imageUrl: string | null): Promise<void> {
  if (!imageUrl) return;
  const storage = tryCreateStorage();
  if (!storage) return;
  const objectKey = objectKeyFromPublicUrl(process.env.S3_PUBLIC_URL_BASE ?? "", imageUrl);
  if (!objectKey || !isWellFormedAvatarObjectKey(objectKey)) return;
  try {
    await storage.deleteObject(objectKey);
  } catch {
    // Best-effort cleanup should not block account flows.
  }
}

export async function updateProfileForCurrentUser(
  raw: unknown,
): Promise<AccountSessionPatch> {
  const userId = await requireUserId();
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    throw parsed.error;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name },
    select: { name: true, email: true, emailVerified: true, image: true },
  });

  return {
    ...toAccountSessionPatch(updated),
  };
}

export async function updateEmailForCurrentUser(
  raw: unknown,
): Promise<AccountSessionPatch> {
  const userId = await requireUserId();
  const parsed = updateEmailSchema.safeParse(raw);
  if (!parsed.success) {
    throw parsed.error;
  }

  await verifyPassword(userId, parsed.data.currentPassword);

  const normalized = parsed.data.newEmail.toLowerCase();

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, emailVerified: true, image: true },
  });
  if (!current) {
    throw new UnauthorizedAccountError();
  }

  if (current.email.toLowerCase() === normalized) {
    return {
      ...toAccountSessionPatch(current),
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (existing && existing.id !== userId) {
    throw new AccountEmailTakenError();
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      email: normalized,
      emailVerified: null,
    },
    select: { name: true, email: true, emailVerified: true, image: true },
  });

  return {
    ...toAccountSessionPatch(updated),
  };
}

export async function presignAvatarUploadForCurrentUser(raw: unknown): Promise<{
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}> {
  const userId = await requireUserId();
  const parsed = presignAvatarSchema.safeParse(raw);
  if (!parsed.success) {
    throw parsed.error;
  }
  const storage = tryCreateStorage();
  if (!storage) {
    throw new AccountStorageUnavailableError();
  }
  return storage.presignPutAvatar({
    userId,
    contentType: parsed.data.contentType,
    contentLength: parsed.data.contentLength,
  });
}

export async function finalizeAvatarUploadForCurrentUser(
  raw: unknown,
): Promise<AccountSessionPatch> {
  const userId = await requireUserId();
  const parsed = finalizeAvatarSchema.safeParse(raw);
  if (!parsed.success) {
    throw parsed.error;
  }
  if (!avatarObjectKeyBelongsToUser(parsed.data.objectKey, userId)) {
    throw new UnauthorizedAccountError();
  }
  const storage = tryCreateStorage();
  if (!storage) {
    throw new AccountStorageUnavailableError();
  }
  const newImageUrl = storage.getPublicUrlForKey(parsed.data.objectKey);
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, emailVerified: true, image: true },
  });
  if (!current) {
    throw new UnauthorizedAccountError();
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { image: newImageUrl },
    select: { name: true, email: true, emailVerified: true, image: true },
  });

  if (current.image && current.image !== newImageUrl) {
    await bestEffortDeleteAvatarByPublicUrl(current.image);
  }

  return toAccountSessionPatch(updated);
}

export async function changePasswordForCurrentUser(raw: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    throw parsed.error;
  }

  await verifyPassword(userId, parsed.data.currentPassword);

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function deleteAccountForCurrentUser(raw: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = deleteAccountSchema.safeParse(raw);
  if (!parsed.success) {
    throw parsed.error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, image: true },
  });
  if (!user) {
    throw new UnauthorizedAccountError();
  }

  await verifyPassword(userId, parsed.data.currentPassword);

  const typed = parsed.data.confirmEmail.trim().toLowerCase();
  if (typed !== user.email.toLowerCase()) {
    throw new AccountEmailConfirmMismatchError();
  }

  await bestEffortDeleteAvatarByPublicUrl(user.image);
  await prisma.user.delete({ where: { id: userId } });
}
