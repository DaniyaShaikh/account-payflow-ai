import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clients, accounts, activity, type Client } from "./payflow-data";

export type Role = "admin" | "supervisor";

const DEMO_SUPERVISOR = "Zeeshan";
const STORAGE_KEY = "payflow.role";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  userName: string;
  roleLabel: string;
  visibleClients: Client[];
  visibleClientIds: string[];
  canSeeClient: (clientId: string) => boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "admin" || stored === "supervisor") setRole(stored);
  }, []);

  const value = useMemo<RoleContextValue>(() => {
    const visibleClients =
      role === "admin"
        ? clients
        : clients.filter((c) => c.supervisors.includes(DEMO_SUPERVISOR));
    const visibleClientIds = visibleClients.map((c) => c.id);

    return {
      role,
      setRole: (next: Role) => {
        setRole(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
      userName: role === "admin" ? "Alex Morgan" : DEMO_SUPERVISOR,
      roleLabel: role === "admin" ? "Operations Admin" : "Supervisor",
      visibleClients,
      visibleClientIds,
      canSeeClient: (clientId: string) => visibleClientIds.includes(clientId),
    };
  }, [role]);

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
