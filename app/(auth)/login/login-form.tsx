"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

export function LoginForm({ urlError }: { urlError?: string }) {
  const [state, formAction, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signInAction, null);

  const error = state?.ok === false ? state.error : urlError;

  return (
    <Card className="w-full max-w-md border-[var(--border)] bg-[var(--panel)] text-[var(--text)] shadow-xl">
      <CardHeader className="space-y-6 pb-2">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <p className="text-sm text-[var(--text-muted)]">
            Sign in with your work email and password.
          </p>
        </div>
      </CardHeader>
      <CardContent>
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
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[var(--text-muted)]">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
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
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-4 flex flex-col items-center gap-1 text-center text-xs text-[var(--text-muted)]">
          <Link href="/account" className="underline-offset-4 hover:underline">
            First time signing in? Get an email code
          </Link>
          <Link href="/account" className="underline-offset-4 hover:underline">
            Forgot your password? Reset with email code
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
