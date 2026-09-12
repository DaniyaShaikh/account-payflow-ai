import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Btn, StatusPill, type Tone } from "@/components/payflow-ui";
import {
  ProfileSection,
  DataSourceSection,
  MappingSection,
  BrandingSection,
  AiGovernanceSection,
  SupervisorSection,
  mappingSummary,
  connectionTone,
  type ClientDraft,
} from "@/components/client-config-sections";
import { useRole } from "@/lib/role-context";
import { useUsers } from "@/lib/users-context";
import { makeConfig, type Client, type ClientConfig } from "@/lib/payflow-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clients/new")({
  head: () => ({
    meta: [
      { title: "Add Client — PayFlow Collections" },
      {
        name: "description",
        content:
          "Guided client onboarding: profile, data source, field mapping, branding, AI mode, governance rules and supervisor permissions.",
      },
      { property: "og:title", content: "Add Client — PayFlow Collections" },
      {
        property: "og:description",
        content: "Onboard a new organization into PayFlow collection operations.",
      },
    ],
  }),
  component: AddClientPage,
});

const steps = [
  "Client Profile",
  "Data Source",
  "Data Mapping",
  "Branding & Channels",
  "AI & Governance",
  "Supervisor & Permissions",
  "Review & Activate",
] as const;

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `client-${Date.now()}`
  );
}

function AddClientPage() {
  const { isAdmin, addClient } = useRole();
  const { users, assignClient } = useUsers();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<Client | null>(null);

  const [draft, setDraft] = useState<ClientDraft>({
    name: "",
    industry: "",
    aiMode: "Supervised AI",
    supervisors: [],
    config: makeConfig(),
  });

  const patch = (p: Partial<ClientDraft>) => setDraft((d) => ({ ...d, ...p }));
  const patchConfig = (p: Partial<ClientConfig>) =>
    setDraft((d) => ({ ...d, config: { ...d.config, ...p } }));

  const summary = mappingSummary(draft.config);

  const issues: string[] = [];
  if (!draft.name.trim()) issues.push("Client name is required");
  if (!draft.config.code.trim()) issues.push("Client code is required");
  if (!draft.config.dataSource) issues.push("A primary data source has not been selected");
  else if (draft.config.connection !== "Connected")
    issues.push(`${draft.config.dataSource} connection is not established`);
  if (summary.unmapped > 0) issues.push(`${summary.unmapped} field mapping(s) are unmapped`);
  if (summary.attention > 0) issues.push(`${summary.attention} field mapping(s) need attention`);
  if (!draft.config.channels.email && !draft.config.channels.sms)
    issues.push("At least one communication channel must be enabled");
  if (draft.supervisors.length === 0) issues.push("Assign at least one supervisor");

  const buildClient = (status: Client["status"]): Client => ({
    id: slugify(draft.name),
    name: draft.name.trim() || "Untitled Client",
    industry: draft.industry.trim() || "Collections",
    accounts: 0,
    activeCases: 0,
    aiMode: draft.aiMode,
    supervisors: draft.supervisors,
    status,
    outstanding: 0,
    recovered: 0,
    reviewsPending: 0,
    config: {
      ...draft.config,
      brandName: draft.config.brandName || draft.name.trim(),
      senderName: draft.config.senderName || `${draft.name.trim()} Collections`,
    },
  });

  /** Keep the user model in sync: assigning a supervisor here grants client access. */
  const syncSupervisorAccess = (client: Client) =>
    draft.supervisors.forEach((shortName) => {
      const user = users.find((u) => u.shortName === shortName || u.name === shortName);
      if (user) assignClient(user.id, client.id, client.name);
    });

  const saveDraft = () => {
    const client = buildClient("Draft");
    addClient(client);
    syncSupervisorAccess(client);
    navigate({ to: "/clients" });
  };

  const activate = () => {
    const client = buildClient("Active");
    addClient(client);
    syncSupervisorAccess(client);
    setCreated(client);
  };

  if (!isAdmin) {
    return (
      <Panel title="Client onboarding is restricted">
        <p className="text-sm text-muted-foreground">
          Only Operations Admin can create and configure clients. Switch the role preview to
          Operations Admin to continue.
        </p>
        <Link to="/clients" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to clients
        </Link>
      </Panel>
    );
  }

  if (created) {
    return (
      <>
        <PageHeader
          breadcrumb={[{ label: "Clients", to: "/clients" }, { label: created.name }]}
          title={`${created.name} is Ready for Operations`}
          description="Configuration saved. Customer accounts will appear once the first data sync completes."
        />
        <Panel title="Activation summary">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="success">Active</StatusPill>
            <StatusPill tone="info">{created.aiMode}</StatusPill>
            <StatusPill>{created.config.dataSource} data source</StatusPill>
            <StatusPill>Supervisors: {created.supervisors.join(", ") || "None"}</StatusPill>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/clients/$clientId" params={{ clientId: created.id }}>
              <Btn variant="primary">View Client</Btn>
            </Link>
            <Link to="/accounts">
              <Btn>View Accounts</Btn>
            </Link>
            <Link to="/clients">
              <Btn variant="ghost">Return to Clients</Btn>
            </Link>
          </div>
        </Panel>
      </>
    );
  }

  const sectionProps = { draft, patch, patchConfig };

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Clients", to: "/clients" }, { label: "Add Client" }]}
        title="Add Client"
        description="Onboard an organization and configure how PayFlow operates its collections."
        actions={<Btn onClick={saveDraft}>Save as Draft</Btn>}
      />

      <div className="mb-5 panel overflow-x-auto px-4 py-3">
        <ol className="flex min-w-max items-center gap-2">
          {steps.map((label, i) => {
            const state = i === step ? "current" : i < step ? "done" : "todo";
            return (
              <li key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className="flex items-center gap-2 text-left"
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                      state === "current" && "border-primary bg-primary text-primary-foreground",
                      state === "done" && "border-success/30 bg-success/10 text-success",
                      state === "todo" && "border-border text-muted-foreground",
                    )}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-[12px] font-medium whitespace-nowrap",
                      state === "current" ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </button>
                {i < steps.length - 1 && <span className="h-px w-6 bg-border" />}
              </li>
            );
          })}
        </ol>
      </div>

      <Panel
        title={`Step ${step + 1} of ${steps.length} · ${steps[step]}`}
        description={stepDescriptions[step] ?? ""}
      >
        {step === 0 && <ProfileSection {...sectionProps} />}
        {step === 1 && <DataSourceSection {...sectionProps} />}
        {step === 2 && <MappingSection {...sectionProps} />}
        {step === 3 && <BrandingSection {...sectionProps} />}
        {step === 4 && <AiGovernanceSection {...sectionProps} />}
        {step === 5 && <SupervisorSection {...sectionProps} />}
        {step === 6 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ReviewBlock
                title="Client Profile"
                rows={[
                  draft.name || "—",
                  draft.config.code || "—",
                  draft.config.clientType,
                  draft.config.useCase,
                ]}
              />
              <ReviewBlock
                title="Data Source"
                rows={[draft.config.dataSource ?? "Not selected", draft.config.connection]}
                tone={connectionTone(draft.config.connection)}
              />
              <ReviewBlock
                title="Data Mapping"
                rows={[
                  `${summary.mapped} Mapped`,
                  `${summary.attention} Needs Attention`,
                  `${summary.unmapped} Unmapped`,
                ]}
              />
              <ReviewBlock
                title="Channels"
                rows={[
                  `Email: ${draft.config.channels.email ? "Enabled" : "Disabled"}`,
                  `SMS: ${draft.config.channels.sms ? "Enabled" : "Disabled"}`,
                  "WhatsApp: Coming Later",
                ]}
              />
              <ReviewBlock title="AI Mode" rows={[draft.aiMode]} />
              <ReviewBlock
                title="Governance"
                rows={
                  draft.aiMode === "Autopilot"
                    ? ["Operating boundaries apply"]
                    : draft.config.governanceRules.length
                      ? [
                          `${draft.config.governanceRules.length} Rules Applied`,
                          ...draft.config.governanceRules,
                        ]
                      : ["No client-specific governance rules configured"]
                }
              />
              <ReviewBlock
                title="Supervisors"
                rows={draft.supervisors.length ? draft.supervisors : ["None assigned"]}
              />
              <ReviewBlock
                title="Permissions"
                rows={[`${draft.config.permissions.length} permissions enabled`]}
              />
            </div>

            <div
              className={cn(
                "rounded-lg border p-4",
                issues.length
                  ? "border-warning/30 bg-warning/10"
                  : "border-success/20 bg-success/10",
              )}
            >
              <p className="text-[13px] font-semibold text-foreground">
                {issues.length
                  ? `${issues.length} Item${issues.length > 1 ? "s" : ""} Require Attention`
                  : "Ready for Activation"}
              </p>
              {issues.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {issues.map((issue) => (
                    <li key={issue} className="text-[12px] text-muted-foreground">
                      · {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Panel>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Btn onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Btn>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={saveDraft}>
            Save as Draft
          </Btn>
          {step < steps.length - 1 ? (
            <Btn variant="primary" onClick={() => setStep((s) => s + 1)}>
              Continue
            </Btn>
          ) : (
            <Btn variant="primary" onClick={activate} disabled={issues.length > 0}>
              Activate Client
            </Btn>
          )}
        </div>
      </div>
    </>
  );
}

const stepDescriptions = [
  "Basic client information.",
  "Select the single primary operational data source.",
  "Map incoming client fields to PayFlow customer account fields.",
  "How customer-facing communications represent this client.",
  "How PayFlow operates collection activity for this client.",
  "Who supervises this client, and what they can access.",
  "Confirm configuration before activation.",
];

function ReviewBlock({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: string[];
  tone?: Tone;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
      <p className="text-eyebrow">{title}</p>
      <div className="mt-1.5 space-y-0.5">
        {rows.map((r, i) => (
          <p
            key={r + i}
            className={cn(
              "text-[13px]",
              i === 0 ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {r}
          </p>
        ))}
      </div>
      {tone && tone !== "neutral" && <span className="sr-only">{tone}</span>}
    </div>
  );
}
