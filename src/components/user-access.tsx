import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Btn, SearchInput, StatusPill, Panel } from "@/components/payflow-ui";
import { permissionGroups, type PayflowUser } from "@/lib/users-data";
import { useUsers } from "@/lib/users-context";
import { useRole } from "@/lib/role-context";
import { cn } from "@/lib/utils";

/** Grouped permission checkboxes — WHAT a supervisor may do. */
export function PermissionPicker({
  selected,
  onToggle,
  disabled,
}: {
  selected: string[];
  onToggle: (permission: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {permissionGroups.map((group) => (
        <div key={group.group} className="rounded-lg border border-border bg-card px-3 py-2.5">
          <p className="text-eyebrow">{group.group}</p>
          <div className="mt-1.5 space-y-1">
            {group.permissions.map((perm) => (
              <label
                key={perm}
                className={cn(
                  "flex items-center gap-2.5 py-1",
                  disabled ? "cursor-default opacity-70" : "cursor-pointer",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(perm)}
                  disabled={disabled}
                  onChange={() => onToggle(perm)}
                  className="size-3.5 accent-[var(--primary)]"
                />
                <span className="text-[12px] text-foreground">{perm}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Searchable multi-select of clients — WHERE a supervisor may work. */
export function ClientAssignmentPicker({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (clientId: string) => void;
}) {
  const { allClients } = useRole();
  const [query, setQuery] = useState("");
  const matches = allClients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <SearchInput value={query} onChange={setQuery} placeholder="Search clients" />
      <div className="mt-2 max-h-[190px] divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
        {matches.length === 0 && (
          <p className="px-3 py-3 text-[12px] text-muted-foreground">No clients match.</p>
        )}
        {matches.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5">
            <input
              type="checkbox"
              checked={selectedIds.includes(c.id)}
              onChange={() => onToggle(c.id)}
              className="size-3.5 accent-[var(--primary)]"
            />
            <span className="text-[13px] text-foreground">{c.name}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">{c.industry}</span>
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        The supervisor can only access information belonging to assigned clients.
      </p>
    </div>
  );
}

/** Client Detail → Assigned Users. Assignment decides WHERE; the role decides WHAT. */
export function ClientSupervisorAccess({
  clientId,
  clientName,
  editable,
}: {
  clientId: string;
  clientName: string;
  editable: boolean;
}) {
  const { users, supervisorsForClient, assignClient, removeAssignment, isPlatformRoleName, roleByName } =
    useUsers();
  const assigned = supervisorsForClient(clientId);
  /** Only client-scoped roles can be assigned to a client. */
  const available = users.filter(
    (u) => !isPlatformRoleName(u.role) && !assigned.some((a) => a.id === u.id),
  );
  const [pick, setPick] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] font-semibold text-foreground">Assigned Users</p>
        <p className="text-[11px] text-muted-foreground">
          Assignment decides where a user works. What they may do comes from their role, managed in
          Users &amp; Permissions. Sub-Clients/Portfolios inherit this access.
        </p>
      </div>

      {assigned.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong px-3 py-6 text-center text-[12px] text-muted-foreground">
          No user is assigned to {clientName} yet.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {assigned.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
              <Link
                to="/users/$userId"
                params={{ userId: u.id }}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                {u.name}
              </Link>
              <StatusPill>{u.role}</StatusPill>
              <StatusPill tone={u.status === "Active" ? "success" : "neutral"}>
                {u.status}
              </StatusPill>
              <span className="text-[11px] text-muted-foreground">
                {roleByName(u.role)?.permissions.length ?? 0} role permissions
              </span>
              {editable && (
                <div className="ml-auto">
                  <Btn variant="danger" onClick={() => removeAssignment(u.id, clientId, clientName)}>
                    Remove
                  </Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && available.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-foreground">Assign user</span>
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2.5 text-[13px] outline-none"
            >
              <option value="">Select a user</option>
              {available.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.role}
                </option>
              ))}
            </select>
          </label>
          <Btn
            variant="primary"
            disabled={!pick}
            onClick={() => {
              if (!pick) return;
              assignClient(pick, clientId, clientName);
              setPick("");
            }}
          >
            Assign
          </Btn>
        </div>
      )}
    </div>
  );
}

/** Read-only summary of a role's permissions. */
export function RolePermissionSummary({ roleName }: { roleName: string }) {
  const { roleByName, isPlatformRoleName } = useUsers();
  const role = roleByName(roleName);
  if (!role) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
      <p className="text-[12px] font-medium text-foreground">{role.name} permissions (read-only)</p>
      {isPlatformRoleName(role.name) ? (
        <p className="mt-1 text-[12px] text-muted-foreground">
          Platform-wide — every permission across all clients.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {role.permissions.map((p) => (
            <StatusPill key={p}>{p}</StatusPill>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccessHistoryPanel({ user }: { user: PayflowUser }) {
  return (
    <Panel title="Access History" description="Recent assignment and permission changes">
      <ol className="space-y-2.5">
        {user.history.map((h, i) => (
          <li key={`${h.at}-${h.event}-${i}`} className="flex flex-wrap items-baseline gap-2">
            <span className="tabular text-[12px] text-muted-foreground">{h.at}</span>
            <span className="text-[13px] text-foreground">{h.event}</span>
            <span className="text-[11px] text-muted-foreground">by {h.by}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
