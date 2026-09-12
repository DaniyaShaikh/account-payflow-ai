import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PageHeader,
  Panel,
  StatusPill,
  Btn,
  EmptyState,
  DataTable,
  Tr,
  Td,
} from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { buildIntegrations, integrationTone } from "@/lib/integration-data";
import { mappingSummary, mappingTone } from "@/components/client-config-sections";

export const Route = createFileRoute("/integrations/$integrationId")({
  head: () => ({
    meta: [
      { title: "Integration detail — PayFlow Collections" },
      {
        name: "description",
        content:
          "Connection status, client, last successful activity, recent issues and data mapping status for a single PayFlow integration.",
      },
      { property: "og:title", content: "Integration detail — PayFlow Collections" },
      {
        property: "og:description",
        content: "Operational health of one connected system, with its client and mapping status.",
      },
    ],
  }),
  component: IntegrationDetail,
});

function IntegrationDetail() {
  const { integrationId } = Route.useParams();
  const { visibleClients, isAdmin } = useRole();
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [showMapping, setShowMapping] = useState(false);

  const integrations = useMemo(() => buildIntegrations(visibleClients), [visibleClients]);
  const integration = integrations.find((i) => i.id === integrationId);
  const client = visibleClients.find((c) => c.id === integration?.clientId);

  if (!integration) {
    return (
      <Panel title="Integration not available">
        <p className="text-sm text-muted-foreground">
          This integration either does not exist or belongs to a client outside your access.
        </p>
        <Link to="/integrations" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to integrations
        </Link>
      </Panel>
    );
  }

  const summary = client ? mappingSummary(client.config) : null;

  const runTest = () => {
    setTesting(true);
    setTested(false);
    window.setTimeout(() => {
      setTesting(false);
      setTested(true);
    }, 900);
  };

  const facts: [string, string][] = [
    ["Integration", integration.name],
    ["Category", integration.category],
    ["Client", integration.clientName],
    ["Connection status", integration.status],
    ["Last successful activity", integration.lastSuccessful ?? "No activity recorded yet"],
    ["Last activity", integration.lastActivity],
  ];

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Integrations", to: "/integrations" },
          { label: `${integration.name} · ${integration.clientName}` },
        ]}
        title={`${integration.name} Integration`}
        description={integration.purpose}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={integrationTone(testing ? "Testing" : integration.status)}>
              {testing ? "Testing" : integration.status}
            </StatusPill>
            <StatusPill>{integration.clientName}</StatusPill>
          </div>
        }
      />

      {integration.status === "Attention Required" && (
        <div className="mb-5 rounded-lg border border-danger/30 bg-danger/10 p-4">
          <p className="text-[13px] font-semibold text-foreground">
            {integration.name} connection requires attention
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {integration.clientName} · last successful activity{" "}
            {integration.lastSuccessful ?? "unknown"}
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Connection" description="Operational status of this connection">
          <dl className="divide-y divide-border">
            {facts.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-[13px] text-muted-foreground">{label}</dt>
                <dd className="text-[13px] font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          {isAdmin ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn onClick={runTest} disabled={testing}>
                {testing ? "Testing…" : "Test Connection"}
              </Btn>
              {integration.dataSource && (
                <Btn variant="ghost" onClick={() => setShowMapping((v) => !v)}>
                  {showMapping ? "Hide Mapping" : "View Mapping"}
                </Btn>
              )}
              {integration.clientId && (
                <Link to="/clients/$clientId" params={{ clientId: integration.clientId }}>
                  <Btn variant="ghost">
                    {integration.status === "Connected" ? "Configure" : "Reconnect / Configure"}
                  </Btn>
                </Link>
              )}
            </div>
          ) : (
            <p className="mt-4 text-[12px] text-muted-foreground">
              Configuration actions are available to Operations Admin only.
            </p>
          )}
          {tested && (
            <p className="mt-2 text-[12px] text-success">
              Test completed. Connection responded normally.
            </p>
          )}
        </Panel>

        <Panel title="Recent Issues" description="Operational events needing attention">
          {integration.issues.length === 0 ? (
            <EmptyState
              title="No recent issues"
              description="This connection has operated normally over the recent period."
            />
          ) : (
            <ul className="space-y-2">
              {integration.issues.map((issue) => (
                <li
                  key={issue.at}
                  className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2"
                >
                  <p className="text-[13px] text-foreground">{issue.summary}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{issue.at}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {integration.dataSource && summary && client && (
        <Panel
          className="mt-5"
          title="Data Mapping Status"
          description={`The same mapping configured during ${client.name} onboarding`}
          action={
            <Link
              to="/clients/$clientId"
              params={{ clientId: client.id }}
              className="text-[13px] font-medium text-primary hover:underline"
            >
              Open client configuration
            </Link>
          }
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <StatusPill tone="success">{summary.mapped} mapped</StatusPill>
            <StatusPill tone={summary.attention ? "warning" : "neutral"}>
              {summary.attention} need attention
            </StatusPill>
            <StatusPill>{client.config.mappings.length} source fields</StatusPill>
          </div>
          {showMapping ? (
            <DataTable
              minWidth={620}
              head={["Source Field", "PayFlow Field", "Sample Value", "Status"]}
            >
              {client.config.mappings.map((m) => (
                <Tr key={m.sourceField}>
                  <Td className="tabular">{m.sourceField}</Td>
                  <Td>{m.payflowField}</Td>
                  <Td className="text-muted-foreground">{m.sampleValue}</Td>
                  <Td>
                    <StatusPill tone={mappingTone(m.status)}>{m.status}</StatusPill>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              Select View Mapping to see the field mapping used for this data source.
            </p>
          )}
        </Panel>
      )}
    </>
  );
}
