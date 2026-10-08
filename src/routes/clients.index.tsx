import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PageHeader,
  DataTable,
  Td,
  Tr,
  StatusPill,
  FilterSelect,
  SearchInput,
  PrimaryCell,
  Btn,
  type Tone,
} from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { formatCurrency, formatNumber, supervisorDirectory } from "@/lib/payflow-data";
import { intakeForClient } from "@/lib/intake-data";
import { incompleteSetupSections } from "@/lib/client-setup";
import { useUsers } from "@/lib/users-context";

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
  const { supervisorsForClient } = useUsers();
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
            <>
              <Link to="/imports" search={{ type: "client" }}>
                <Btn variant="ghost">Import History</Btn>
              </Link>
              <Link to="/clients/import">
                <Btn>Import from File</Btn>
              </Link>
              <Link to="/clients/new">
                <Btn variant="primary">+ Add Client</Btn>
              </Link>
            </>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search clients"
          className="w-56"
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
        minWidth={1180}
        head={[
          "Client",
          "Last File Received",
          "File Assigned",
          "Accounts In File",
          "Active Cases",
          "Outstanding",
          "Recovered",
          "AI Mode",
          "Supervisor",
          "Status",
          "",
        ]}
      >
        {rows.map((c) => {
          const intake = intakeForClient(c);
          return (
            <Tr key={c.id}>
              <Td>
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: c.id }}
                  className="hover:underline"
                >
                  <PrimaryCell title={c.name} subtitle={`${c.industry} · ${c.config.code || "—"}`} />
                </Link>
              </Td>
              <Td className="text-muted-foreground">
                <PrimaryCell title={intake.receivedAt} subtitle={intake.fileName} />
              </Td>
              <Td className="text-muted-foreground">{intake.assignedAt}</Td>
              <Td className="tabular">
                <PrimaryCell
                  title={formatNumber(intake.accountsInFile)}
                  subtitle={`+${formatNumber(intake.newAccounts)} new · −${formatNumber(intake.removedAccounts)} removed`}
                />
              </Td>
              <Td className="tabular">{formatNumber(c.activeCases)}</Td>
              <Td className="tabular font-medium">{formatCurrency(c.outstanding, true)}</Td>
              <Td className="tabular font-medium text-success">
                {formatCurrency(c.recovered, true)}
              </Td>
              <Td>
                <StatusPill tone={c.aiMode === "Autopilot" ? "ai" : "neutral"}>
                  {c.aiMode}
                </StatusPill>
              </Td>
              <Td className="text-muted-foreground">{c.supervisors.join(", ") || "—"}</Td>
              <Td>
                <span className="inline-flex items-center gap-1.5">
                  <StatusPill tone={clientStatusTone(c.status)}>{c.status}</StatusPill>
                  {(() => {
                    const left =
                      c.status === "Draft"
                        ? incompleteSetupSections(c.name, c.config, supervisorsForClient(c.id).length)
                            .length
                        : 0;
                    return left > 0 ? (
                      <span
                        title="Client setup incomplete. Additional configuration is required before activation."
                        className="inline-flex cursor-help items-center gap-1 whitespace-nowrap text-[11.5px] font-medium text-warning"
                      >
                        ⚠ {left} step{left > 1 ? "s" : ""} left
                      </span>
                    ) : null;
                  })()}
                </span>
                    )}
                </span>
              </Td>
              <Td>
                {isAdmin && (c.status === "Draft" || c.status === "Onboarding") ? (
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: c.id }}
                    search={{ tab: "Configuration" }}
                    className="text-[12.5px] font-semibold text-primary hover:underline"
                  >
                    {c.status === "Draft" &&
                    incompleteSetupSections(c.name, c.config, supervisorsForClient(c.id).length)
                      .length > 0
                      ? "Complete setup →"
                      : "Edit draft"}
                  </Link>
                ) : null}
              </Td>
            </Tr>
          );
        })}
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
