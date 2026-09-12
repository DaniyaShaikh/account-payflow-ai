import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createStableContext } from "./stable-context";
import { clients as seedClients, accounts, activity, type Client } from "./payflow-data";
import { useUsers } from "./users-context";
import type { PayflowUser } from "./users-data";

export type Role = "admin" | "supervisor";

const STORAGE_KEY = "payflow.role";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  userName: string;
  roleLabel: string;
  isAdmin: boolean;
  /** The signed-in demo user behind the current role. */
  currentUser: PayflowUser | undefined;
  allClients: Client[];
  visibleClients: Client[];
  visibleClientIds: string[];
  canSeeClient: (clientId: string) => boolean;
  /** WHAT the current user may do — for a specific client where relevant. */
  can: (permission: string, clientId?: string | null) => boolean;
  permissionsForClient: (clientId: string) => string[];
  addClient: (client: Client) => void;
  updateClient: (clientId: string, patch: Partial<Client>) => void;
}

const RoleContext = createStableContext<RoleContextValue | null>("role", null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [allClients, setAllClients] = useState<Client[]>(seedClients);
  const { userById, adminUserId, demoSupervisorId } = useUsers();

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "admin" || stored === "supervisor") setRole(stored);
  }, []);

  const currentUser = userById(role === "admin" ? adminUserId : demoSupervisorId);

  const value = useMemo<RoleContextValue>(() => {
    const isAdmin = role === "admin";
    const active = currentUser?.status !== "Inactive";
    const assignedIds = currentUser?.assignments.map((a) => a.clientId) ?? [];

    const visibleClients = isAdmin
      ? allClients
      : active
        ? allClients.filter((c) => assignedIds.includes(c.id))
        : [];
    const visibleClientIds = visibleClients.map((c) => c.id);

    const permissionsForClient = (clientId: string) =>
      currentUser?.assignments.find((a) => a.clientId === clientId)?.permissions ?? [];

    return {
      role,
      setRole: (next: Role) => {
        setRole(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
      userName: currentUser?.name ?? "PayFlow User",
      roleLabel: currentUser?.role ?? (isAdmin ? "Operations Admin" : "Supervisor"),
      isAdmin,
      currentUser,
      allClients,
      visibleClients,
      visibleClientIds,
      canSeeClient: (clientId: string) => visibleClientIds.includes(clientId),
      can: (permission: string, clientId?: string | null) => {
        if (isAdmin) return true;
        if (!active || !clientId) return false;
        return permissionsForClient(clientId).includes(permission);
      },
      permissionsForClient,
      addClient: (client: Client) => setAllClients((prev) => [...prev, client]),
      updateClient: (clientId: string, patch: Partial<Client>) =>
        setAllClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...patch } : c))),
    };
  }, [role, allClients, currentUser]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}

export function useVisibleAccounts() {
  const { visibleClientIds } = useRole();
  return useMemo(
    () => accounts.filter((a) => visibleClientIds.includes(a.clientId)),
    [visibleClientIds],
  );
}

export function useVisibleActivity() {
  const { visibleClientIds } = useRole();
  return useMemo(
    () => activity.filter((a) => visibleClientIds.includes(a.clientId)),
    [visibleClientIds],
  );
}
