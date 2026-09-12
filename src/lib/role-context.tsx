import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clients as seedClients, accounts, activity, type Client } from "./payflow-data";

export type Role = "admin" | "supervisor";

const DEMO_SUPERVISOR = "Zeeshan";
const STORAGE_KEY = "payflow.role";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  userName: string;
  roleLabel: string;
  isAdmin: boolean;
  allClients: Client[];
  visibleClients: Client[];
  visibleClientIds: string[];
  canSeeClient: (clientId: string) => boolean;
  addClient: (client: Client) => void;
  updateClient: (clientId: string, patch: Partial<Client>) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [allClients, setAllClients] = useState<Client[]>(seedClients);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "admin" || stored === "supervisor") setRole(stored);
  }, []);

  const value = useMemo<RoleContextValue>(() => {
    const visibleClients =
      role === "admin"
        ? allClients
        : allClients.filter((c) => c.supervisors.includes(DEMO_SUPERVISOR));
    const visibleClientIds = visibleClients.map((c) => c.id);

    return {
      role,
      setRole: (next: Role) => {
        setRole(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
      userName: role === "admin" ? "Daniya Shaikh" : "Zeeshan Ahmed",
      roleLabel: role === "admin" ? "Operations Admin" : "Supervisor",
      isAdmin: role === "admin",
      allClients,
      visibleClients,
      visibleClientIds,
      canSeeClient: (clientId: string) => visibleClientIds.includes(clientId),
      addClient: (client: Client) => setAllClients((prev) => [...prev, client]),
      updateClient: (clientId: string, patch: Partial<Client>) =>
        setAllClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...patch } : c))),
    };
  }, [role, allClients]);

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
