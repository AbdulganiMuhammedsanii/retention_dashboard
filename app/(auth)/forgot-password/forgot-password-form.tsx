"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type AuthActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(forgotPasswordAction, null);

  const sent = state?.ok === true;
  const error = state?.ok === false ? state.error : undefined;

  return (
    <Card className="w-full max-w-md border-[var(--border)] bg-[var(--panel)] text-[var(--text)] shadow-xl">
      <CardHeader className="space-y-6 pb-2">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <p className="text-sm text-[var(--text-muted)]">
            Enter your work email. If it&apos;s on the invite list, we&apos;ll send a
            reset link.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-[var(--text)]">{state.message}</p>
            <p className="text-xs text-[var(--text-faint)]">
              Open the link in this same browser. Some corporate inboxes scan links and
              can invalidate them — if that happens, request another.
            </p>
            <Link
              href="/login"
              className="inline-block text-xs text-[var(--text-muted)] underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--text-muted)]">
                Work email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
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
              {pending ? "Sending…" : "Send reset link"}
            </Button>
            <div className="text-center">
              <Link
                href="/login"
                className="text-xs text-[var(--text-muted)] underline-offset-4 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
