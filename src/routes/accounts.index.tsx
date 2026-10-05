import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  DataTable,
  Td,
  StatusPill,
  statusTone,
  FilterSelect,
  FilterMultiSelect,
} from "@/components/payflow-ui";
import { useRole, useVisibleAccounts } from "@/lib/role-context";
import {
  clientName,
  collectionStatuses,
  journeys,
  formatCurrency,
  formatNumber,
} from "@/lib/payflow-data";
import { intakeSummary } from "@/lib/intake-data";
import {
  isSingleClientSelected,
  matchesSubClients,
  subClientNameFor,
  subClientNamesForClient,
} from "@/lib/portfolio-data";

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
          "Filter customer accounts by client, collection status, workflow and human review state.",
      },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const { visibleClients } = useRole();
  const accounts = useVisibleAccounts();

  const [client, setClient] = useState("All Clients");
  const [subClients, setSubClients] = useState<string[]>([]);
  const [status, setStatus] = useState("All Statuses");
  const [journey, setJourney] = useState("All Workflows");
  const [review, setReview] = useState("All");

  const rows = accounts.filter((a) => {
    if (client !== "All Clients" && clientName(a.clientId) !== client) return false;
    if (!matchesSubClients(a.clientId, a.id, subClients)) return false;
    if (status !== "All Statuses" && a.status !== status) return false;
    if (journey !== "All Workflows" && a.journey !== journey) return false;
    if (review === "Yes" && !a.humanReview) return false;
    if (review === "No" && a.humanReview) return false;
    return true;
  });

  const scopedClients =
    client === "All Clients" ? visibleClients : visibleClients.filter((c) => c.name === client);
  const intake = intakeSummary(scopedClients);

  return (
    <>
      <PageHeader
        title="Accounts / Cases"
        description="Customer accounts under collection across all clients in your access scope."
        actions={
          <>
            <Link to="/imports" search={{ type: "account" }}>
              <Btn variant="ghost">Import History</Btn>
            </Link>
            <Link to="/accounts/import">
              <Btn variant="primary">Upload Daily CRM File</Btn>
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <p className="text-eyebrow">File Received</p>
          <p className="text-[13px] font-semibold text-foreground">{intake.latestReceivedAt}</p>
        </div>
        <div>
          <p className="text-eyebrow">Assigned To Collections</p>
          <p className="text-[13px] font-semibold text-foreground">{intake.latestAssignedAt}</p>
        </div>
        <div>
          <p className="text-eyebrow">Accounts In Current File</p>
          <p className="tabular text-[13px] font-semibold text-foreground">
            {formatNumber(intake.accountsInFiles)}
          </p>
        </div>
        <p className="text-[11.5px] text-muted-foreground">
          Figures below reflect the most recently received source-system file
          {intake.files > 1 ? `s (${intake.files} clients)` : ""}.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect
          label="Client"
          value={client}
          onChange={(v) => {
            setClient(v);
            setSubClients([]);
          }}
          options={["All Clients", ...visibleClients.map((c) => c.name)]}
        />
        {isSingleClientSelected(client) && (
          <FilterMultiSelect
            label="Sub-Client"
            allLabel="All Sub-Clients"
            selected={subClients}
            onChange={setSubClients}
            options={subClientNamesForClient(visibleClients, client)}
          />
        )}
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...collectionStatuses.filter((s) => s !== "Promise to Pay")]}
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
          "Current Workflow",
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
