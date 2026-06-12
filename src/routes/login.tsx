import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, type CSSProperties, type FormEvent } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  AlertCircle,
  Activity,
  ShieldCheck,
  GitBranch,
  MonitorPlay,
} from "lucide-react";
import { toast } from "sonner";

import { loginFn } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Agency OS" }] }),
  component: LoginPage,
});

const HIGHLIGHTS = [
  { icon: Activity, title: "Live agent telemetry", desc: "Traces, tokens, and latency in real time." },
  { icon: ShieldCheck, title: "Human-in-the-loop gates", desc: "Approve specs, designs, and releases." },
  { icon: GitBranch, title: "End-to-end traceability", desc: "From spec to shipped — fully audited." },
];

// The brand panel is an intentional dark showcase in BOTH themes (dark navy
// gradient + glow + grid). Lock its theme tokens to the dark-mode values so
// its theme-aware text (text-foreground / text-muted-foreground) stays light
// even when the app runs in light mode — otherwise the foreground flips dark
// and disappears against the dark background.
const DARK_PANEL_VARS = {
  "--foreground": "#e6e8ef",
  "--muted-foreground": "#9aa0b4",
  "--primary": "#6c63ff",
} as CSSProperties;

// One-click demo entry (for pitches / drive-by prospects): sign straight into
// the sample-data account so nobody has to type credentials in front of an
// audience. These ARE the public demo creds (users.server.ts) — the demo
// account is "standard" (sample pods only), and Settings → Experience can
// still flip the browser to Live afterwards. Not a secret; the login form
// already accepts the same email+password by hand.
const DEMO_CREDENTIALS = { email: "qai@q.agency", password: "demo" } as const;

function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-lg border border-primary/40 bg-primary/20 font-mono font-bold text-primary",
        className,
      )}
    >
      AI
    </div>
  );
}

function LoginPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const busy = submitting || demoLoading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
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

  async function enterDemo() {
    if (busy) return;
    setDemoLoading(true);
    setError(null);
    try {
      const res = await loginFn({ data: { ...DEMO_CREDENTIALS } });
      if (!res.ok) {
        // Should never happen (creds are hardcoded-correct) — surface it anyway.
        setError(res.error);
        setDemoLoading(false);
        return;
      }
      await router.invalidate();
      await navigate({ to: "/" });
    } catch {
      setError("Couldn't start the demo. Please try again.");
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* ── Brand panel (desktop only) ──────────────────────────────── */}
      <aside
        style={DARK_PANEL_VARS}
        className="relative hidden overflow-hidden bg-gradient-to-br from-[#141a35] via-[#0e1020] to-[#0a0a12] text-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 right-0 size-96 rounded-full bg-[#3b82f6]/10 blur-[120px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(120% 100% at 0% 0%, black, transparent 70%)",
            WebkitMaskImage: "radial-gradient(120% 100% at 0% 0%, black, transparent 70%)",
          }}
        />

        <div className="relative flex items-center gap-3">
          <BrandMark className="size-10 text-sm" />
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight">Agency OS</div>
            <div className="font-mono text-[11px] text-muted-foreground">v0.4.2</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground xl:text-4xl">
            Mission control for your agentic software pipeline.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Plan, observe, and govern autonomous delivery agents — from spec to ship — in one
            operational pane.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <li key={h.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-foreground">{h.title}</div>
                    <div className="text-xs text-muted-foreground">{h.desc}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative">
          <div className="accent-line mb-5 w-full" />
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-full bg-status-done dot-pulse" />
              All systems operational
            </div>
            <span className="font-mono text-muted-foreground">© 2026 Q Agency</span>
          </div>
        </div>
      </aside>

      {/* ── Sign-in form ────────────────────────────────────────────── */}
      <main className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="anim-in w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <BrandMark className="size-9 text-xs" />
            <span className="text-lg font-semibold tracking-tight">Agency OS</span>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Welcome back</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to your workspace to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@q.agency"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!error}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() =>
                      toast("Need help signing in?", {
                        description:
                          "Contact your workspace administrator to reset your password.",
                      })
                    }
                    className="text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9 pr-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!error}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-md border border-status-error/30 bg-status-error/10 px-3 py-2 text-sm text-status-error"
                >
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo entry — no credentials needed, drops straight into the
                sample-data workspace. Secondary by design so it never competes
                with a real sign-in. */}
            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={enterDemo}
              disabled={busy}
            >
              {demoLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting demo…
                </>
              ) : (
                <>
                  <MonitorPlay className="size-4" />
                  Explore the demo
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              No account needed · sample-data workspace
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected workspace · access is monitored and audited.
          </p>
        </div>
      </main>
    </div>
  );
}
