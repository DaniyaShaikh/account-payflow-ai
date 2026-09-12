import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PageHeader,
  Panel,
  KpiCard,
  DataTable,
  Tr,
  Td,
  PrimaryCell,
  StatusPill,
  FilterSelect,
  EmptyState,
  SectionHeading,
} from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import {
  buildIntegrations,
  integrationCategories,
  integrationStatuses,
  integrationSummary,
  integrationTone,
} from "@/lib/integration-data";

export const Route = createFileRoute("/integrations/")({
  head: () => ({
    meta: [
      { title: "Integrations — PayFlow Collections" },
      {
        name: "description",
        content:
          "Monitor the external systems connected to PayFlow: client data sources, email and SMS channels, payment provider readiness and connection health.",
      },
      { property: "og:title", content: "Integrations — PayFlow Collections" },
      {
        property: "og:description",
        content: "Connection health for client data sources, communication channels and payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { status?: string | undefined } => ({
    status: typeof search["status"] === "string" ? (search["status"] as string) : undefined,
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { visibleClients, isAdmin } = useRole();
  const search = Route.useSearch();

  const integrations = useMemo(() => buildIntegrations(visibleClients), [visibleClients]);
  const summary = integrationSummary(integrations);

  const [status, setStatus] = useState(search.status ?? "All Statuses");
  const [client, setClient] = useState("All Clients");
  const [category, setCategory] = useState("All Categories");

  const rows = integrations.filter((i) => {
    if (status !== "All Statuses" && i.status !== status) return false;
    if (client !== "All Clients" && i.clientName !== client) return false;
    if (category !== "All Categories" && i.category !== category) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Monitor the external systems and services connected to PayFlow."
        actions={
          isAdmin ? undefined : (
            <StatusPill>Operational status only for your assigned clients</StatusPill>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Connected" value={String(summary.connected)} tone="primary" />
        <KpiCard label="Attention Required" value={String(summary.attention)} />
        <KpiCard label="Configuration Pending" value={String(summary.pending)} />
        <KpiCard label="Disconnected" value={String(summary.disconnected)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...integrationStatuses]}
        />
        <FilterSelect
          label="Client"
          value={client}
          onChange={setClient}
          options={["All Clients", ...visibleClients.map((c) => c.name)]}
        />
        <FilterSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={["All Categories", ...integrationCategories]}
        />
      </div>

      <div className="space-y-6">
        {integrationCategories.map((cat) => {
          const catRows = rows.filter((i) => i.category === cat);
          if (catRows.length === 0) return null;
          return (
            <div key={cat}>
              <SectionHeading
                title={cat === "Future" ? "Future Channels" : cat}
                description={
                  cat === "Data Source"
                    ? "Each client uses one primary operational data source: CRM or ACE."
                    : cat === "Communication"
                      ? "Channel connections used to execute customer communications."
                      : cat === "Payments"
                        ? "Payment provider is not finalised; the customer payment experience stays provider neutral."
                        : "Not active yet."
                }
              />
              <DataTable
                minWidth={820}
                head={["Integration", "Category", "Client", "Status", "Last Activity", ""]}
              >
                {catRows.map((i) => (
                  <Tr key={i.id}>
                    <Td>
                      <Link to="/integrations/$integrationId" params={{ integrationId: i.id }}>
                        <PrimaryCell
                          title={i.name}
                          subtitle={i.dataSource ? "Primary data source" : undefined}
                        />
                      </Link>
                    </Td>
                    <Td className="text-muted-foreground">{i.category}</Td>
                    <Td>
                      {i.clientId ? (
                        <Link
                          to="/clients/$clientId"
                          params={{ clientId: i.clientId }}
                          className="hover:underline"
                        >
                          {i.clientName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{i.clientName}</span>
                      )}
                    </Td>
                    <Td>
                      <StatusPill tone={integrationTone(i.status)}>{i.status}</StatusPill>
                    </Td>
                    <Td className="tabular text-muted-foreground">{i.lastActivity}</Td>
                    <Td>
                      <Link
                        to="/integrations/$integrationId"
                        params={{ integrationId: i.id }}
                        className="text-[13px] font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </DataTable>
            </div>
          );
        })}

        {rows.length === 0 && (
          <Panel title="Integrations">
            <EmptyState
              title="No integrations match these filters"
              description="Clear the status, client or category filter to see all connected systems."
            />
          </Panel>
        )}

        {summary.attention === 0 && (
          <p className="text-[12px] text-muted-foreground">
            No recent integration issues across your clients.
          </p>
        )}
      </div>
    </>
  );
}
