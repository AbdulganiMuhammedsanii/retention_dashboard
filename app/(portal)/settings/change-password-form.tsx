"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, type AuthActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(changePasswordAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="border-[var(--border)] bg-[var(--panel-elevated)]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="border-[var(--border)] bg-[var(--panel-elevated)]"
        />
        <p className="text-xs text-[var(--text-faint)]">At least 8 characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="border-[var(--border)] bg-[var(--panel-elevated)]"
        />
      </div>
      {state?.ok === false ? (
        <p className="text-sm text-[var(--red)]" role="alert">
          {state.error}
        </p>
      ) : state?.ok === true ? (
        <p className="text-sm" style={{ color: "var(--green)" }} role="status">
          {state.message ?? "Password updated."}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
