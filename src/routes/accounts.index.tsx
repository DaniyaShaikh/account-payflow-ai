import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  DataTable,
  Td,
  StatusPill,
  statusTone,
  FilterSelect,
} from "@/components/payflow-ui";
import { useRole, useVisibleAccounts } from "@/lib/role-context";
import { clientName, collectionStatuses, journeys, formatCurrency } from "@/lib/payflow-data";

export const Route = createFileRoute("/accounts/")({
  head: () => ({
    meta: [
      { title: "Accounts / Cases — PayFlow Collections" },
      {
        name: "description",
        content:
          "Platform-wide list of customer accounts and their collection cases across every PayFlow client.",
      },
      { property: "og:title", content: "Accounts / Cases — PayFlow Collections" },
      {
        property: "og:description",
        content:
          "Filter customer accounts by client, collection status, collection workflow and human review state.",
      },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const { visibleClients } = useRole();
  const accounts = useVisibleAccounts();

  const [client, setClient] = useState("All Clients");
  const [status, setStatus] = useState("All Statuses");
  const [journey, setJourney] = useState("All Collection Workflows");
  const [review, setReview] = useState("All");

  const rows = accounts.filter((a) => {
    if (client !== "All Clients" && clientName(a.clientId) !== client) return false;
    if (status !== "All Statuses" && a.status !== status) return false;
    if (journey !== "All Collection Workflows" && a.journey !== journey) return false;
    if (review === "Yes" && !a.humanReview) return false;
    if (review === "No" && a.humanReview) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Accounts / Cases"
        description="Customer accounts under collection across all clients in your access scope."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect
          label="Client"
          value={client}
          onChange={setClient}
          options={["All Clients", ...visibleClients.map((c) => c.name)]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...collectionStatuses]}
        />
        <FilterSelect
          label="Collection Workflow"
          value={journey}
          onChange={setJourney}
          options={["All Collection Workflows", ...journeys]}
        />
        <FilterSelect
          label="Human Review"
          value={review}
          onChange={setReview}
          options={["All", "Yes", "No"]}
        />
      </div>

      <DataTable
        head={[
          "Client",
          "Customer",
          "Account Reference",
          "Outstanding Balance",
          "Collection Status",
          "Current Collection Workflow",
          "Last Action",
          "Next Action",
          "Human Review",
        ]}
      >
        {rows.map((a) => (
          <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface">
            <Td>
              <Link
                to="/clients/$clientId"
                params={{ clientId: a.clientId }}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {clientName(a.clientId)}
              </Link>
            </Td>
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
            <Td className={a.humanReview ? "font-medium text-destructive" : "text-muted-foreground"}>
              {a.humanReview ? "Yes" : "No"}
            </Td>
          </tr>
        ))}
      </DataTable>

      {rows.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">No accounts match these filters.</p>
      )}
    </>
  );
}
