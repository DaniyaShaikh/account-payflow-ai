import { Link, useNavigate, useLocation } from "@tanstack/react-router";
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
  LogOut,
  UserRound,
  Layout,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { PayflowMark, PayflowWordmark } from "@/components/brand";
import { useRole } from "@/lib/role-context";
import { useReviews } from "@/lib/reviews-context";
import { formatWaiting } from "@/lib/review-data";
import { markSignedOut } from "@/lib/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/showcase", label: "Navigation Showcase", icon: Layout, adminOnly: true },
    ],
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
      { to: "/strategies", label: "Strategies / Workflows", icon: RouteIcon },
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
      { to: "/users", label: "Users & Permissions", icon: Users, adminOnly: true },
      { to: "/integrations", label: "Integrations", icon: Plug, adminOnly: true },
    ],
  },
] as const;

function UserMenu({ compact = false }: { compact?: boolean }) {
  const { role, setRole, userName, roleLabel } = useRole();
  const navigate = useNavigate();
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setProfileImage(window.localStorage.getItem("payflow.profileImage"));
    refresh();
    window.addEventListener("payflow-profile-updated", refresh);
    return () => window.removeEventListener("payflow-profile-updated", refresh);
  }, []);

  const handleLogout = () => {
    markSignedOut();
    try {
      localStorage.removeItem("payflow.role");
    } catch {}
    navigate({ to: "/login", replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={
            compact
              ? "flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-muted"
              : "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          }
        >
          <span
            className={
              compact
                ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary"
                : "flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/25 text-[11px] font-bold text-sidebar-foreground"
            }
          >
            {profileImage ? (
              <img src={profileImage} alt="" className="size-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span
              className={
                compact
                  ? "block truncate text-[13px] font-semibold text-foreground"
                  : "block truncate text-[13px] font-semibold text-sidebar-foreground"
              }
            >
              {userName}
            </span>
            <span
              className={
                compact
                  ? "block truncate text-[11px] text-muted-foreground"
                  : "block truncate text-[11px] text-sidebar-muted"
              }
            >
              {roleLabel}
            </span>
          </span>
          {!compact && (
            <ChevronsUpDown className="ml-auto size-3.5 text-sidebar-muted group-data-[collapsible=icon]:hidden" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "top"} className="w-60">
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserRound className="mr-2 size-4" />
            <span className="flex-1">My Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" />
          <span className="flex-1">Log out</span>
        </DropdownMenuItem>
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
            <span className="absolute top-1.5 right-1.5 flex min-w-[15px] justify-center rounded-full bg-destructive px-1 text-[9px] leading-[15px] font-semibold text-white">
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
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-surface">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-[8px_0_32px_-24px_var(--brand-navy)]">
          <SidebarHeader className="flex h-[68px] items-center px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <PayflowWordmark tagline invert className="group-data-[collapsible=icon]:hidden" />
            <div className="hidden group-data-[collapsible=icon]:block">
              <PayflowMark className="size-9" />
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 pb-4 group-data-[collapsible=icon]:px-2">
            {navGroups
              .map((group) => ({
                ...group,
                items: group.items.filter(
                  (item) => role === "admin" || !("adminOnly" in item && item.adminOnly),
                ),
              }))
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <SidebarGroup key={group.label}>
                  <SidebarGroupLabel className="px-2.5 pb-2 text-[10px] font-semibold tracking-[0.1em] text-sidebar-muted uppercase">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.to || 
                          (item.to !== "/" && location.pathname.startsWith(item.to));
                        
                        return (
                          <SidebarMenuItem key={item.to}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.label}
                              className="group/btn relative flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-[13px] font-medium text-sidebar-muted transition-all duration-150 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground data-[active=true]:border-sidebar-border data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[0_8px_20px_-14px_var(--sidebar-primary)] group-data-[collapsible=icon]:mx-auto"
                            >
                              <Link
                                to={item.to}
                                activeOptions={{ exact: "exact" in item ? item.exact : false }}
                              >
                                 <span className="absolute top-1.5 bottom-1.5 -left-1 w-[3px] rounded-full bg-sidebar-primary opacity-0 transition-opacity group-data-[active=true]/btn:opacity-100 group-data-[collapsible=icon]:hidden" />
                                 <item.icon className="size-[17px] shrink-0 opacity-80" />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-2.5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
            <p className="px-1.5 pt-0.5 pb-2 text-[11px] text-sidebar-muted group-data-[collapsible=icon]:hidden">
              {role === "admin"
                ? "All clients in view"
                : visibleClients.map((c) => c.name).join(" · ")}
            </p>
            <UserMenu />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-border/80 bg-background/90 px-5 shadow-subtle backdrop-blur-xl lg:px-9">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="lg:hidden">
                <PayflowWordmark />
              </div>
              <p className="hidden text-[12px] text-muted-foreground lg:block">
                Collections operations ·{" "}
                <span className="font-medium text-foreground">
                  {visibleClients.length} client{visibleClients.length === 1 ? "" : "s"}
                </span>{" "}
                in view
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <ReviewBell />
              <span className="mx-1 hidden h-7 w-px bg-border lg:block" />
              <UserMenu compact />
            </div>
          </header>

          <main className="relative flex-1 px-5 py-7 lg:px-10 lg:py-9">
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
