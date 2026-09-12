import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  UserCheck,
  Route as RouteIcon,
  MessageSquare,
  Scale,
  Users,
  Plug,
  ChevronsUpDown,
  Bell,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRole } from "@/lib/role-context";
import { useReviews } from "@/lib/reviews-context";
import { formatWaiting } from "@/lib/review-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navGroups = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Operations",
    items: [
      { to: "/clients", label: "Clients", icon: Building2 },
      { to: "/accounts", label: "Accounts / Cases", icon: FolderKanban },
      { to: "/human-review", label: "Human Review", icon: UserCheck },
    ],
  },
  {
    label: "AI Operations",
    items: [
      { to: "/journeys", label: "Journeys", icon: RouteIcon },
      { to: "/communications", label: "Communications", icon: MessageSquare },
    ],
  },
  {
    label: "Governance",
    items: [{ to: "/rules", label: "Rules", icon: Scale }],
  },
  {
    label: "Administration",
    items: [
      { to: "/users", label: "Users & Permissions", icon: Users },
      { to: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
] as const;

function UserMenu({ compact = false }: { compact?: boolean }) {
  const { role, setRole, userName, roleLabel } = useRole();
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          compact
            ? "flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 transition-colors hover:bg-surface"
            : "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent"
        }
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {initials}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-medium text-foreground">{userName}</span>
          {!compact && (
            <span className="block truncate text-[11px] text-muted-foreground">{roleLabel}</span>
          )}
        </span>
        {!compact && <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-60">
        <DropdownMenuLabel className="text-eyebrow">Preview role</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setRole("admin")}>
          <span className="flex-1">Operations Admin</span>
          {role === "admin" && <span className="text-xs text-primary">Active</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setRole("supervisor")}>
          <span className="flex-1">Supervisor · Zeeshan</span>
          {role === "supervisor" && <span className="text-xs text-primary">Active</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
          Supervisors only see assigned clients.
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReviewBell() {
  const { notifications, counts } = useReviews();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Human reviews awaiting decision: ${counts.awaiting}`}
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-[17px]" />
          {counts.awaiting > 0 && (
            <span className="absolute top-1.5 right-1.5 flex min-w-[15px] justify-center rounded-full bg-danger px-1 text-[9px] leading-[15px] font-semibold text-white">
              {counts.awaiting}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel className="text-[11px] tracking-wide text-muted-foreground uppercase">
          Awaiting your review
        </DropdownMenuLabel>
        {notifications.length === 0 ? (
          <DropdownMenuLabel className="text-[12px] font-normal text-muted-foreground">
            Nothing needs a decision. Automation is running within governance.
          </DropdownMenuLabel>
        ) : (
          notifications.map((r) => (
            <DropdownMenuItem key={r.id} asChild>
              <Link
                to="/human-review/$reviewId"
                params={{ reviewId: r.id }}
                className="flex flex-col items-start gap-0.5"
              >
                <span className="text-[12px] font-medium">
                  {r.customer} · {r.reason}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {r.ruleName} · waiting {formatWaiting(r.waitingMinutes)}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/human-review" className="text-[12px] font-medium">
            View all human reviews
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export function AppShell({ children }: { children: ReactNode }) {
  const { role, visibleClients } = useRole();

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-[12px] font-bold text-primary-foreground">
            P
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
            PayFlow
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="text-eyebrow px-2 pb-1.5">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      activeOptions={{ exact: "exact" in item ? item.exact : false }}
                      className="group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
                      activeProps={{ className: "font-semibold" }}
                    >
                      <item.icon className="size-[15px] shrink-0 opacity-70" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <p className="px-2 pt-1 pb-2 text-[11px] text-muted-foreground">
            {role === "admin"
              ? "All clients in view"
              : visibleClients.map((c) => c.name).join(" · ")}
          </p>
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-5 backdrop-blur lg:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              P
            </span>
            <span className="text-sm font-semibold">PayFlow</span>
          </div>
          <p className="hidden text-xs text-muted-foreground lg:block">
            Collections operations · {visibleClients.length} client
            {visibleClients.length === 1 ? "" : "s"} in view
          </p>
          <div className="flex items-center gap-2">
            <ReviewBell />
            <div className="lg:hidden">
              <UserMenu compact />
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-7 lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
