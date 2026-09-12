import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  usersSeed,
  rolesSeed,
  allPermissions,
  standardSupervisorPermissions,
  shortNameFor,
  isPlatformRole,
  defaultPermissionsForRole,
  type AccessHistoryEntry,
  type ClientAssignment,
  type PayflowUser,
  type RoleDefinition,
  type RoleScope,
  type UserRole,
  type UserStatus,
} from "./users-data";

const ADMIN_USER_ID = "u-daniya";
const DEMO_SUPERVISOR_ID = "u-zeeshan";

export interface NewUserInput {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  assignments: ClientAssignment[];
}

export interface NewRoleInput {
  name: string;
  scope: RoleScope;
  description: string;
  permissions: string[];
}

interface UsersContextValue {
  users: PayflowUser[];
  roles: RoleDefinition[];
  roleNames: string[];
  roleByName: (name: string) => RoleDefinition | undefined;
  isPlatformRoleName: (name: string) => boolean;
  defaultPermissions: (roleName: string) => string[];
  addRole: (input: NewRoleInput) => RoleDefinition;
  updateRole: (id: string, patch: Partial<Omit<RoleDefinition, "id" | "builtIn">>) => void;
  deleteRole: (id: string) => void;
  usersWithRole: (roleName: string) => PayflowUser[];
  adminUserId: string;
  demoSupervisorId: string;
  userById: (id: string) => PayflowUser | undefined;
  supervisorsForClient: (clientId: string) => PayflowUser[];
  addUser: (input: NewUserInput) => PayflowUser;
  updateUser: (
    id: string,
    patch: Partial<Pick<PayflowUser, "name" | "email" | "status" | "role">>,
  ) => void;
  setUserStatus: (id: string, status: UserStatus) => void;
  assignClient: (id: string, clientId: string, clientName: string) => void;
  removeAssignment: (id: string, clientId: string, clientName: string) => void;
  setAssignmentPermissions: (
    id: string,
    clientId: string,
    clientName: string,
    permissions: string[],
  ) => void;
  permissionsFor: (id: string, clientId: string) => string[];
}

const UsersContext = createContext<UsersContextValue | null>(null);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function today() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<PayflowUser[]>(usersSeed);
  const [roles, setRoles] = useState<RoleDefinition[]>(rolesSeed);

  const value = useMemo<UsersContextValue>(() => {
    const log = (user: PayflowUser, event: string): AccessHistoryEntry[] => [
      { at: today(), event, by: "Daniya Shaikh" },
      ...user.history,
    ];

    const patchUser = (id: string, fn: (u: PayflowUser) => PayflowUser) =>
      setUsers((prev) => prev.map((u) => (u.id === id ? fn(u) : u)));

    const platform = (roleName: string) => isPlatformRole(roleName, roles);

    return {
      users,
      roles,
      roleNames: roles.map((r) => r.name),
      roleByName: (name) => roles.find((r) => r.name === name),
      isPlatformRoleName: platform,
      defaultPermissions: (roleName) => defaultPermissionsForRole(roleName, roles),
      usersWithRole: (roleName) => users.filter((u) => u.role === roleName),
      addRole: (input) => {
        const created: RoleDefinition = {
          id: `r-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${roles.length + 1}`,
          name: input.name.trim(),
          scope: input.scope,
          description: input.description.trim(),
          permissions:
            input.scope === "Platform-wide" ? [...allPermissions] : [...input.permissions],
          builtIn: false,
        };
        setRoles((prev) => [...prev, created]);
        return created;
      },
      updateRole: (id, patch) =>
        setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
      deleteRole: (id) =>
        setRoles((prev) => prev.filter((r) => r.id === id ? r.builtIn : true)),
      adminUserId: ADMIN_USER_ID,
      demoSupervisorId: DEMO_SUPERVISOR_ID,
      userById: (id) => users.find((u) => u.id === id),
      supervisorsForClient: (clientId) =>
        users.filter(
          (u) => !platform(u.role) && u.assignments.some((a) => a.clientId === clientId),
        ),
      addUser: (input) => {
        const platformRole = platform(input.role);
        const created: PayflowUser = {
          id: `u-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${users.length + 1}`,
          name: input.name,
          shortName: shortNameFor(input.name),
          email: input.email,
          role: input.role,
          status: input.status,
          lastActive: "Never",
          assignments: platformRole ? [] : input.assignments,
          history: [
            {
              at: today(),
              event: platformRole
                ? `${input.role} access granted`
                : `${input.role} account created`,
              by: "Daniya Shaikh",
            },
          ],
        };
        setUsers((prev) => [...prev, created]);
        return created;
      },
      updateUser: (id, patch) =>
        patchUser(id, (u) => {
          const roleChanged = Boolean(patch.role && patch.role !== u.role);
          const statusChanged = Boolean(patch.status && patch.status !== u.status);
          let history = u.history;
          if (statusChanged)
            history = log(
              { ...u, history },
              patch.status === "Active" ? "User activated" : "User deactivated",
            );
          if (roleChanged) history = log({ ...u, history }, `Role changed to ${patch.role}`);
          return {
            ...u,
            ...patch,
            ...(patch.name ? { shortName: shortNameFor(patch.name) } : {}),
            /** A platform-wide role needs no client assignments. */
            assignments:
              roleChanged && patch.role && platform(patch.role) ? [] : u.assignments,
            history,
          };
        }),
      setUserStatus: (id, status) =>
        patchUser(id, (u) =>
          u.status === status
            ? u
            : {
                ...u,
                status,
                history: log(u, status === "Active" ? "User activated" : "User deactivated"),
              },
        ),
      assignClient: (id, clientId, clientName) =>
        patchUser(id, (u) =>
          u.assignments.some((a) => a.clientId === clientId)
            ? u
            : {
                ...u,
                assignments: [
                  ...u.assignments,
                  { clientId, permissions: defaultPermissionsForRole(u.role, roles) },
                ],
                history: log(u, `${clientName} assigned`),
              },
        ),
      removeAssignment: (id, clientId, clientName) =>
        patchUser(id, (u) => ({
          ...u,
          assignments: u.assignments.filter((a) => a.clientId !== clientId),
          history: log(u, `Removed from ${clientName}`),
        })),
      setAssignmentPermissions: (id, clientId, clientName, permissions) =>
        patchUser(id, (u) => {
          const existing = u.assignments.find((a) => a.clientId === clientId);
          const before = existing?.permissions ?? [];
          const added = permissions.filter((p) => !before.includes(p));
          const removed = before.filter((p) => !permissions.includes(p));
          const change =
            added.length > 0
              ? `${added[0]} enabled for ${clientName}`
              : removed.length > 0
                ? `${removed[0]} removed for ${clientName}`
                : `Permissions updated for ${clientName}`;
          return {
            ...u,
            assignments: existing
              ? u.assignments.map((a) => (a.clientId === clientId ? { ...a, permissions } : a))
              : [...u.assignments, { clientId, permissions }],
            history: log(u, change),
          };
        }),
      permissionsFor: (id, clientId) => {
        const user = users.find((u) => u.id === id);
        if (!user) return [];
        if (platform(user.role)) return [...allPermissions];
        return user.assignments.find((a) => a.clientId === clientId)?.permissions ?? [];
      },
    };
  }, [users, roles]);

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used inside UsersProvider");
  return ctx;
}
