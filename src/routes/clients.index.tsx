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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

function setupStepLabel(m: string): string {
  if (m === "General") return "Client Profile";
  if (m === "Assigned Users") return "Supervisor Assignment";
  return m;
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
        head={[
          "Client Name",
          "Client Code / Reference",
          "Client Type",
          "Business Use Case",
          "Status",
          "Last Updated",
          "",
        ]}
      >
        {rows.map((c) => {
          const intake = intakeForClient(c);
          const isSettingUp = c.status === "Draft" || c.status === "Onboarding";
          const missing = isSettingUp
            ? incompleteSetupSections(c.name, c.config, supervisorsForClient(c.id).length)
            : [];
          const remaining = missing.length;
          return (
            <Tr key={c.id}>
              <Td>
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: c.id }}
                  className="font-semibold text-foreground hover:underline"
                >
                  {c.name}
                </Link>
                <div className="text-xs text-muted-foreground">{c.industry}</div>
                {remaining > 0 && (
                  <div
                    className="mt-1.5 flex max-w-[220px] flex-wrap gap-1.5"
                    title={missing.map((m) => setupStepLabel(m)).join(", ")}
                  >
                    {missing.map((m) => (
                      <StatusPill key={m} tone="warning">
                        {setupStepLabel(m)}
                      </StatusPill>
                    ))}
                  </div>
                )}
              </Td>
              <Td className="text-muted-foreground">{c.config.code || "—"}</Td>
              <Td className="text-muted-foreground">{c.config.clientType}</Td>
              <Td className="text-muted-foreground">{c.config.useCase || "—"}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusPill tone={clientStatusTone(c.status)}>{c.status}</StatusPill>
                </div>
              </Td>
              <Td className="text-muted-foreground">{intake.receivedAt}</Td>
              <Td className="text-right">
                {isSettingUp && isAdmin ? (
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: c.id }}
                    search={{ tab: "Configuration" }}
                  >
                    <Btn variant={remaining > 0 ? "primary" : "ghost"}>
                      {remaining > 0 ? "Complete Setup" : "Edit Draft"}
                    </Btn>
                  </Link>
                ) : (
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: c.id }}
                    className="text-[12.5px] font-semibold text-primary hover:underline"
                  >
                    View →
                  </Link>
                )}
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
