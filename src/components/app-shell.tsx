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
  ChevronDown,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRole } from "@/lib/role-context";
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

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, userName, roleLabel, visibleClients } = useRole();

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            P
          </span>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            PayFlow
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="text-eyebrow px-2 pb-1.5">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      activeOptions={{ exact: "exact" in item ? item.exact : false }}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
                      activeProps={{ className: "font-semibold" }}
                    >
                      <item.icon className="size-4 shrink-0 opacity-70" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-3">
          <p className="text-eyebrow px-2 pb-1">Client access</p>
          <p className="px-2 text-xs text-muted-foreground">
            {role === "admin"
              ? "All clients"
              : `${visibleClients.map((c) => c.name).join(", ")}`}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/85 px-5 backdrop-blur lg:px-8">
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

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:bg-accent">
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
                {userName.slice(0, 1)}
              </span>
              <span className="leading-tight">
                <span className="block text-[13px] font-medium">{userName}</span>
                <span className="block text-[11px] text-muted-foreground">{roleLabel}</span>
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
        </header>

        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
