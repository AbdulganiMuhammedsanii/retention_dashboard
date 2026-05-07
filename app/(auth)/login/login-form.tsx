"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type AuthActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

type Mode = "signin" | "signup";

export function LoginForm({ urlError }: { urlError?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(action, null);

  const error = state?.ok === false ? state.error : urlError;

  const isSignIn = mode === "signin";

  return (
    <Card className="w-full max-w-md border-[var(--border)] bg-[var(--panel)] text-[var(--text)] shadow-xl">
      <CardHeader className="space-y-6 pb-2">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <p className="text-sm text-[var(--text-muted)]">
            {isSignIn
              ? "Sign in with your work email and password."
              : "Create your account. Your email must be on the invite list."}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form key={mode} action={formAction} className="space-y-4">
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[var(--text-muted)]">
                Password
              </Label>
              {isSignIn ? (
                <Link
                  href="/forgot-password"
                  className="text-xs text-[var(--text-muted)] underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              ) : null}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignIn ? "current-password" : "new-password"}
              required
              minLength={8}
              disabled={pending}
              className="border-[var(--border)] bg-[var(--panel-elevated)]"
            />
            {!isSignIn ? (
              <p className="text-xs text-[var(--text-faint)]">At least 8 characters.</p>
            ) : null}
          </div>
          {error ? (
            <p className="text-sm text-[var(--red)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? isSignIn
                ? "Signing in…"
                : "Creating account…"
              : isSignIn
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(isSignIn ? "signup" : "signin");
            }}
            className="text-xs text-[var(--text-muted)] underline-offset-4 hover:underline"
            disabled={pending}
          >
            {isSignIn
              ? "First time here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
