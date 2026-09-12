import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ReviewQueue } from "@/components/review-queue";
import { JourneyLibrary } from "@/components/journey-library";
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
  SupervisorSection,
  mappingSummary,
  connectionTone,
  type ClientDraft,
} from "@/components/client-config-sections";
import { useRole } from "@/lib/role-context";
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
  "Accounts",
  "Journeys",
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
            <StatusPill>Supervisor: {client.supervisors.join(", ") || "None"}</StatusPill>
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

      {tab === "Accounts" && <ClientAccounts clientName={client.name} accounts={accounts} />}

      {tab === "Journeys" && (
        <Panel
          title="Journeys"
          description={`Global journeys in use by ${client.name} and ${client.name}-specific journeys`}
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
          draft={draft}
          patch={patch}
          patchConfig={patchConfig}
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

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Customer Accounts" value={formatNumber(client.accounts)} />
        <KpiCard label="Active Cases" value={formatNumber(client.activeCases)} />
        <KpiCard label="Outstanding" value={formatCurrency(client.outstanding, true)} />
        <KpiCard label="Recovered" value={formatCurrency(client.recovered, true)} />
        <KpiCard label="Human Reviews" value={formatNumber(client.reviewsPending)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Collection Summary" description={`Current position for ${client.name}`}>
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
  const [journey, setJourney] = useState("All Journeys");
  const [review, setReview] = useState("All Accounts");

  const rows = accounts.filter((a) => {
    const q = search.trim().toLowerCase();
    if (q && !`${a.customer} ${a.reference}`.toLowerCase().includes(q)) return false;
    if (status !== "All Statuses" && a.status !== status) return false;
    if (journey !== "All Journeys" && a.journey !== journey) return false;
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
          label="Journey"
          value={journey}
          onChange={setJourney}
          options={["All Journeys", ...journeys]}
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
          "Journey",
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
  draft,
  patch,
  patchConfig,
}: {
  readOnly: boolean;
  draft: ClientDraft;
  patch: (p: Partial<ClientDraft>) => void;
  patchConfig: (p: Partial<ClientConfig>) => void;
}) {
  const [section, setSection] = useState<(typeof configSections)[number]>("General");
  const summary = mappingSummary(draft.config);
  const props = { draft, patch, patchConfig };

  if (readOnly) {
    return (
      <Panel title="Configuration is read-only">
        <p className="text-sm text-muted-foreground">
          Supervisors can view client operations but not change client configuration. Switch the role
          preview to Operations Admin to edit.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill>{draft.config.dataSource ?? "No data source"}</StatusPill>
          <StatusPill>{draft.aiMode}</StatusPill>
          <StatusPill>{summary.mapped} fields mapped</StatusPill>
        </div>
      </Panel>
    );
  }

  return (
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

      <Panel
        title={section}
        action={<Btn variant="ghost">Changes save automatically</Btn>}
      >
        {section === "General" && <ProfileSection {...props} />}
        {section === "Data Source" && <DataSourceSection {...props} />}
        {section === "Data Mapping" && <MappingSection {...props} />}
        {section === "Branding & Channels" && <BrandingSection {...props} />}
        {section === "AI & Governance" && <AiGovernanceSection {...props} />}
        {section === "Supervisors & Permissions" && <SupervisorSection {...props} />}
      </Panel>
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
