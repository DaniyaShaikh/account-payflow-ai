import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, DataTable, Td, StatusPill } from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { formatNumber } from "@/lib/payflow-data";

export const Route = createFileRoute("/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — PayFlow Collections" },
      {
        name: "description",
        content:
          "Organizations whose collection operations PayFlow manages, with customer account volume, active cases and assigned supervisors.",
      },
      { property: "og:title", content: "Clients — PayFlow Collections" },
      {
        property: "og:description",
        content: "Client portfolios with account volume, active collection cases and AI mode.",
      },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { visibleClients, role } = useRole();

  return (
    <>
      <PageHeader
        title="Clients"
        description="Organizations whose collections PayFlow operates. Each client holds many customer accounts."
      />

      <DataTable
        head={[
          "Client",
          "Customer Accounts",
          "Active Cases",
          "AI Mode",
          "Assigned Supervisor",
          "Status",
        ]}
      >
        {visibleClients.map((c) => (
          <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
            <Td>
              <Link
                to="/clients/$clientId"
                params={{ clientId: c.id }}
                className="font-semibold text-foreground hover:underline"
              >
                {c.name}
              </Link>
              <span className="ml-2 text-xs text-muted-foreground">{c.industry}</span>
            </Td>
            <Td className="tabular">{formatNumber(c.accounts)}</Td>
            <Td className="tabular">{formatNumber(c.activeCases)}</Td>
            <Td>
              <StatusPill tone={c.aiMode === "Autopilot" ? "info" : "neutral"}>
                {c.aiMode}
              </StatusPill>
            </Td>
            <Td className="text-muted-foreground">{c.supervisors.join(", ")}</Td>
            <Td>
              <StatusPill tone="success">{c.status}</StatusPill>
            </Td>
          </tr>
        ))}
      </DataTable>

      {role === "supervisor" && (
        <p className="mt-3 text-xs text-muted-foreground">
          You are viewing PayFlow as Supervisor Zeeshan. Only assigned clients are listed.
        </p>
      )}
    </>
  );
}
