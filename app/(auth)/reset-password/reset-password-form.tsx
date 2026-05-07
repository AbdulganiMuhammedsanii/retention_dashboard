"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

export function ResetPasswordForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(resetPasswordAction, null);

  const error = state?.ok === false ? state.error : undefined;

  return (
    <Card className="w-full max-w-md border-[var(--border)] bg-[var(--panel)] text-[var(--text)] shadow-xl">
      <CardHeader className="space-y-6 pb-2">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <p className="text-sm text-[var(--text-muted)]">
            Set a new password for <strong>{email}</strong>.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-[var(--text-muted)]">
              New password
            </Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={pending}
              className="border-[var(--border)] bg-[var(--panel-elevated)]"
            />
            <p className="text-xs text-[var(--text-faint)]">At least 8 characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-[var(--text-muted)]">
              Confirm new password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={pending}
              className="border-[var(--border)] bg-[var(--panel-elevated)]"
            />
          </div>
          {error ? (
            <p className="text-sm text-[var(--red)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Set new password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
