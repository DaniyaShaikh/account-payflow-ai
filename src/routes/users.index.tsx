import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PageHeader,
  Panel,
  KpiCard,
  DataTable,
  Td,
  Tr,
  PrimaryCell,
  StatusPill,
  SearchInput,
  FilterSelect,
  Btn,
  Field,
  TextInput,
  SelectInput,
  EmptyState,
} from "@/components/payflow-ui";
import { ClientAssignmentPicker, PermissionPicker } from "@/components/user-access";
import { RolesPanel } from "@/components/role-manager";
import { useRole } from "@/lib/role-context";
import { useUsers } from "@/lib/users-context";
import { userProfile, type UserRole, type UserStatus } from "@/lib/users-data";

export const Route = createFileRoute("/users/")({
  head: () => ({
    meta: [
      { title: "Users & Permissions — PayFlow Operations" },
      {
        name: "description",
        content:
          "Manage PayFlow users, supervisor client assignments and the operational permissions each supervisor holds per client.",
      },
      { property: "og:title", content: "Users & Permissions — PayFlow Operations" },
      {
        property: "og:description",
        content: "Operations admins, supervisors, client assignments and operational access.",
      },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin, allClients } = useRole();
  const { users, roles, roleNames, isPlatformRoleName, addUser } = useUsers();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [clientFilter, setClientFilter] = useState("All Clients");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [adding, setAdding] = useState(false);

  const clientName = (id: string) => allClients.find((c) => c.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q)) return false;
      if (roleFilter !== "All Roles" && u.role !== roleFilter) return false;
      if (statusFilter !== "All Statuses" && u.status !== statusFilter) return false;
      if (clientFilter !== "All Clients") {
        if (isPlatformRoleName(u.role)) return true;
        const target = allClients.find((c) => c.name === clientFilter);
        if (!target || !u.assignments.some((a) => a.clientId === target.id)) return false;
      }
      return true;
    });
  }, [users, query, roleFilter, statusFilter, clientFilter, allClients]);

  if (!isAdmin) {
    return (
      <>
        <PageHeader
          title="Users & Permissions"
          description="Manage PayFlow users, Client assignments and operational access."
        />
        <Panel title="Administrator access required">
          <p className="text-sm text-muted-foreground">
            Only an Operations Admin can manage users, client assignments and permissions.
          </p>
        </Panel>
      </>
    );
  }

  const admins = users.filter((u) => isPlatformRoleName(u.role)).length;
  const clientScoped = users.length - admins;
  const active = users.filter((u) => u.status === "Active").length;

  return (
    <>
      <PageHeader
        title="Users & Permissions"
        description="Manage PayFlow users, roles, Client assignments and operational access."
        actions={
          <Btn variant="primary" onClick={() => setAdding((v) => !v)}>
            {adding ? "Close" : "+ Add User"}
          </Btn>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total Users" value={String(users.length)} />
        <KpiCard label="Roles" value={String(roles.length)} />
        <KpiCard label="Platform-wide Access" value={String(admins)} />
        <KpiCard label="Client-scoped Users" value={String(clientScoped)} />
        <KpiCard label="Active Users" value={String(active)} tone="primary" />
      </div>

      {adding && (
        <div className="mb-5">
          <AddUserForm
            onCancel={() => setAdding(false)}
            onCreate={(input) => {
              const created = addUser(input);
              setAdding(false);
              navigate({ to: "/users/$userId", params: { userId: created.id } });
            }}
          />
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search users"
          className="w-full sm:w-[240px]"
        />
        <FilterSelect
          label="Role"
          value={roleFilter}
          options={["All Roles", ...roleNames]}
          onChange={setRoleFilter}
        />
        <FilterSelect
          label="Client"
          value={clientFilter}
          options={["All Clients", ...allClients.map((c) => c.name)]}
          onChange={setClientFilter}
        />
        <FilterSelect
          label="Status"
          value={statusFilter}
          options={["All Statuses", "Active", "Inactive"]}
          onChange={setStatusFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No users match" description="Adjust the search or filters." />
      ) : (
        <DataTable
          head={[
            "User",
            "Role",
            "Assigned Clients",
            "Permission Profile / Access",
            "Status",
            "Last Active",
            "",
          ]}
          minWidth={900}
        >
          {filtered.map((u) => (
            <Tr
              key={u.id}
              onClick={() => navigate({ to: "/users/$userId", params: { userId: u.id } })}
            >
              <Td>
                <PrimaryCell title={u.name} subtitle={u.email} />
              </Td>
              <Td>
                <StatusPill tone={isPlatformRoleName(u.role) ? "info" : "neutral"}>
                  {u.role}
                </StatusPill>
              </Td>
              <Td className="text-muted-foreground">
                {isPlatformRoleName(u.role)
                  ? "All Clients"
                  : u.assignments.length === 0
                    ? "None assigned"
                    : u.assignments.map((a) => clientName(a.clientId)).join(", ")}
              </Td>
              <Td className="text-muted-foreground">{userProfile(u, roles)}</Td>
              <Td>
                <StatusPill tone={u.status === "Active" ? "success" : "neutral"}>
                  {u.status}
                </StatusPill>
              </Td>
              <Td className="text-muted-foreground">{u.lastActive}</Td>
              <Td>
                <span className="text-[12px] font-medium text-primary">View</span>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}
    </>
  );
}

function AddUserForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    assignments: { clientId: string; permissions: string[] }[];
  }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("Supervisor");
  const [status, setStatus] = useState<UserStatus>("Active");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([...standardSupervisorPermissions]);

  const valid =
    name.trim().length > 1 &&
    /.+@.+\..+/.test(email) &&
    (role === "Operations Admin" || clientIds.length > 0);

  return (
    <Panel title="Add User" description="Client assignment decides where. Permissions decide what.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name">
          <TextInput value={name} onChange={setName} placeholder="Amara Okafor" />
        </Field>
        <Field label="Email">
          <TextInput value={email} onChange={setEmail} placeholder="name@payflow.io" />
        </Field>
        <Field label="Role">
          <SelectInput
            value={role}
            options={["Operations Admin", "Supervisor"]}
            onChange={(v) => setRole(v as UserRole)}
          />
        </Field>
        <Field label="Status">
          <SelectInput
            value={status}
            options={["Active", "Inactive"]}
            onChange={(v) => setStatus(v as UserStatus)}
          />
        </Field>
      </div>

      {role === "Operations Admin" ? (
        <p className="mt-4 rounded-lg border border-border bg-surface px-3.5 py-3 text-[12px] text-muted-foreground">
          An Operations Admin has platform-wide access across every client. No client assignment is
          required.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-foreground">
              Assigned Clients — where access applies
            </p>
            <ClientAssignmentPicker
              selectedIds={clientIds}
              onToggle={(id) =>
                setClientIds((prev) =>
                  prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
                )
              }
            />
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-foreground">
              Permissions — what the supervisor may do
            </p>
            <PermissionPicker
              selected={permissions}
              onToggle={(perm) =>
                setPermissions((prev) =>
                  prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
                )
              }
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Access can later be tuned per assigned client from User Detail.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Btn
          variant="primary"
          disabled={!valid}
          onClick={() =>
            onCreate({
              name: name.trim(),
              email: email.trim(),
              role,
              status,
              assignments: clientIds.map((clientId) => ({ clientId, permissions })),
            })
          }
        >
          Create User
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </Panel>
  );
}
