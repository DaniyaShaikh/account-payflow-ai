import {
  Field,
  TextInput,
  SelectInput,
  ChoiceCard,
  ToggleRow,
  Btn,
  StatusPill,
  DataTable,
  Td,
  type Tone,
} from "@/components/payflow-ui";
import {
  payflowFields,
  governanceRuleLibrary,
  type AiMode,
  type ClientConfig,
  type ClientType,
  type ConnectionState,
  type DataSource,
  type MappingStatus,
} from "@/lib/payflow-data";
import { useUsers } from "@/lib/users-context";
import { permissionGroups } from "@/lib/users-data";
import { cn } from "@/lib/utils";

export interface ClientDraft {
  name: string;
  industry: string;
  aiMode: AiMode;
  supervisors: string[];
  config: ClientConfig;
}

export interface SectionProps {
  draft: ClientDraft;
  patch: (p: Partial<ClientDraft>) => void;
  patchConfig: (p: Partial<ClientConfig>) => void;
}

export function connectionTone(state: ConnectionState): Tone {
  switch (state) {
    case "Connected":
      return "success";
    case "Connecting":
      return "info";
    case "Connection Failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function mappingTone(status: MappingStatus): Tone {
  switch (status) {
    case "Mapped":
      return "info";
    case "Validated":
      return "success";
    case "Needs Attention":
      return "warning";
    default:
      return "danger";
  }
}

export function mappingSummary(config: ClientConfig) {
  return {
    mapped: config.mappings.filter((m) => m.status === "Mapped" || m.status === "Validated").length,
    attention: config.mappings.filter((m) => m.status === "Needs Attention").length,
    unmapped: config.mappings.filter((m) => m.status === "Unmapped").length,
  };
}

/* ---------------- Profile ---------------- */

export function ProfileSection({ draft, patch, patchConfig }: SectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Client Name">
        <TextInput value={draft.name} onChange={(v) => patch({ name: v })} placeholder="PayPal" />
      </Field>
      <Field label="Client Code / Reference">
        <TextInput
          value={draft.config.code}
          onChange={(v) => patchConfig({ code: v })}
          placeholder="PP-CLT-004"
        />
      </Field>
      <Field label="Client Type">
        <SelectInput
          value={draft.config.clientType}
          options={["First Party", "Third Party"]}
          onChange={(v) => patchConfig({ clientType: v as ClientType })}
        />
      </Field>
      <Field label="Industry">
        <TextInput
          value={draft.industry}
          onChange={(v) => patch({ industry: v })}
          placeholder="Payments"
        />
      </Field>
      <Field label="Business Use Case" hint="Additional use cases arrive in a later phase.">
        <SelectInput value="Collections" options={["Collections"]} onChange={() => {}} />
      </Field>
    </div>
  );
}

/* ---------------- Data source ---------------- */

export function DataSourceSection({
  draft,
  patchConfig,
}: SectionProps & { onTest?: () => void }) {
  const { dataSource, connection } = draft.config;

  const select = (source: DataSource) =>
    patchConfig({
      dataSource: source,
      connection: source === dataSource ? connection : "Not Connected",
    });

  const test = () => {
    patchConfig({ connection: "Connecting" });
    window.setTimeout(() => patchConfig({ connection: "Connected" }), 900);
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        Where will PayFlow receive customer and account data for this client? One primary
        operational source only.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          title="CRM"
          description="PayFlow receives customer and account records from the client's CRM system."
          selected={dataSource === "CRM"}
          onSelect={() => select("CRM")}
        />
        <ChoiceCard
          title="ACE"
          description="PayFlow receives customer and account records from the ACE collection platform."
          selected={dataSource === "ACE"}
          onSelect={() => select("ACE")}
        />
      </div>

      {dataSource && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                {dataSource} connection
              </p>
              <p className="text-[11px] text-muted-foreground">
                Connection details are confirmed with the client during technical setup.
              </p>
            </div>
            <StatusPill tone={connectionTone(connection)}>{connection}</StatusPill>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Environment">
              <SelectInput value="Sandbox" options={["Sandbox", "Production"]} onChange={() => {}} />
            </Field>
            <Field label="Sync Frequency">
              <SelectInput
                value="Every 15 minutes"
                options={["Every 15 minutes", "Hourly", "Daily"]}
                onChange={() => {}}
              />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn onClick={test} disabled={connection === "Connecting"}>
              Test Connection
            </Btn>
            <Btn variant="ghost" onClick={() => patchConfig({ connection: "Connection Failed" })}>
              Simulate failure
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Mapping ---------------- */

const mappingStatuses: MappingStatus[] = ["Mapped", "Validated", "Needs Attention", "Unmapped"];

export function MappingSection({ draft, patchConfig }: SectionProps) {
  const summary = mappingSummary(draft.config);

  const setField = (index: number, payflowField: string) => {
    const mappings = draft.config.mappings.map((m, i) =>
      i === index
        ? {
            ...m,
            payflowField,
            status: (payflowField === "— Not mapped —"
              ? "Unmapped"
              : "Mapped") as MappingStatus,
          }
        : m,
    );
    patchConfig({ mappings });
  };

  const setStatus = (index: number, status: MappingStatus) => {
    patchConfig({
      mappings: draft.config.mappings.map((m, i) => (i === index ? { ...m, status } : m)),
    });
  };

  if (!draft.config.dataSource) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Select a data source first to map incoming fields.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="info">{summary.mapped} Mapped</StatusPill>
        <StatusPill tone="warning">{summary.attention} Need Attention</StatusPill>
        <StatusPill tone={summary.unmapped ? "danger" : "neutral"}>
          {summary.unmapped} Unmapped
        </StatusPill>
      </div>
      <DataTable head={["Source Field", "PayFlow Field", "Sample Value", "Status"]}>
        {draft.config.mappings.map((m, i) => (
          <tr key={m.sourceField} className="border-b border-border last:border-0">
            <Td className="tabular text-muted-foreground">{m.sourceField}</Td>
            <Td>
              <SelectInput
                value={m.payflowField}
                options={payflowFields}
                onChange={(v) => setField(i, v)}
              />
            </Td>
            <Td className="tabular text-muted-foreground">{m.sampleValue}</Td>
            <Td>
              <select
                value={m.status}
                onChange={(e) => setStatus(i, e.target.value as MappingStatus)}
                className="rounded-md border border-border bg-card px-2 py-1 text-[12px] outline-none"
              >
                {mappingStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Td>
          </tr>
        ))}
      </DataTable>
      <p className="text-[11px] text-muted-foreground">
        These illustrative mappings define how operational data is interpreted, not a finalized
        mandatory schema. Default mappings are prefilled where the source field name matches a
        PayFlow field.
      </p>
    </div>
  );
}

/* ---------------- Branding & channels ---------------- */

export function BrandingSection({ draft, patchConfig }: SectionProps) {
  const c = draft.config;
  const thirdParty = c.clientType === "Third Party";
  // Central branding rule: First Party uses client branding, Third Party uses the
  // collection operator (PayFlow) branding on behalf of the client.
  const clientBrand = c.brandName || draft.name || "Client";
  const brand = thirdParty ? "PayFlow Collections" : clientBrand;
  const initials = brand.slice(0, 2).toUpperCase();

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {thirdParty
            ? `This is a Third Party client, so customer-facing communications and the payment page use PayFlow collection-operator branding on behalf of ${clientBrand}.`
            : `This is a First Party client, so customer-facing communications and the payment page use ${clientBrand} branding.`}
        </p>
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md border border-border bg-surface text-[13px] font-semibold text-foreground">
            {initials}
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">Client Logo</p>
            <p className="text-[11px] text-muted-foreground">
              Logo upload is handled during technical setup; initials are used meanwhile.
            </p>
          </div>
        </div>
        <Field label="Display / Brand Name">
          <TextInput value={c.brandName} onChange={(v) => patchConfig({ brandName: v })} />
        </Field>
        <Field label="Sender Name">
          <TextInput value={c.senderName} onChange={(v) => patchConfig({ senderName: v })} />
        </Field>

        <div className="rounded-lg border border-border bg-card px-3 divide-y divide-border">
          <ToggleRow
            label="Email"
            description="Reminders, statements and payment links"
            checked={c.channels.email}
            onChange={(v) => patchConfig({ channels: { ...c.channels, email: v } })}
          />
          <ToggleRow
            label="SMS"
            description="Short reminders and payment links"
            checked={c.channels.sms}
            onChange={(v) => patchConfig({ channels: { ...c.channels, sms: v } })}
          />
          <ToggleRow label="WhatsApp" badge="Coming Later" checked={false} disabled />
        </div>

        {c.channels.email && (
          <Field label="Email From Address">
            <TextInput value={c.emailFrom} onChange={(v) => patchConfig({ emailFrom: v })} />
          </Field>
        )}
        {c.channels.sms && (
          <Field label="SMS Sender ID">
            <TextInput value={c.smsSenderId} onChange={(v) => patchConfig({ smsSenderId: v })} />
          </Field>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-eyebrow">Customer-facing preview</p>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            <div className="grid size-7 place-items-center rounded bg-surface text-[11px] font-semibold">
              {initials}
            </div>
            <div className="text-[12px]">
              <p className="font-medium text-foreground">{c.senderName || brand}</p>
              <p className="text-muted-foreground">{c.emailFrom}</p>
            </div>
          </div>
          <p className="mt-3 text-[13px] font-medium text-foreground">
            Your {brand} balance is past due
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            Hello John, your outstanding balance of $4,250 is now overdue. You can settle it
            securely, or set up a payment plan that works for you.
          </p>
          <span className="mt-3 inline-block rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground">
            Pay now
          </span>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-eyebrow mb-2">SMS · {c.smsSenderId || "SENDER"}</p>
          <p className="rounded-lg bg-surface px-3 py-2 text-[12px] text-foreground">
            {brand}: your balance of $4,250 is overdue. Pay or arrange a plan here: pay.fl/x9k2
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- AI & governance ---------------- */

export function AiGovernanceSection({ draft, patch, patchConfig }: SectionProps) {
  const rules = draft.config.governanceRules;

  const toggleRule = (rule: string) =>
    patchConfig({
      governanceRules: rules.includes(rule)
        ? rules.filter((r) => r !== rule)
        : [...rules, rule],
    });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] font-semibold text-foreground">AI Operating Mode</p>
        <p className="text-[12px] text-muted-foreground">
          How should PayFlow operate collection activity for this client?
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          title="Autopilot"
          description="PayFlow performs routine collection decisions and actions autonomously within configured operating boundaries. Routine human approval is not required; security and compliance controls still apply."
          selected={draft.aiMode === "Autopilot"}
          onSelect={() => patch({ aiMode: "Autopilot" })}
        />
        <ChoiceCard
          title="Supervised AI"
          description="PayFlow performs the operational work, while configured governance rules determine when supervisor review is required."
          selected={draft.aiMode === "Supervised AI"}
          onSelect={() => patch({ aiMode: "Supervised AI" })}
        />
      </div>

      {draft.aiMode === "Supervised AI" && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-foreground">Governance Rules</p>
            <Btn variant="ghost">+ Create Rule</Btn>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Select existing rules. Full rule authoring arrives with the Rule Builder.
          </p>
          <div className="mt-3 space-y-1">
            {governanceRuleLibrary.map((rule) => (
              <label
                key={rule}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-card"
              >
                <input
                  type="checkbox"
                  checked={rules.includes(rule)}
                  onChange={() => toggleRule(rule)}
                  className="size-3.5 accent-[var(--primary)]"
                />
                <span className="text-[13px] text-foreground">{rule}</span>
              </label>
            ))}
          </div>
          {rules.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
              {rules.map((r) => (
                <StatusPill key={r} tone="info">
                  {r}
                </StatusPill>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Supervisors & permissions ---------------- */

export function SupervisorSection({ draft, patch, patchConfig }: SectionProps) {
  const { users } = useUsers();
  const supervisorUsers = users.filter((u) => u.role === "Supervisor");

  const toggleSupervisor = (name: string) =>
    patch({
      supervisors: draft.supervisors.includes(name)
        ? draft.supervisors.filter((s) => s !== name)
        : [...draft.supervisors, name],
    });

  const togglePermission = (perm: string) =>
    patchConfig({
      permissions: draft.config.permissions.includes(perm)
        ? draft.config.permissions.filter((p) => p !== perm)
        : [...draft.config.permissions, perm],
    });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <p className="text-[13px] font-semibold text-foreground">Assigned Supervisors</p>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Assignment decides where a supervisor works. Supervisors only see assigned clients.
        </p>
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {supervisorUsers.map((user) => (
            <label
              key={user.id}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5"
            >
              <input
                type="checkbox"
                checked={draft.supervisors.includes(user.shortName)}
                onChange={() => toggleSupervisor(user.shortName)}
                className="size-3.5 accent-[var(--primary)]"
              />
              <span className="text-[13px] text-foreground">{user.name}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">{user.status}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-foreground">Client Permissions</p>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Permissions decide what assigned supervisors may do for this client.
        </p>
        <div className="grid gap-3 rounded-lg border border-border bg-card p-3">
          {permissionGroups.map((group) => (
            <div key={group.group}>
              <p className="text-eyebrow">{group.group}</p>
              {group.permissions.map((perm) => (
                <label key={perm} className="flex cursor-pointer items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    checked={draft.config.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="size-3.5 accent-[var(--primary)]"
                  />
                  <span className={cn("text-[12px] text-foreground")}>{perm}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
