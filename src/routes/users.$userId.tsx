import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  Panel,
  StatusPill,
  Btn,
  Field,
  TextInput,
  SelectInput,
} from "@/components/payflow-ui";
import {
  AccessHistoryPanel,
  RolePermissionSummary,
} from "@/components/user-access";
import { useRole } from "@/lib/role-context";
import { useUsers } from "@/lib/users-context";
import { userProfile, type UserStatus } from "@/lib/users-data";

export const Route = createFileRoute("/users/$userId")({
  head: () => ({
    meta: [
      { title: "User Detail — PayFlow Users & Permissions" },
      {
        name: "description",
        content:
          "A PayFlow user with their role, status, assigned clients, per-client operational permissions and recent access changes.",
      },
      { property: "og:title", content: "User Detail — PayFlow Users & Permissions" },
      {
        property: "og:description",
        content: "Role, assigned clients, permissions and access history for a PayFlow user.",
      },
    ],
  }),
  component: UserDetail,
});

function UserDetail() {
  const { userId } = Route.useParams();
  const { isAdmin, allClients } = useRole();
  const {
    userById,
    updateUser,
    setUserStatus,
    roles,
    roleNames,
    isPlatformRoleName,
  } = useUsers();
  const user = userById(userId);
  const [editing, setEditing] = useState(false);

  if (!isAdmin) {
    return (
      <Panel title="Administrator access required">
        <p className="text-sm text-muted-foreground">
          Only an Operations Admin can view user access details.
        </p>
      </Panel>
    );
  }

  if (!user) {
    return (
      <Panel title="User not found">
        <p className="text-sm text-muted-foreground">This user no longer exists.</p>
        <Link to="/users" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to Users &amp; Permissions
        </Link>
      </Panel>
    );
  }

  const clientName = (id: string) => allClients.find((c) => c.id === id)?.name ?? id;
  /** Client-scoped roles get assignments; platform-wide roles work everywhere. */
  const isSupervisor = !isPlatformRoleName(user.role);

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Users & Permissions", to: "/users" }, { label: user.name }]}
        title={user.name}
        description={user.email}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={isPlatformRoleName(user.role) ? "info" : "neutral"}>
              {user.role}
            </StatusPill>
            <StatusPill tone={user.status === "Active" ? "success" : "neutral"}>
              {user.status}
            </StatusPill>
            <Btn onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit User"}</Btn>
            <Btn
              variant={user.status === "Active" ? "danger" : "secondary"}
              onClick={() => setUserStatus(user.id, user.status === "Active" ? "Inactive" : "Active")}
            >
              {user.status === "Active" ? "Deactivate" : "Activate"}
            </Btn>
          </div>
        }
      />

      {user.status === "Inactive" && (
        <p className="mb-5 rounded-lg border border-warning/40 bg-warning/8 px-4 py-3 text-[12px] text-foreground">
          This user is inactive and cannot access PayFlow. Assignments and permissions are retained.
        </p>
      )}

      {editing && (
        <div className="mb-5">
          <Panel title="Edit User">
            <EditUserForm
              name={user.name}
              email={user.email}
              status={user.status}
              role={user.role}
              roleOptions={roleNames}
              onSave={(patch) => {
                updateUser(user.id, patch);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </Panel>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {isSupervisor ? (
            <Panel
              title="Assigned Clients"
              description="Visibility only. Assign or remove clients from each Client's Assigned Users section."
            >
              {user.assignments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border-strong px-3 py-6 text-center text-[12px] text-muted-foreground">
                  No clients assigned. This user cannot see any operational data.
                </p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border bg-card">
                  {user.assignments.map((a) => (
                    <Link
                      key={a.clientId}
                      to="/clients/$clientId"
                      params={{ clientId: a.clientId }}
                      search={{ tab: "Configuration" }}
                      className="block px-3.5 py-2.5 text-[13px] font-medium text-primary hover:underline"
                    >
                      {clientName(a.clientId)}
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <RolePermissionSummary roleName={user.role} />
              </div>
            </Panel>
          ) : (
            <Panel title="Platform Access">
              <p className="text-[13px] text-foreground">
                {user.role} works across every client — clients, accounts, cases, workflows,
                communications, human review, rules and analytics. No client assignment is required.
              </p>
            </Panel>
          )}

          <AccessHistoryPanel user={user} />
        </div>

        <div className="space-y-5">
          <Panel title="Profile">
            <dl className="space-y-2.5 text-[13px]">
              <Row label="Name" value={user.name} />
              <Row label="Email" value={user.email} />
              <Row label="Role" value={user.role} />
              <Row label="Access Scope" value={isSupervisor ? "Client-scoped" : "Platform-wide"} />
              <Row label="Status" value={user.status} />
              <Row label="Last Active" value={user.lastActive} />
              <Row label="Permission Profile" value={userProfile(user, roles)} />
              {isSupervisor && (
                <Row
                  label="Assigned Clients"
                  value={
                    user.assignments.length === 0
                      ? "None"
                      : user.assignments.map((a) => clientName(a.clientId)).join(", ")
                  }
                />
              )}
            </dl>
          </Panel>

          {isSupervisor && user.assignments.length > 0 && (
            <Panel title="Client Shortcuts">
              <div className="space-y-1.5">
                {user.assignments.map((a) => (
                  <Link
                    key={a.clientId}
                    to="/clients/$clientId"
                    params={{ clientId: a.clientId }}
                    className="block text-[13px] font-medium text-primary hover:underline"
                  >
                    {clientName(a.clientId)}
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

function EditUserForm({
  name: initialName,
  email: initialEmail,
  status: initialStatus,
  role: initialRole,
  roleOptions,
  onSave,
  onCancel,
}: {
  name: string;
  email: string;
  status: UserStatus;
  role: string;
  roleOptions: string[];
  onSave: (patch: { name: string; email: string; status: UserStatus; role: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<UserStatus>(initialStatus);
  const [role, setRole] = useState(initialRole);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Full Name">
          <TextInput value={name} onChange={setName} />
        </Field>
        <Field label="Email">
          <TextInput value={email} onChange={setEmail} />
        </Field>
        <Field label="Role">
          <SelectInput value={role} options={roleOptions} onChange={setRole} />
        </Field>
        <Field label="Status">
          <SelectInput
            value={status}
            options={["Active", "Inactive"]}
            onChange={(v) => setStatus(v as UserStatus)}
          />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <Btn
          variant="primary"
          disabled={name.trim().length < 2 || !/.+@.+\..+/.test(email)}
          onClick={() => onSave({ name: name.trim(), email: email.trim(), status, role })}
        >
          Save Changes
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </>
  );
}
