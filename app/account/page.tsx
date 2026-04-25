"use client";

import { Loader2 } from "lucide-react";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { useState, useTransition } from "react";

import {
  changePasswordAction,
  deleteAccountAction,
  updateEmailAction,
  updateProfileAction,
} from "@/app/actions/account";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="text-destructive text-xs font-medium" role="alert">
      {messages[0]}
    </p>
  );
}

function AccountSettingsForms({
  user,
  updateSession,
}: {
  user: NonNullable<Session["user"]>;
  updateSession: NonNullable<ReturnType<typeof useSession>["update"]>;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [newEmail, setNewEmail] = useState(user.email);
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");

  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("");

  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string[]>>({});

  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailFieldErrors, setEmailFieldErrors] = useState<Record<string, string[]>>({});

  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string[]>>({});

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFieldErrors, setDeleteFieldErrors] = useState<Record<string, string[]>>({});

  const [pendingProfile, startProfile] = useTransition();
  const [pendingEmail, startEmail] = useTransition();
  const [pendingPassword, startPassword] = useTransition();
  const [pendingDelete, startDelete] = useTransition();

  const emailVerified = user.emailVerified;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>Your display name appears where the app shows attribution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pendingProfile}
              autoComplete="name"
            />
            <FieldError messages={profileFieldErrors.name} />
          </div>
          {profileError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save profile</AlertTitle>
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          ) : null}
          {profileMessage ? (
            <Alert>
              <AlertTitle>Saved</AlertTitle>
              <AlertDescription>{profileMessage}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="button"
            disabled={pendingProfile}
            onClick={() => {
              setProfileError(null);
              setProfileFieldErrors({});
              setProfileMessage(null);
              startProfile(async () => {
                const res = await updateProfileAction({ name });
                if (!res.ok) {
                  setProfileError(res.error);
                  setProfileFieldErrors(res.fieldErrors ?? {});
                  return;
                }
                await updateSession({
                  name: res.data.sessionUpdate.name,
                  email: res.data.sessionUpdate.email,
                  emailVerified: res.data.sessionUpdate.emailVerified,
                  image: res.data.sessionUpdate.image,
                });
                setProfileMessage("Your profile was updated.");
              });
            }}
          >
            {pendingProfile ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save name
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email</CardTitle>
          <CardDescription>
            Changing your email clears verification until you confirm the new address. You must enter
            your current password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Status:{" "}
            {emailVerified ? (
              <span className="text-foreground font-medium">Verified</span>
            ) : (
              <span className="text-foreground font-medium">Not verified</span>
            )}
          </p>
          <div className="space-y-1">
            <Label htmlFor="account-new-email">New email</Label>
            <Input
              id="account-new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={pendingEmail}
              autoComplete="email"
            />
            <FieldError messages={emailFieldErrors.newEmail} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="account-email-password">Current password</Label>
            <Input
              id="account-email-password"
              type="password"
              value={emailCurrentPassword}
              onChange={(e) => setEmailCurrentPassword(e.target.value)}
              disabled={pendingEmail}
              autoComplete="current-password"
            />
            <FieldError messages={emailFieldErrors.currentPassword} />
          </div>
          {emailError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not update email</AlertTitle>
              <AlertDescription>{emailError}</AlertDescription>
            </Alert>
          ) : null}
          {emailMessage ? (
            <Alert>
              <AlertTitle>Email updated</AlertTitle>
              <AlertDescription>{emailMessage}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="button"
            disabled={pendingEmail}
            onClick={() => {
              setEmailError(null);
              setEmailFieldErrors({});
              setEmailMessage(null);
              startEmail(async () => {
                const res = await updateEmailAction({
                  newEmail,
                  currentPassword: emailCurrentPassword,
                });
                if (!res.ok) {
                  setEmailError(res.error);
                  setEmailFieldErrors(res.fieldErrors ?? {});
                  return;
                }
                await updateSession({
                  name: res.data.sessionUpdate.name,
                  email: res.data.sessionUpdate.email,
                  emailVerified: res.data.sessionUpdate.emailVerified,
                  image: res.data.sessionUpdate.image,
                });
                setEmailCurrentPassword("");
                setEmailMessage(
                  "Your email was updated. Verification has been reset for the new address.",
                );
              });
            }}
          >
            {pendingEmail ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Update email
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Password</CardTitle>
          <CardDescription>
            Use at least 8 characters with upper and lower case letters, a number, and a symbol.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="account-pw-current">Current password</Label>
            <Input
              id="account-pw-current"
              type="password"
              value={passwordCurrent}
              onChange={(e) => setPasswordCurrent(e.target.value)}
              disabled={pendingPassword}
              autoComplete="current-password"
            />
            <FieldError messages={passwordFieldErrors.currentPassword} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="account-pw-new">New password</Label>
            <Input
              id="account-pw-new"
              type="password"
              value={passwordNew}
              onChange={(e) => setPasswordNew(e.target.value)}
              disabled={pendingPassword}
              autoComplete="new-password"
            />
            <FieldError messages={passwordFieldErrors.newPassword} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="account-pw-confirm">Confirm new password</Label>
            <Input
              id="account-pw-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              disabled={pendingPassword}
              autoComplete="new-password"
            />
          </div>
          {passwordError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not change password</AlertTitle>
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          ) : null}
          {passwordMessage ? (
            <Alert>
              <AlertTitle>Password updated</AlertTitle>
              <AlertDescription>{passwordMessage}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="button"
            disabled={pendingPassword}
            onClick={() => {
              setPasswordError(null);
              setPasswordFieldErrors({});
              setPasswordMessage(null);
              if (passwordNew !== passwordConfirm) {
                setPasswordError("New password and confirmation do not match.");
                return;
              }
              startPassword(async () => {
                const res = await changePasswordAction({
                  currentPassword: passwordCurrent,
                  newPassword: passwordNew,
                });
                if (!res.ok) {
                  setPasswordError(res.error);
                  setPasswordFieldErrors(res.fieldErrors ?? {});
                  return;
                }
                setPasswordCurrent("");
                setPasswordNew("");
                setPasswordConfirm("");
                setPasswordMessage("Your password was changed.");
              });
            }}
          >
            {pendingPassword ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Change password
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Delete account</CardTitle>
          <CardDescription>
            This permanently deletes your account. Teams you own are removed. Memberships in teams
            owned by others are dropped. Scheduling on the home page without an account is
            unchanged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="account-del-pw">Current password</Label>
            <Input
              id="account-del-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={pendingDelete}
              autoComplete="current-password"
            />
            <FieldError messages={deleteFieldErrors.currentPassword} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="account-del-email">Type your account email to confirm</Label>
            <Input
              id="account-del-email"
              type="email"
              value={deleteEmailConfirm}
              onChange={(e) => setDeleteEmailConfirm(e.target.value)}
              disabled={pendingDelete}
              autoComplete="off"
            />
            <FieldError messages={deleteFieldErrors.confirmEmail} />
          </div>
          {deleteError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not delete account</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            disabled={pendingDelete}
            onClick={() => {
              setDeleteError(null);
              setDeleteFieldErrors({});
              startDelete(async () => {
                const res = await deleteAccountAction({
                  currentPassword: deletePassword,
                  confirmEmail: deleteEmailConfirm,
                });
                if (!res.ok) {
                  setDeleteError(res.error);
                  setDeleteFieldErrors(res.fieldErrors ?? {});
                  return;
                }
                await signOut({ redirectTo: "/" });
              });
            }}
          >
            {pendingDelete ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Delete my account
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export default function AccountPage() {
  const { data: session, status, update } = useSession();
  const user = session?.user;

  const sessionKey = user
    ? [
        user.id,
        user.email,
        user.name ?? "",
        user.emailVerified == null ? "nv" : user.emailVerified.valueOf(),
      ].join(":")
    : null;

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 md:px-6">
        <header className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">User data management</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Update your profile, sign-in email, and password. Delete your account removes teams you
            own and leaves other teams.
          </p>
        </header>

        {status === "loading" ? (
          <p className="text-muted-foreground text-sm">Loading session…</p>
        ) : null}

        {user && sessionKey ? (
          <AccountSettingsForms key={sessionKey} user={user} updateSession={update} />
        ) : null}
      </div>
    </div>
  );
}
