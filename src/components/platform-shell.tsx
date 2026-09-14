import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, Boxes, ShieldCheck, Receipt, ArrowLeft, Users } from "lucide-react";
import { PayflowMark } from "@/components/brand";
import { StatusPill } from "@/components/payflow-ui";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Platform",
    items: [
      { to: "/platform", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/platform/products", label: "Products", icon: Boxes },
      { to: "/platform/access", label: "Product Access", icon: ShieldCheck },
      { to: "/platform/people", label: "People", icon: Users },
    ],
  },
] as const;

/**
 * Lightweight shell for the Platform Super Admin area. Deliberately separate
 * from the PayFlow operational shell, but reuses the same visual language.
 */
export function PlatformShell({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-surface">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-[68px] items-center gap-2.5 px-4">
          <PayflowMark className="size-8" />
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-sidebar-foreground">Platform</p>
            <p className="text-[11px] text-sidebar-muted">Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-2.5 pb-2 text-[10px] font-semibold tracking-[0.1em] text-sidebar-muted uppercase">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    "exact" in item && item.exact
                      ? location.pathname === item.to
                      : location.pathname.startsWith(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-[13px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                          active &&
                            "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon className="size-[17px] shrink-0 opacity-80" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div>
            <p className="px-2.5 pb-2 text-[10px] font-semibold tracking-[0.1em] text-sidebar-muted uppercase">
              Future
            </p>
            <div
              aria-disabled="true"
              title="Coming soon"
              className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-sidebar-muted/60"
            >
              <Receipt className="size-[17px] shrink-0 opacity-60" />
              <span className="flex-1">Billing &amp; Invoices</span>
              <span className="rounded-full border border-sidebar-border px-1.5 py-px text-[9.5px] text-sidebar-muted">
                Soon
              </span>
            </div>
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/products"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
          >
            <ArrowLeft className="size-4" />
            Product selection
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-border/80 bg-background/90 px-5 shadow-subtle backdrop-blur-xl lg:px-9">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <PayflowMark className="size-8" />
            </div>
            <p className="text-[12px] text-muted-foreground">
              Platform administration ·{" "}
              <span className="font-medium text-foreground">product entitlement only</span>
            </p>
          </div>
          <StatusPill tone="info" dot>
            Platform Super Admin
          </StatusPill>
        </header>

        <nav className="flex gap-1.5 border-b border-border/70 bg-background px-5 py-2 lg:hidden">
          {groups[0].items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="relative flex-1 px-5 py-7 lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
