import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { loginFn } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Agency OS" }] }),
  component: LoginPage,
});

const DEMO_ACCOUNTS = [
  { label: "Demo workspace · mock data", email: "qai@q.agency", password: "demo" },
  { label: "Production · live (soon)", email: "zlatko@q.agency", password: "password" },
];

function LoginPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await loginFn({ data: { email, password } });
      if (!res.ok) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
      await router.invalidate();
      await navigate({ to: "/" });
    } catch {
      setError("Something went wrong signing you in. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <span className="size-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Agency OS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mission control for agentic delivery</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@q.agency"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-status-error" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                Demo accounts
              </p>
              <div className="grid gap-2">
                {DEMO_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.email}
                    type="button"
                    onClick={() => {
                      setEmail(acct.email);
                      setPassword(acct.password);
                      setError(null);
                    }}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-white/5 px-3 py-2 text-left text-xs transition-colors hover:border-primary/40"
                  >
                    <span className="font-medium text-foreground">{acct.label}</span>
                    <span className="font-mono text-muted-foreground">{acct.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
