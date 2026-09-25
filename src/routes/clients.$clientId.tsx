import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ReviewQueue } from "@/components/review-queue";
import { JourneyLibrary } from "@/components/journey-library";
import { PortfolioSection } from "@/components/portfolio-section";
import { CommunicationTable } from "@/components/communication-table";
import { journeysForClient } from "@/lib/journey-data";
import { communicationsForClient } from "@/lib/communication-data";

import {
  PageHeader,
  Panel,
  KpiCard,
  DataTable,
  Td,
  Tr,
  StatusPill,
  statusTone,
  FilterSelect,
  
  Btn,
  EmptyState,
  PrimaryCell,
  SectionHeading,
  SearchInput,
  TabBar,
} from "@/components/payflow-ui";
import { useRules } from "@/lib/rules-context";
import { ruleConditionSummary, statusToneForRule } from "@/lib/rules-data";
import {
  ProfileSection,
  DataSourceSection,
  MappingSection,
  BrandingSection,
  AiGovernanceSection,
  mappingSummary,
  connectionTone,
  type ClientDraft,
} from "@/components/client-config-sections";
import { useRole } from "@/lib/role-context";
import { buildIntegrations, integrationTone } from "@/lib/integration-data";
import { intakeForClient } from "@/lib/intake-data";
import { useUsers } from "@/lib/users-context";
import { ClientSupervisorAccess } from "@/components/user-access";
import {
  accounts as allAccounts,
  activity,
  collectionStatuses,
  journeys,
  formatCurrency,
  formatNumber,
  type ClientConfig,
  type Client,
  type CustomerAccount,
} from "@/lib/payflow-data";
import { cn } from "@/lib/utils";
import { useStrategies } from "@/lib/strategy-context";

export const Route = createFileRoute("/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client detail — PayFlow Collections" },
      {
        name: "description",
        content:
          "Client overview with customer accounts, outstanding balances, active collection cases, pending human reviews and client-level configuration.",
      },
      { property: "og:title", content: "Client detail — PayFlow Collections" },
      {
        property: "og:description",
        content: "Customer accounts, performance and configuration for a single PayFlow client.",
      },
    ],
  }),
  component: ClientDetail,
});

const tabs = [
  "Overview",
  "Sub-Clients / Portfolios",
  "Accounts",
  "Workflows",
  "Communications",
  "Rules",
  "Human Reviews",
  "Configuration",
] as const;

const configSections = [
  "General",
  "Data Source",
  "Data Mapping",
  "Branding & Channels",
  "AI & Governance",
  "Supervisors & Permissions",
] as const;

function ClientDetail() {
  const { clientId } = Route.useParams();
  const { canSeeClient, allClients, updateClient, isAdmin } = useRole();
  const { supervisorsForClient } = useUsers();
  const assignedSupervisors = supervisorsForClient(clientId);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");

  const client = allClients.find((c) => c.id === clientId);
  const accounts = useMemo(
    () => allAccounts.filter((a) => a.clientId === clientId),
    [clientId],
  );
  const clientActivity = activity.filter((a) => a.clientId === clientId);

  if (!client || !canSeeClient(clientId)) {
    return (
      <Panel title="No access to this client">
        <p className="text-sm text-muted-foreground">
          This client is either unavailable or not assigned to your supervisor account. Switch to the
          Operations Admin view to see all clients.
        </p>
        <Link to="/clients" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to clients
        </Link>
      </Panel>
    );
  }

  const draft: ClientDraft = {
    name: client.name,
    industry: client.industry,
    aiMode: client.aiMode,
    supervisors: client.supervisors,
    config: client.config,
  };
  const patch = (p: Partial<ClientDraft>) => {
    const { config, ...rest } = p;
    updateClient(client.id, {
      ...rest,
      ...(config ? { config } : {}),
    });
  };
  const patchConfig = (p: Partial<ClientConfig>) =>
    updateClient(client.id, { config: { ...client.config, ...p } });

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Clients", to: "/clients" }, { label: client.name }]}
        title={client.name}
        description={`${client.industry} · ${client.config.code || "No client code"} · ${client.config.clientType}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={client.status === "Active" ? "success" : "neutral"}>
              {client.status}
            </StatusPill>
            <StatusPill tone={client.aiMode === "Autopilot" ? "info" : "neutral"}>
              {client.aiMode}
            </StatusPill>
            <StatusPill tone={connectionTone(client.config.connection)}>
              {client.config.dataSource ?? "No data source"}
            </StatusPill>
            <StatusPill>
              Supervisor:{" "}
              {assignedSupervisors.map((s) => s.name).join(", ") || "None assigned"}
            </StatusPill>
          </div>
        }
      />

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "Overview" && (
        <ClientOverview
          client={client}
          activityItems={clientActivity}
          reviewCount={accounts.filter((a) => a.humanReview).length}
        />
      )}

      {tab === "Sub-Clients / Portfolios" && (
        <PortfolioSection clientId={client.id} clientName={client.name} canEdit={isAdmin} />
      )}

      {tab === "Accounts" && <ClientAccounts clientName={client.name} accounts={accounts} />}

      {tab === "Workflows" && (
        <Panel
          title="Workflows"
          description={`Global workflows in use by ${client.name} and ${client.name}-specific workflows`}
        >
          <JourneyLibrary journeys={journeysForClient(client.id)} showClientFilter={false} />
        </Panel>
      )}
      {tab === "Communications" && (
        <Panel
          title="Communications"
          description={`Customer communications sent for ${client.name} accounts`}
        >
          <CommunicationTable rows={communicationsForClient(client.id)} showClientFilter={false} />
        </Panel>
      )}

      {tab === "Rules" && <ClientRules clientId={client.id} clientName={client.name} />}
      {tab === "Human Reviews" && (
        <ReviewQueue
          clientId={client.id}
          title="Human Reviews"
          description={`Exceptions from ${client.name} awaiting a supervisor decision`}
        />
      )}

      {tab === "Configuration" && (
        <ClientConfiguration
          readOnly={!isAdmin}
          clientId={clientId}
          draft={draft}
          patch={patch}
          patchConfig={patchConfig}
          onOpenPortfolios={() => setTab("Sub-Clients / Portfolios")}
        />
      )}
    </>
  );
}

function ClientOverview({
  client,
  activityItems,
  reviewCount,
}: {
  client: Client;
  activityItems: { text: string; at: string }[];
  reviewCount: number;
}) {
  const funnel = [
    { label: "Sent", value: Math.round(client.activeCases * 3.9) },
    { label: "Delivered", value: Math.round(client.activeCases * 3.74) },
    { label: "Opened / Read", value: Math.round(client.activeCases * 2.76) },
    { label: "Clicked", value: Math.round(client.activeCases * 1.15) },
    { label: "Paid", value: Math.round(client.activeCases * 0.68) },
  ];
  const max = funnel[0]?.value || 1;
  const intake = intakeForClient(client);

  return (
    <>
      <Panel
        title="Latest Source File"
        description="Every figure on this page is based on the most recently received and assigned file"
        className="mb-5"
      >
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-eyebrow">File Received</p>
            <p className="text-[13px] font-semibold text-foreground">{intake.receivedAt}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {intake.fileName} · {intake.source}
            </p>
          </div>
          <div>
            <p className="text-eyebrow">Assigned To Collections</p>
            <p className="text-[13px] font-semibold text-foreground">{intake.assignedAt}</p>
          </div>
          <div>
            <p className="text-eyebrow">Accounts In This File</p>
            <p className="tabular text-[13px] font-semibold text-foreground">
              {formatNumber(intake.accountsInFile)}
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Previous file {formatNumber(intake.previousAccounts)}
            </p>
          </div>
          <div>
            <p className="text-eyebrow">Change Since Previous File</p>
            <p className="tabular text-[13px] font-semibold text-foreground">
              +{formatNumber(intake.newAccounts)} new · −{formatNumber(intake.removedAccounts)}{" "}
              removed
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Removed accounts were paid or closed at the client
            </p>
          </div>
        </div>
      </Panel>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Customer Accounts" value={formatNumber(client.accounts)} />
        <KpiCard label="Active Cases" value={formatNumber(client.activeCases)} />
        <KpiCard label="Outstanding" value={formatCurrency(client.outstanding, true)} />
        <KpiCard label="Recovered" value={formatCurrency(client.recovered, true)} />
        <KpiCard label="Human Reviews" value={formatNumber(client.reviewsPending)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Collection Summary"
          description={`Based on the file received ${intake.receivedAt}`}
        >
          <dl className="divide-y divide-border">
            {[
              ["Accounts under collection", formatNumber(client.activeCases)],
              ["Outstanding balance", formatCurrency(client.outstanding)],
              ["Amount recovered", formatCurrency(client.recovered)],
              [
                "Recovery rate",
                `${Math.round((client.recovered / (client.recovered + client.outstanding || 1)) * 100)}%`,
              ],
              ["Accounts in human review", formatNumber(reviewCount)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-[13px] text-muted-foreground">{label}</dt>
                <dd className="tabular text-[13px] font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Communication Performance" description="Last 30 days, this client only">
          <div className="space-y-2.5">
            {funnel.map((stage, i) => {
              const prev = funnel[i - 1]?.value;
              return (
                <div key={stage.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-foreground">{stage.label}</span>
                    <span className="tabular text-[13px] font-medium">
                      {formatNumber(stage.value)}
                      {prev && (
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {((stage.value / prev) * 100).toFixed(1)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${(stage.value / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Recent Operational Activity" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {activityItems.length === 0 && (
              <li className="px-4 py-3 text-[13px] text-muted-foreground">
                No activity recorded yet.
              </li>
            )}
            {activityItems.map((item) => (
              <li key={item.text} className="flex items-start justify-between gap-3 px-4 py-3">
                <p className="text-[13px]">{item.text}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{item.at}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Attention Required">
          <ul className="space-y-2">
            {[
              client.attention,
              client.reviewsPending
                ? `${client.reviewsPending} human reviews awaiting supervisor decision`
                : null,
              client.config.connection !== "Connected"
                ? `${client.config.dataSource ?? "Data source"} connection is ${client.config.connection.toLowerCase()}`
                : null,
            ]
              .filter(Boolean)
              .map((item) => (
                <li
                  key={item as string}
                  className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[13px]"
                >
                  {item}
                </li>
              ))}
            {!client.attention && !client.reviewsPending && (
              <li className="text-[13px] text-muted-foreground">Nothing requires attention.</li>
            )}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function ClientAccounts({
  clientName,
  accounts,
}: {
  clientName: string;
  accounts: CustomerAccount[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [journey, setJourney] = useState("All Workflows");
  const [review, setReview] = useState("All Accounts");

  const rows = accounts.filter((a) => {
    const q = search.trim().toLowerCase();
    if (q && !`${a.customer} ${a.reference}`.toLowerCase().includes(q)) return false;
    if (status !== "All Statuses" && a.status !== status) return false;
    if (journey !== "All Workflows" && a.journey !== journey) return false;
    if (review === "Human Review Only" && !a.humanReview) return false;
    if (review === "No Human Review" && a.humanReview) return false;
    return true;
  });

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">
        Customer accounts belonging to {clientName}. Each row is a customer being collected from, not
        a client.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customer or reference"
          className="w-60"
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...collectionStatuses]}
        />
        <FilterSelect
          label="Workflow"
          value={journey}
          onChange={setJourney}
          options={["All Workflows", ...journeys]}
        />
        <FilterSelect
          label="Human Review"
          value={review}
          onChange={setReview}
          options={["All Accounts", "Human Review Only", "No Human Review"]}
        />
      </div>
      <DataTable
        head={[
          "Customer",
          "Account Reference",
          "Outstanding",
          "Status",
          "Workflow",
          "Last Action",
          "Next Action",
          "Human Review",
        ]}
      >
        {rows.map((a) => (
          <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface">
            <Td>
              <Link
                to="/accounts/$accountId"
                params={{ accountId: a.id }}
                className="font-medium text-foreground hover:underline"
              >
                {a.customer}
              </Link>
            </Td>
            <Td className="tabular text-muted-foreground">{a.reference}</Td>
            <Td className="tabular font-medium">{formatCurrency(a.outstanding)}</Td>
            <Td>
              <StatusPill tone={statusTone(a.status)}>{a.status}</StatusPill>
            </Td>
            <Td className="text-muted-foreground">{a.journey}</Td>
            <Td className="text-muted-foreground">{a.lastAction}</Td>
            <Td className="text-muted-foreground">{a.nextAction}</Td>
            <Td>
              {a.humanReview ? (
                <StatusPill tone="danger">Pending</StatusPill>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <Td className="text-muted-foreground">No accounts match these filters.</Td>
          </tr>
        )}
      </DataTable>
    </>
  );
}

function ClientConfiguration({
  readOnly,
  clientId,
  draft,
  patch,
  patchConfig,
  onOpenPortfolios,
}: {
  readOnly: boolean;
  clientId: string;
  draft: ClientDraft;
  patch: (p: Partial<ClientDraft>) => void;
  patchConfig: (p: Partial<ClientConfig>) => void;
  onOpenPortfolios: () => void;
}) {
  const [section, setSection] = useState<(typeof configSections)[number]>("General");
  const { permissionsForClient } = useRole();
  const myPermissions = permissionsForClient(clientId);
  const summary = mappingSummary(draft.config);
  const props = { draft, patch, patchConfig };
  const jump = readOnly ? undefined : (s: (typeof configSections)[number]) => setSection(s);
  const overviewPanel = (
    <ConfigurationOverview
      clientId={clientId}
      draft={draft}
      onJump={jump}
      onOpenPortfolios={onOpenPortfolios}
    />
  );

  if (readOnly) {
    return (
      <div className="space-y-4">
        {overviewPanel}
        <Panel title="Configuration is read-only">
          <p className="text-sm text-muted-foreground">
            Supervisors can view client operations but not change client configuration. Switch the
            role preview to Operations Admin to edit.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill>{draft.config.dataSource ?? "No data source"}</StatusPill>
            <StatusPill>{draft.aiMode}</StatusPill>
            <StatusPill>{summary.mapped} fields mapped</StatusPill>
          </div>
          <div className="mt-3">
            <ClientDataSourceIntegration clientId={clientId} />
          </div>
        </Panel>
        <Panel title="Your access for this client" description="What you may do for this client">
          <div className="flex flex-wrap gap-1.5">
            {myPermissions.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No permissions granted.</p>
            ) : (
              myPermissions.map((p) => <StatusPill key={p}>{p}</StatusPill>)
            )}
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {overviewPanel}
      <div className="grid gap-4 lg:grid-cols-[210px_1fr]">
        <nav className="panel h-fit p-1.5">
          {configSections.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={cn(
                "block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors",
                section === s
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </nav>

        <Panel title={section} action={<Btn variant="ghost">Changes save automatically</Btn>}>
          {section === "General" && <ProfileSection {...props} />}
          {section === "Data Source" && (
            <div className="space-y-4">
              <ClientDataSourceIntegration clientId={clientId} />
              <DataSourceSection {...props} />
            </div>
          )}
          {section === "Data Mapping" && <MappingSection {...props} />}
          {section === "Branding & Channels" && <BrandingSection {...props} />}
          {section === "AI & Governance" && <AiGovernanceSection {...props} />}
          {section === "Supervisors & Permissions" && (
            <ClientSupervisorAccess clientId={clientId} clientName={draft.name} editable />
          )}
        </Panel>
      </div>
    </div>
  );
}

type Check = { label: string; done: boolean; detail: string; required: boolean };

function ConfigurationOverview({
  clientId,
  draft,
  onJump,
  onOpenPortfolios,
}: {
  clientId: string;
  draft: ClientDraft;
  onJump: ((s: (typeof configSections)[number]) => void) | undefined;
  onOpenPortfolios: () => void;
}) {
  const { portfoliosForClient } = useStrategies();
  const { supervisorsForClient } = useUsers();
  const portfolios = portfoliosForClient(clientId);
  const activePf = portfolios.filter((p) => p.status === "Active").length;
  const c = draft.config;
  const m = mappingSummary(c);
  const totalFields = c.mappings.length;
  const channels = [c.channels.email && "Email", c.channels.sms && "SMS"].filter(Boolean) as string[];
  const supervisorCount = supervisorsForClient(clientId).length;
  const { allClients } = useRole();
  const fullClient = allClients.find((x) => x.id === clientId);
  const intake = fullClient ? intakeForClient(fullClient) : undefined;

  const checks: Check[] = [
    { label: "Client profile", done: !!draft.name && !!c.code, detail: c.code || "Client code missing", required: true },
    { label: "Data source selected", done: !!c.dataSource, detail: c.dataSource ?? "Not selected", required: true },
    { label: "Data source connected", done: c.connection === "Connected", detail: c.connection, required: true },
    { label: "Required fields mapped", done: m.unmapped === 0 && m.attention === 0 && m.mapped > 0, detail: `${m.mapped}/${totalFields} mapped`, required: true },
    { label: "Branding configured", done: !!c.brandName && !!c.senderName, detail: c.brandName || "Brand name missing", required: true },
    { label: "Channel enabled", done: channels.length > 0, detail: channels.join(", ") || "None", required: true },
    { label: "Supervisor assigned", done: supervisorCount > 0, detail: `${supervisorCount} assigned`, required: true },
    { label: "Sub-Client / Portfolio", done: portfolios.length > 0, detail: `${portfolios.length} configured`, required: false },
    { label: "Client governance rules", done: c.governanceRules.length > 0, detail: c.governanceRules.length ? `${c.governanceRules.length} applied` : "System rules apply", required: false },
  ];
  const done = checks.filter((x) => x.done).length;
  const pct = Math.round((done / checks.length) * 100);
  const blockers = checks.filter((x) => x.required && !x.done);
  const ready = blockers.length === 0;

  const card = (
    title: string,
    tone: NonNullable<Parameters<typeof StatusPill>[0]["tone"]>,
    status: string,
    lines: string[],
    onClick?: () => void,
    cta?: string,
  ) => (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <StatusPill tone={tone} dot>{status}</StatusPill>
      </div>
      <ul className="mt-2 space-y-0.5 text-[12.5px] text-foreground">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      {onClick && (
        <button onClick={onClick} className="mt-2 text-[12px] font-semibold text-primary hover:underline">
          {cta ?? "Configure"}
        </button>
      )}
    </div>
  );

  return (
    <Panel
      title="Client configuration overview"
      description="Single source of truth for how this client is set up. Account and case activity lives in the Accounts tab."
      action={
        <StatusPill tone={ready ? "success" : "warning"} dot>
          {ready ? "Ready for activation" : `${blockers.length} blocker${blockers.length > 1 ? "s" : ""}`}
        </StatusPill>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {card("Client", statusTone(draft.config.connection === "Connected" ? "Active" : "Onboarding"), c.clientType, [
          draft.name,
          `${draft.industry} · ${c.code || "No code"}`,
          `${c.useCase} · ${draft.aiMode}`,
        ], onJump && (() => onJump("General")))}
        {card("Sub-Clients / Portfolios", portfolios.length ? "success" : "neutral", `${portfolios.length} total`, [
          `${activePf} active`,
          `${portfolios.length - activePf} onboarding / other`,
        ], onOpenPortfolios, "Manage portfolios")}
        {card("Data Source", connectionTone(c.connection), c.connection, [
          c.dataSource ?? "No source selected",
          `Last file: ${intake?.receivedAt ?? "—"}`,
        ], onJump && (() => onJump("Data Source")))}
        {card("Data Mapping", m.unmapped || m.attention ? "warning" : "success", `${m.mapped}/${totalFields} mapped`, [
          `${m.attention} need attention`,
          `${m.unmapped} unmapped`,
        ], onJump && (() => onJump("Data Mapping")))}
        {card("Branding & Communication", c.brandName && channels.length ? "success" : "warning", c.clientType === "First Party" ? "Client branded" : "PayFlow branded", [
          `${c.senderName || "No sender"} · ${c.emailFrom}`,
          `Channels: ${channels.join(", ") || "None"} · WhatsApp coming later`,
        ], onJump && (() => onJump("Branding & Channels")))}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Onboarding progress</p>
            <span className="tabular text-[13px] font-semibold">{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">{done} of {checks.length} steps complete</p>
        </div>
      </div>

      <div className="mt-4">
        <SectionHeading title="Activation readiness" />
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {checks.map((x) => (
            <li key={x.label} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-[12.5px]">
              <span className="flex items-center gap-2">
                <span className={cn("inline-block h-2 w-2 rounded-full", x.done ? "bg-success" : x.required ? "bg-warning" : "bg-muted-foreground")} />
                {x.label}
                {!x.required && <span className="text-[11px] text-muted-foreground">(informational)</span>}
              </span>
              <span className="text-muted-foreground">{x.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

function ClientDataSourceIntegration({ clientId }: { clientId: string }) {
  const { allClients } = useRole();
  const client = allClients.find((c) => c.id === clientId);
  if (!client) return null;
  const integration = buildIntegrations([client]).find((i) => i.category === "Data Source");
  if (!integration) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            Primary Data Source: {integration.dataSource ?? "Not selected"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Last sync {integration.lastActivity}
            {integration.lastSuccessful ? ` · ${integration.lastSuccessful}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={integrationTone(integration.status)}>{integration.status}</StatusPill>
          <Link
            to="/integrations/$integrationId"
            params={{ integrationId: integration.id }}
            className="text-[13px] font-medium text-primary hover:underline"
          >
            View Integration
          </Link>
        </div>
      </div>
    </div>
  );
}

function ClientRules({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { rulesForClient, canCreateRuleForClient } = useRules();
  const { systemRules, clientRules } = rulesForClient(clientId);
  const canCreate = canCreateRuleForClient(clientId);

  const table = (rules: typeof systemRules, empty: string) =>
    rules.length === 0 ? (
      <EmptyState title={empty} />
    ) : (
      <DataTable minWidth={760} head={["Rule Name", "Category", "Condition Summary", "Result", "Status"]}>
        {rules.map((rule) => (
          <Tr key={rule.id}>
            <Td>
              <Link to="/rules/$ruleId" params={{ ruleId: rule.id }} className="hover:underline">
                <PrimaryCell title={rule.name} subtitle={rule.type} />
              </Link>
            </Td>
            <Td className="text-muted-foreground">{rule.category}</Td>
            <Td className="max-w-[300px] truncate">{ruleConditionSummary(rule)}</Td>
            <Td className="text-muted-foreground">{rule.action}</Td>
            <Td>
              <StatusPill tone={statusToneForRule(rule.status)}>{rule.status}</StatusPill>
            </Td>
          </Tr>
        ))}
      </DataTable>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Governance rules evaluated for {clientName} only. Rules belonging to other clients never
          apply here.
        </p>
        {canCreate ? (
          <div className="flex items-center gap-2">
            <Link to="/rules">
              <Btn>Add Existing Rule</Btn>
            </Link>
            <Link to="/rules/new">
              <Btn variant="primary">Create Client Rule</Btn>
            </Link>
          </div>
        ) : (
          <StatusPill>Read-only</StatusPill>
        )}
      </div>

      <div>
        <SectionHeading
          title="System Rules Applied"
          description="Reusable governance rules from the PayFlow catalogue"
        />
        {table(systemRules, "No system rules applied to this client")}
      </div>

      <div>
        <SectionHeading
          title={`${clientName} Client Rules`}
          description="Configured specifically for this client"
        />
        {table(clientRules, "No client rules configured yet")}
      </div>
    </div>
  );
}
