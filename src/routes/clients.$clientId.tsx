import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  Panel,
  KpiCard,
  DataTable,
  Td,
  StatusPill,
  statusTone,
  PlaceholderSection,
} from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import {
  clients,
  accounts as allAccounts,
  activity,
  formatCurrency,
  formatNumber,
} from "@/lib/payflow-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client detail — PayFlow Collections" },
      {
        name: "description",
        content:
          "Client overview with customer accounts, outstanding balances, active collection cases and pending human reviews.",
      },
      { property: "og:title", content: "Client detail — PayFlow Collections" },
      {
        property: "og:description",
        content: "Customer accounts and collection cases for a single PayFlow client.",
      },
    ],
  }),
  loader: ({ params }) => {
    if (!clients.some((c) => c.id === params.clientId)) throw notFound();
    return null;
  },
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

function ClientDetail() {
  const { clientId } = Route.useParams();
  const { canSeeClient } = useRole();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");

  const client = clients.find((c) => c.id === clientId)!;
  const accounts = allAccounts.filter((a) => a.clientId === clientId);
  const clientActivity = activity.filter((a) => a.clientId === clientId);

  if (!canSeeClient(clientId)) {
    return (
      <Panel title="No access to this client">
        <p className="text-sm text-muted-foreground">
          This client is not assigned to your supervisor account. Switch to the Operations Admin
          view to see all clients.
        </p>
        <Link to="/clients" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to clients
        </Link>
      </Panel>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Clients", to: "/clients" }, { label: client.name }]}
        title={client.name}
        description={`${client.industry} · ${formatNumber(client.accounts)} customer accounts`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="success">{client.status}</StatusPill>
            <StatusPill tone={client.aiMode === "Autopilot" ? "info" : "neutral"}>
              {client.aiMode}
            </StatusPill>
            <StatusPill>Supervisors: {client.supervisors.join(", ")}</StatusPill>
          </div>
        }
      />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Total Customer Accounts" value={formatNumber(client.accounts)} />
            <KpiCard label="Active Collection Cases" value={formatNumber(client.activeCases)} />
            <KpiCard label="Outstanding Amount" value={formatCurrency(client.outstanding, true)} />
            <KpiCard label="Amount Recovered" value={formatCurrency(client.recovered, true)} />
            <KpiCard label="Human Reviews Pending" value={formatNumber(client.reviewsPending)} />
          </div>

          <Panel title="Recent Activity" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {clientActivity.map((item) => (
                <li key={item.text} className="flex items-start justify-between gap-3 px-4 py-3">
                  <p className="text-[13px]">{item.text}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.at}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}

      {tab === "Accounts" && (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            Customer accounts belonging to {client.name}. Each row is a customer being collected
            from, not a client.
          </p>
          <DataTable
            head={[
              "Customer",
              "Account Reference",
              "Outstanding Balance",
              "Collection Status",
              "Current Journey",
              "Last Action",
              "Next Action",
            ]}
          >
            {accounts.map((a) => (
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
              </tr>
            ))}
          </DataTable>
        </>
      )}

      {tab === "Journeys" && (
        <PlaceholderSection
          title="Journeys"
          description="Collection journeys configured for this client"
          items={["Early Stage Collection", "Progressive Reminder", "Escalated Collection"]}
        />
      )}
      {tab === "Communications" && (
        <PlaceholderSection
          title="Communications"
          description="Outbound and inbound message history"
          items={["Email", "SMS", "Voice", "Letter"]}
        />
      )}
      {tab === "Rules" && (
        <PlaceholderSection
          title="Rules"
          description="Governance and contact rules applied to this client"
        />
      )}
      {tab === "Human Reviews" && (
        <PlaceholderSection
          title="Human Reviews"
          description={`${client.reviewsPending} items currently queued for supervisor decision`}
        />
      )}
      {tab === "Configuration" && (
        <PlaceholderSection
          title="Configuration"
          description="Client settings, supervisor assignment and integrations"
        />
      )}
    </>
  );
}
