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
import { incompleteSetupSections, setupIssueDetails } from "@/lib/client-setup";
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

function fmtDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Stable fallback created date for seeded clients without one. */
function createdFor(c: { id: string; createdAt?: string }): string {
  if (c.createdAt) return c.createdAt;
  let h = 0;
  for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return new Date(Date.UTC(2026, 5 + (h % 4), 1 + (h % 27), 9, 0)).toISOString();
}

function addedViaFor(c: { id: string; addedVia?: string }): string {
  return c.addedVia ?? (c.id.startsWith("imp-") ? "File Import" : "Manual");
}

function ClientsPage() {
  const { visibleClients, isAdmin } = useRole();
  const { supervisorsForClient } = useUsers();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [aiMode, setAiMode] = useState("All AI Modes");
  const [supervisor, setSupervisor] = useState("All Supervisors");
  const [source, setSource] = useState("All Sources");

  const rows = useMemo(
    () =>
      visibleClients.filter((c) => {
        const q = search.trim().toLowerCase();
        if (q && !`${c.name} ${c.config.code} ${c.industry}`.toLowerCase().includes(q)) return false;
        if (status !== "All Statuses" && c.status !== status) return false;
        if (aiMode !== "All AI Modes" && c.aiMode !== aiMode) return false;
        if (supervisor !== "All Supervisors" && !c.supervisors.includes(supervisor)) return false;
        if (source !== "All Sources" && addedViaFor(c) !== source) return false;
        return true;
      }),
    [visibleClients, search, status, aiMode, supervisor, source],
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
        <FilterSelect
          label="Added through"
          value={source}
          onChange={setSource}
          options={["All Sources", "Manual", "File Import"]}
        />
      </div>

      <DataTable
        head={[
          "Client Name",
          "Client Code / Reference",
          "Client Type",
          "Business Use Case",
          "Status",
          "Added Through",
          "Created Date",
          "Last Updated Date",
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
              <Td className="align-top">
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: c.id }}
                  className="font-semibold text-foreground hover:underline"
                >
                  {c.name}
                </Link>
                <div className="text-xs text-muted-foreground">{c.industry}</div>
                {isSettingUp && (() => {
                  const details = setupIssueDetails(c.name, c.config, supervisorsForClient(c.id).length);
                  if (remaining > 0) {
                    details.unshift(
                      "Sub-Clients / Portfolios: add at least one sub-client (optional but recommended)",
                    );
                  }
                  return (
                    <div className="mt-1.5 w-[300px] whitespace-normal">
                      {remaining > 0 && (
                        <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                          ⚠ {remaining} {remaining === 1 ? "step" : "steps"} left
                        </span>
                      )}
                      {details.length > 0 && (
                        <ul className="mt-1.5 space-y-1 text-[10.5px] leading-snug text-muted-foreground">
                          {details.map((d) => (
                            <li key={d} className="flex gap-1.5">
                              <span aria-hidden className="text-warning/80">•</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {isAdmin && (
                        <Link
                          to="/clients/$clientId"
                          params={{ clientId: c.id }}
                          search={{ tab: "Configuration" }}
                          className="mt-1.5 inline-block text-[12px] font-semibold text-primary hover:underline"
                        >
                          {remaining > 0 ? "Complete setup →" : "Edit draft →"}
                        </Link>
                      )}
                    </div>
                  );
                })()}
              </Td>
              <Td className="text-muted-foreground">{c.config.code || "—"}</Td>
              <Td className="text-muted-foreground">{c.config.clientType}</Td>
              <Td className="text-muted-foreground">{c.config.useCase || "—"}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusPill tone={clientStatusTone(c.status)}>{c.status}</StatusPill>
                </div>
              </Td>
              <Td className="text-muted-foreground">{addedViaFor(c)}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(createdFor(c))}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">
                {fmtDate(c.createdAt && !c.config.dataSource ? c.createdAt : intake.receivedAt, true)}
              </Td>
              <Td className="text-right">
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: c.id }}
                  className="text-[12.5px] font-semibold text-primary hover:underline"
                >
                  View →
                </Link>
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
