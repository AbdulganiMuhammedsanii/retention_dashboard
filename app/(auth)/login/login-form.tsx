"use client";

import { useEffect, useState } from "react";
import { loginEmailSchema } from "@/lib/schemas/forms";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

function magicLinkRedirectTo(): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin.replace(/\/$/, "");
  return `${origin}/api/auth/callback?next=/dashboard`;
}

export function LoginForm({ urlError }: { urlError?: string }) {
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(urlError);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setFormError(urlError);
  }, [urlError]);

  useEffect(() => {
    if (showSuccess) {
      setCooldown(30);
    }
  }, [showSuccess]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      clearInterval(t);
    };
  }, [cooldown]);

  async function requestMagicLink(email: string) {
    setPending(true);
    setFormError(undefined);

    const parsed = loginEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setPending(false);
      setFormError(parsed.error.flatten().fieldErrors.email?.[0] ?? "Invalid email");
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data.email,
        options: {
          emailRedirectTo: magicLinkRedirectTo(),
        },
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      setResendEmail(parsed.data.email);
      setSuccessMessage(
        "Check your email for the sign-in link. Open it in this browser when possible. If the link says it expired immediately, your mail provider may have scanned it once—use Resend below."
      );
      setShowSuccess(true);
    } catch {
      setFormError("Server is missing Supabase configuration.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-[var(--border)] bg-[var(--panel)] text-[var(--text)] shadow-xl">
      <CardHeader className="space-y-6 pb-2">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <p className="text-sm text-[var(--text-muted)]">
            Sign in with a one-time magic link sent to your email.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {showSuccess ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-[var(--text)]">{successMessage}</p>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void requestMagicLink(resendEmail);
              }}
            >
              <input type="hidden" name="email" value={resendEmail} />
              <Button
                type="submit"
                disabled={cooldown > 0 || pending}
                className="w-full"
              >
                {cooldown > 0 ? `Resend in ${String(cooldown)}s` : "Resend link"}
              </Button>
            </form>
            <p className="text-xs text-[var(--text-faint)]">
              Check spam if you do not see the message within a minute.
            </p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const raw = fd.get("email");
              const email = typeof raw === "string" ? raw : "";
              void requestMagicLink(email);
            }}
          >
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
            {formError ? (
              <p className="text-sm text-[var(--red)]" role="alert">
                {formError}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
