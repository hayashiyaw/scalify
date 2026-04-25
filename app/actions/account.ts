"use server";

import { ZodError } from "zod";

import {
  AccountStorageUnavailableError,
  AccountEmailConfirmMismatchError,
  AccountEmailTakenError,
  AccountNoPasswordError,
  AccountWrongPasswordError,
  type AccountSessionPatch,
  UnauthorizedAccountError,
  changePasswordForCurrentUser,
  deleteAccountForCurrentUser,
  finalizeAvatarUploadForCurrentUser,
  presignAvatarUploadForCurrentUser,
  updateEmailForCurrentUser,
  updateProfileForCurrentUser,
} from "@/lib/account/service";
import { AvatarValidationError } from "@/lib/storage";

type AccountActionError = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
};

type AccountActionSuccess<T> = {
  ok: true;
  data: T;
};

function toAccountActionError(error: unknown): AccountActionError {
  if (error instanceof ZodError) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  if (error instanceof UnauthorizedAccountError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof AccountWrongPasswordError) {
    return {
      ok: false,
      error: error.message,
      fieldErrors: { currentPassword: [error.message] },
    };
  }
  if (error instanceof AccountEmailTakenError) {
    return {
      ok: false,
      error: error.message,
      fieldErrors: { newEmail: [error.message] },
    };
  }
  if (error instanceof AccountNoPasswordError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof AccountEmailConfirmMismatchError) {
    return {
      ok: false,
      error: error.message,
      fieldErrors: { confirmEmail: [error.message] },
    };
  }
  if (error instanceof AvatarValidationError || error instanceof AccountStorageUnavailableError) {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: "Something went wrong. Try again." };
}

export async function updateProfileAction(raw: unknown): Promise<
  AccountActionSuccess<{ sessionUpdate: AccountSessionPatch }> | AccountActionError
> {
  try {
    const patch = await updateProfileForCurrentUser(raw);
    return { ok: true, data: { sessionUpdate: patch } };
  } catch (error) {
    return toAccountActionError(error);
  }
}

export async function updateEmailAction(raw: unknown): Promise<
  AccountActionSuccess<{ sessionUpdate: AccountSessionPatch }> | AccountActionError
> {
  try {
    const patch = await updateEmailForCurrentUser(raw);
    return { ok: true, data: { sessionUpdate: patch } };
  } catch (error) {
    return toAccountActionError(error);
  }
}

export async function changePasswordAction(
  raw: unknown,
): Promise<{ ok: true } | AccountActionError> {
  try {
    await changePasswordForCurrentUser(raw);
    return { ok: true };
  } catch (error) {
    return toAccountActionError(error);
  }
}

export async function deleteAccountAction(
  raw: unknown,
): Promise<AccountActionSuccess<{ deleted: true }> | AccountActionError> {
  try {
    await deleteAccountForCurrentUser(raw);
    return { ok: true, data: { deleted: true } };
  } catch (error) {
    return toAccountActionError(error);
  }
}

export async function presignAvatarUploadAction(raw: unknown): Promise<
  | AccountActionSuccess<{
      uploadUrl: string;
      objectKey: string;
      expiresInSeconds: number;
    }>
  | AccountActionError
> {
  try {
    const data = await presignAvatarUploadForCurrentUser(raw);
    return { ok: true, data };
  } catch (error) {
    return toAccountActionError(error);
  }
}

export async function finalizeAvatarUploadAction(raw: unknown): Promise<
  AccountActionSuccess<{ sessionUpdate: AccountSessionPatch }> | AccountActionError
> {
  try {
    const patch = await finalizeAvatarUploadForCurrentUser(raw);
    return { ok: true, data: { sessionUpdate: patch } };
  } catch (error) {
    return toAccountActionError(error);
  }
}
