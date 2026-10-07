import type { ErrorComponentProps } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { RoleProvider } from "../lib/role-context";
import { UsersProvider } from "../lib/users-context";
import { RulesProvider } from "../lib/rules-context";
import { ReviewsProvider } from "../lib/reviews-context";
import { StrategyProvider } from "../lib/strategy-context";
import { PlatformProvider } from "../lib/platform-context";
import { AppShell } from "../components/app-shell";
import { isSignedIn } from "../lib/session";
import { reportLovableError } from "../lib/lovable-error-reporting";

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

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PayFlow — AI Collections Operations Platform" },
      {
        name: "description",
        content:
          "PayFlow manages collections operations for multiple clients, their customer accounts and collection cases.",
      },
      { name: "author", content: "PayFlow" },
      { property: "og:title", content: "PayFlow — AI Collections Operations Platform" },
      {
        property: "og:description",
        content: "Collections operations for clients, customer accounts and collection cases.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    // After a new version is published, old page chunks disappear. Reload once
    // to pick up the latest files instead of showing a blank screen.
    const onChunkError = (e: Event) => {
      e.preventDefault();
      const key = "payflow.chunk-reload";
      if (window.sessionStorage.getItem(key) === window.location.pathname) return;
      window.sessionStorage.setItem(key, window.location.pathname);
      window.location.reload();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (String(e.reason?.message ?? e.reason).includes("dynamically imported module")) onChunkError(e);
    };
    window.addEventListener("vite:preloadError", onChunkError);
    window.addEventListener("unhandledrejection", onRejection);
    const clear = setTimeout(() => window.sessionStorage.removeItem("payflow.chunk-reload"), 10000);
    return () => {
      window.removeEventListener("vite:preloadError", onChunkError);
      window.removeEventListener("unhandledrejection", onRejection);
      clearTimeout(clear);
    };
  }, []);
  useEffect(() => {
    const preference = window.localStorage.getItem("payflow.theme");
    const dark =
      preference === "dark" ||
      (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <PlatformProvider>
          <UsersProvider>
            <RoleProvider>
              <RulesProvider>
                <ReviewsProvider>
                  <StrategyProvider>{children}</StrategyProvider>
                </ReviewsProvider>
              </RulesProvider>
            </RoleProvider>
          </UsersProvider>
          </PlatformProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

function SessionGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!isSignedIn()) navigate({ to: "/login", replace: true });
  }, [navigate]);
  if (!mounted) return <div className="min-h-screen bg-surface" />;
  if (!isSignedIn()) return <div className="min-h-screen bg-surface" />;
  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // The customer-facing payment experience and the sign-in screen are
  // standalone surfaces: they render without the internal application shell.
  const isBareSurface = useRouterState({
    select: (s) =>
      s.location.pathname.startsWith("/pay/") ||
      s.location.pathname.startsWith("/login") ||
      s.location.pathname.startsWith("/activate"),
  });

  // Platform administration and product selection sit above PayFlow: they are
  // authenticated, but render their own shell instead of the PayFlow shell.
  const isPlatformSurface = useRouterState({
    select: (s) =>
      s.location.pathname.startsWith("/platform") || s.location.pathname.startsWith("/products"),
  });

  if (isBareSurface) {
    return <Outlet />;
  }

  if (isPlatformSurface) {
    return (
      <SessionGate>
        <Outlet />
      </SessionGate>
    );
  }

  return (
    <SessionGate>
      <AppShell>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </AppShell>
    </SessionGate>
  );
}
