import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PageHeader,
  DataTable,
  Td,
  StatusPill,
  FilterSelect,
  Btn,
  type Tone,
} from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { formatCurrency, formatNumber, supervisorDirectory } from "@/lib/payflow-data";

export const Route = createFileRoute("/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — PayFlow Collections" },
      {
        name: "description",
        content:
          "Manage organizations and their collection operations: customer account volume, active cases, outstanding balances, AI mode and assigned supervisors.",
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

function clientStatusTone(status: string): Tone {
  switch (status) {
    case "Active":
      return "success";
    case "Onboarding":
      return "info";
    case "Draft":
      return "neutral";
    default:
      return "warning";
  }
}

function ClientsPage() {
  const { visibleClients, isAdmin } = useRole();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [aiMode, setAiMode] = useState("All AI Modes");
  const [supervisor, setSupervisor] = useState("All Supervisors");

  const rows = useMemo(
    () =>
      visibleClients.filter((c) => {
        const q = search.trim().toLowerCase();
        if (q && !`${c.name} ${c.config.code} ${c.industry}`.toLowerCase().includes(q)) return false;
        if (status !== "All Statuses" && c.status !== status) return false;
        if (aiMode !== "All AI Modes" && c.aiMode !== aiMode) return false;
        if (supervisor !== "All Supervisors" && !c.supervisors.includes(supervisor)) return false;
        return true;
      }),
    [visibleClients, search, status, aiMode, supervisor],
  );

  return (
    <>
      <PageHeader
        title="Clients"
        description="Manage organizations and their collection operations."
        actions={
          isAdmin ? (
            <Link to="/clients/new">
              <Btn variant="primary">+ Add Client</Btn>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients"
          className="w-56 rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-primary"
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", "Active", "Onboarding", "Paused", "Draft"]}
        />
        <FilterSelect
          label="AI Mode"
          value={aiMode}
          onChange={setAiMode}
          options={["All AI Modes", "Autopilot", "Supervised AI"]}
        />
        <FilterSelect
          label="Supervisor"
          value={supervisor}
          onChange={setSupervisor}
          options={["All Supervisors", ...supervisorDirectory]}
        />
      </div>

      <DataTable
        head={[
          "Client",
          "Customer Accounts",
          "Active Cases",
          "Outstanding",
          "Recovered",
          "AI Mode",
          "Supervisor",
          "Status",
        ]}
      >
        {rows.map((c) => (
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
            <Td className="tabular">{formatCurrency(c.outstanding, true)}</Td>
            <Td className="tabular">{formatCurrency(c.recovered, true)}</Td>
            <Td>
              <StatusPill tone={c.aiMode === "Autopilot" ? "info" : "neutral"}>
                {c.aiMode}
              </StatusPill>
            </Td>
            <Td className="text-muted-foreground">{c.supervisors.join(", ") || "—"}</Td>
            <Td>
              <StatusPill tone={clientStatusTone(c.status)}>{c.status}</StatusPill>
            </Td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <Td className="text-muted-foreground">No clients match these filters.</Td>
          </tr>
        )}
      </DataTable>

      {!isAdmin && (
        <p className="mt-3 text-xs text-muted-foreground">
          You are viewing PayFlow as Supervisor Zeeshan. Only assigned clients are listed, and client
          configuration is read-only.
        </p>
      )}
    </>
  );
}
