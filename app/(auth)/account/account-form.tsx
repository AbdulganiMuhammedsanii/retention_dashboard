"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  requestEmailCodeAction,
  verifyEmailCodeAction,
  setPasswordAndContinueAction,
  type AuthActionResult,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

type Step = "email" | "code" | "password";

export function AccountForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const [emailState, emailFormAction, emailPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(requestEmailCodeAction, null);
  const [codeState, codeFormAction, codePending] = useActionState<
    AuthActionResult | null,
    FormData
  >(verifyEmailCodeAction, null);
  const [pwState, pwFormAction, pwPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(setPasswordAndContinueAction, null);

  useEffect(() => {
    if (emailState?.ok && step === "email") {
      setStep("code");
      setCooldown(30);
    }
  }, [emailState, step]);

  useEffect(() => {
    if (codeState?.ok && step === "code") {
      setStep("password");
    }
  }, [codeState, step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      clearInterval(t);
    };
  }, [cooldown]);

  return (
    <Card className="w-full max-w-md border-[var(--border)] bg-[var(--panel)] text-[var(--text)] shadow-xl">
      <CardHeader className="space-y-6 pb-2">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <p className="text-sm text-[var(--text-muted)]">
            {step === "email"
              ? "First time signing in or resetting your password? We'll email you a one-time code."
              : step === "code"
                ? `Enter the code we sent to ${email}.`
                : "Set a password for your account. You'll use it to sign in next time."}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {step === "email" ? (
          <form action={emailFormAction} className="space-y-4">
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
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                disabled={emailPending}
                className="border-[var(--border)] bg-[var(--panel-elevated)]"
              />
            </div>
            {emailState?.ok === false ? (
              <p className="text-sm text-[var(--red)]" role="alert">
                {emailState.error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={emailPending}>
              {emailPending ? "Sending…" : "Send code"}
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
        ) : step === "code" ? (
          <div className="space-y-4">
            <form action={codeFormAction} className="space-y-4">
              <input type="hidden" name="email" value={email} />
              <div className="space-y-2">
                <Label htmlFor="token" className="text-[var(--text-muted)]">
                  One-time code
                </Label>
                <Input
                  id="token"
                  name="token"
                  inputMode="numeric"
                  pattern="\d{6,8}"
                  maxLength={8}
                  autoComplete="one-time-code"
                  required
                  placeholder="12345678"
                  disabled={codePending}
                  className="border-[var(--border)] bg-[var(--panel-elevated)] tracking-[0.4em] text-center"
                />
              </div>
              {codeState?.ok === false ? (
                <p className="text-sm text-[var(--red)]" role="alert">
                  {codeState.error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={codePending}>
                {codePending ? "Verifying…" : "Verify code"}
              </Button>
            </form>

            <form action={emailFormAction} className="space-y-2">
              <input type="hidden" name="email" value={email} />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={cooldown > 0 || emailPending}
              >
                {cooldown > 0
                  ? `Resend in ${String(cooldown)}s`
                  : emailPending
                    ? "Sending…"
                    : "Resend code"}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                }}
                className="text-xs text-[var(--text-muted)] underline-offset-4 hover:underline"
              >
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <form action={pwFormAction} className="space-y-4">
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
                disabled={pwPending}
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
                disabled={pwPending}
                className="border-[var(--border)] bg-[var(--panel-elevated)]"
              />
            </div>
            {pwState?.ok === false ? (
              <p className="text-sm text-[var(--red)]" role="alert">
                {pwState.error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pwPending}>
              {pwPending ? "Saving…" : "Set password and continue"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
