import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Route as RouteIcon,
  Scale,
  UserCheck,
  Users,
} from "lucide-react";
import { PayflowMark, PayflowWordmark } from "@/components/brand";
import { PageHeader, StatusPill } from "@/components/payflow-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/showcase")({
  head: () => ({
    meta: [
      { title: "Navigation Showcase — PayFlow" },
      { name: "description", content: "Expanded and slim PayFlow navigation states." },
      { property: "og:title", content: "Navigation Showcase — PayFlow" },
      { property: "og:description", content: "Expanded and slim PayFlow navigation states." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Showcase,
});

const groups = [
  { label: "Overview", items: [{ label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Operations",
    items: [
      { label: "Clients", icon: Building2 },
      { label: "Accounts / Cases", icon: FolderKanban },
      { label: "Human Review", icon: UserCheck },
    ],
  },
  {
    label: "AI Operations",
    items: [
      { label: "Strategies / Workflows", icon: RouteIcon },
      { label: "Communications", icon: MessageSquare },
    ],
  },
  { label: "Governance", items: [{ label: "Rules", icon: Scale }] },
  {
    label: "Administration",
    items: [
      { label: "Users & Permissions", icon: Users },
      { label: "Integrations", icon: Plug },
    ],
  },
] as const;

function NavigationPreview({ slim = false }: { slim?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[690px] flex-col overflow-hidden rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-panel",
        slim ? "w-[76px]" : "w-full max-w-[260px]",
      )}
    >
      <div className={cn("flex h-[72px] shrink-0 items-center", slim ? "justify-center" : "px-4")}>
        {slim ? <PayflowMark className="size-9" /> : <PayflowWordmark tagline invert />}
      </div>
      <div className={cn("flex-1 overflow-hidden pb-3", slim ? "px-2.5" : "px-3")}>
        {groups.map((group) => (
          <div key={group.label} className={cn("mb-4", slim && "mb-2.5")}>
            {!slim && (
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-[0.1em] text-sidebar-muted uppercase">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.label === "Dashboard";
                return (
                  <div
                    key={item.label}
                    className={cn(
                      "relative flex h-9 items-center rounded-lg text-[12.5px] font-medium",
                      slim ? "justify-center" : "gap-2.5 px-2.5",
                      active
                        ? "border border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-muted",
                    )}
                    title={slim ? item.label : undefined}
                  >
                    {active && <span className="absolute inset-y-1.5 -left-1 w-[3px] rounded-full bg-sidebar-primary" />}
                    <item.icon className="size-4 shrink-0" />
                    {!slim && <span className="truncate">{item.label}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className={cn("border-t border-sidebar-border p-2.5", slim && "flex justify-center")}>
        <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary/25 text-[10px] font-bold">
          ZA
        </div>
        {!slim && (
          <div className="ml-2 min-w-0">
            <p className="truncate text-[12px] font-semibold">Zeeshan Ali</p>
            <p className="truncate text-[10px] text-sidebar-muted">Operations Admin</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Showcase() {
  return (
    <>
      <PageHeader
        title="Navigation Showcase"
        description="The same PayFlow hierarchy in expanded and focused navigation states."
        actions={<StatusPill tone="info">Desktop</StatusPill>}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold">Expanded</h2>
              <p className="text-xs text-muted-foreground">Labels and groups remain visible.</p>
            </div>
            <StatusPill>260 px</StatusPill>
          </div>
          <div className="flex min-h-[730px] items-start justify-center rounded-lg border border-border/60 bg-card p-5">
            <NavigationPreview />
          </div>
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold">Slim</h2>
              <p className="text-xs text-muted-foreground">Icons retain tooltips and active context.</p>
            </div>
            <StatusPill>76 px</StatusPill>
          </div>
          <div className="flex min-h-[730px] items-start justify-center rounded-lg border border-border/60 bg-card p-5">
            <NavigationPreview slim />
          </div>
        </section>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-3 text-xs text-muted-foreground">
        <Bell className="size-4 text-primary" />
        Both states preserve role visibility, active-page context, profile access, and review notifications.
      </div>
    </>
  );
}