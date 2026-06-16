import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  redirect,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { captureError } from "../lib/error-reporting";
import { fetchUser } from "../lib/auth/auth";
import { AppShell } from "../components/shell/AppShell";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    captureError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    // /share/$token is account-less (the token IS the auth) and /pitch is
    // the client-clean product brief: no login redirect, and a null user
    // keeps the AppShell off the client-clean sheet (RootComponent renders
    // a bare <Outlet /> when user is null).
    if (
      location.pathname.startsWith("/share/") ||
      location.pathname === "/pitch" ||
      location.pathname.startsWith("/pitch/")
    ) {
      return { user: null };
    }
    const user = await fetchUser();
    const onLoginPage = location.pathname === "/login";
    if (!user && !onLoginPage) {
      throw redirect({ to: "/login" });
    }
    if (user && onLoginPage) {
      throw redirect({ to: "/" });
    }
    return { user };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AI PodOps · Overview" },
      {
        name: "description",
        content: "AI AI PodOps - mission control for an agentic software pipeline.",
      },
      { property: "og:title", content: "AI PodOps · Overview" },
      { name: "twitter:title", content: "AI PodOps · Overview" },
      {
        property: "og:description",
        content: "AI AI PodOps - mission control for an agentic software pipeline.",
      },
      {
        name: "twitter:description",
        content: "AI AI PodOps - mission control for an agentic software pipeline.",
      },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "icon", href: "/logo.svg", type: "image/svg+xml" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // suppressHydrationWarning on <html>: the anti-flash <head> script
  // intentionally sets <html class="light"> before hydration, so the server
  // (no class) and client (class) differ on this element by design.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply the theme BEFORE first paint. The app defaults to
            LIGHT - the SSR HTML ships dark (no `light` class), so this blocking
            script adds `light` during head parse UNLESS the user explicitly
            saved "dark", avoiding a flash on first load.
            KEY/class/default must match src/hooks/useTheme.tsx ("am.theme"). */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("am.theme")!=="dark")document.documentElement.classList.add("light")}catch(e){}',
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, user } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {user ? (
        <AppShell user={user}>
          <Outlet />
        </AppShell>
      ) : (
        <Outlet />
      )}
      <Toaster />
    </QueryClientProvider>
  );
}
