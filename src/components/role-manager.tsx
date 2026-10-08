import { useState } from "react";
import {
  Panel,
  DataTable,
  Td,
  Tr,
  PrimaryCell,
  StatusPill,
  Btn,
  Field,
  TextInput,
  SelectInput,
} from "@/components/payflow-ui";
import { PermissionPicker } from "@/components/user-access";
import { useUsers } from "@/lib/users-context";
import { standardSupervisorPermissions, type RoleScope } from "@/lib/users-data";

/**
 * Roles & Permissions: an admin defines roles from the permission set, and each
 * role then appears in the role dropdown when adding or editing a user.
 */
export function RolesPanel() {
  const { roles, addRole, deleteRole, usersWithRole } = useUsers();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Panel
      title="Roles"
      description="Each role is a named permission set. Roles appear in the role dropdown when assigning users."
      action={
        <Btn variant={adding ? "ghost" : "secondary"} onClick={() => setAdding((v) => !v)}>
          {adding ? "Close" : "+ Add Role"}
        </Btn>
      }
    >
      {adding && (
        <div className="mb-4">
          <AddRoleForm
            existingNames={roles.map((r) => r.name)}
            onCancel={() => setAdding(false)}
            onCreate={(input) => {
              addRole(input);
              setAdding(false);
            }}
          />
        </div>
      )}

      <DataTable head={["Role", "Scope", "Permissions", "Users", ""]} minWidth={720}>
        {roles.map((r) => {
          const count = usersWithRole(r.name).length;
          return (
            <Tr key={r.id}>
              <Td>
                <PrimaryCell title={r.name} subtitle={r.description} />
              </Td>
              <Td>
                <StatusPill tone={r.scope === "Platform-wide" ? "info" : "neutral"}>
                  {r.scope}
                </StatusPill>
              </Td>
              <Td className="text-muted-foreground">
                {r.scope === "Platform-wide" ? "All permissions" : `${r.permissions.length} selected`}
              </Td>
              <Td className="text-muted-foreground">{count}</Td>
              <Td>
                <div className="flex justify-end gap-1.5">
                  <Btn
                    variant="ghost"
                    onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                  >
                    {editingId === r.id ? "Hide" : r.scope === "Platform-wide" ? "View access" : "Edit access"}
                  </Btn>
                  {!r.builtIn && (
                    <Btn variant="danger" disabled={count > 0} onClick={() => deleteRole(r.id)}>
                      Delete
                    </Btn>
                  )}
                </div>
              </Td>
            </Tr>
          );
        })}
      </DataTable>

      {editingId && <RolePermissions roleId={editingId} />}
    </Panel>
  );
}

function RolePermissions({ roleId }: { roleId: string }) {
  const { roles, updateRole } = useUsers();
  const role = roles.find((r) => r.id === roleId);
  if (!role) return null;

  const { usersWithRole } = useUsers();
  const editable = role.scope === "Client-scoped";
  const affected = usersWithRole(role.name).length;

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface px-3.5 py-3">
      <p className="text-[13px] font-semibold text-foreground">{role.name} — permissions</p>
      <p className="mb-3 text-[11px] text-muted-foreground">
        {role.scope === "Platform-wide"
          ? "A platform-wide role holds every permission across all clients."
          : editable
            ? "Users with this role inherit these permissions inside their assigned clients."
            : ""}
      </p>
      {editable && affected > 0 && (
        <p className="mb-3 rounded-lg border border-warning/40 bg-warning/8 px-3 py-2 text-[12px] text-foreground">
          Changes apply immediately to {affected} user{affected === 1 ? "" : "s"} with this role.
        </p>
      )}
      <PermissionPicker
        selected={role.permissions}
        disabled={!editable}
        onToggle={(perm) =>
          updateRole(role.id, {
            permissions: role.permissions.includes(perm)
              ? role.permissions.filter((p) => p !== perm)
              : [...role.permissions, perm],
          })
        }
      />
    </div>
  );
}

function AddRoleForm({
  existingNames,
  onCancel,
  onCreate,
}: {
  existingNames: string[];
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    scope: RoleScope;
    description: string;
    permissions: string[];
  }) => void;
}) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState<RoleScope>("Client-scoped");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([...standardSupervisorPermissions]);

  const duplicate = existingNames.some((n) => n.toLowerCase() === name.trim().toLowerCase());
  const valid =
    name.trim().length > 2 &&
    !duplicate &&
    (scope === "Platform-wide" || permissions.length > 0);

  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-3.5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Role Name">
          <TextInput value={name} onChange={setName} placeholder="Collections Team Lead" />
        </Field>
        <Field label="Scope">
          <SelectInput
            value={scope}
            options={["Client-scoped", "Platform-wide"]}
            onChange={(v) => setScope(v as RoleScope)}
          />
        </Field>
        <Field label="Description">
          <TextInput
            value={description}
            onChange={setDescription}
            placeholder="What this role is for"
          />
        </Field>
      </div>

      {duplicate && (
        <p className="mt-2 text-[11px] text-danger">A role with this name already exists.</p>
      )}

      {scope === "Platform-wide" ? (
        <p className="mt-4 rounded-lg border border-border bg-card px-3.5 py-3 text-[12px] text-muted-foreground">
          A platform-wide role works across every client and holds every permission. No client
          assignment is required.
        </p>
      ) : (
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-medium text-foreground">
            Permissions — what this role may do inside assigned clients
          </p>
          <PermissionPicker
            selected={permissions}
            onToggle={(perm) =>
              setPermissions((prev) =>
                prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
              )
            }
          />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Btn
          variant="primary"
          disabled={!valid}
          onClick={() => onCreate({ name: name.trim(), scope, description, permissions })}
        >
          Create Role
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </div>
  );
}
