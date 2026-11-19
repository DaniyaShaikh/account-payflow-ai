import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DataTable,
  Td,
  Tr,
  StatusPill,
  SearchInput,
  FilterSelect,
  FilterMultiSelect,
  PrimaryCell,
  EmptyState,
  Btn,
} from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { clientName } from "@/lib/payflow-data";
import { journeyById } from "@/lib/journey-data";
import {
  commChannels,
  commDateRanges,
  commPurposes,
  commStatuses,
  commStatusTone,
  commSentDate,
  communications,
  engagementLabel,
  recipientEmailOf,
  withinRetention,
  type Communication,
} from "@/lib/communication-data";
import { CommunicationExport } from "@/components/communication-export";

export function useVisibleCommunications() {
  const { visibleClientIds } = useRole();
  return useMemo(
    () => communications.filter((c) => visibleClientIds.includes(c.clientId)),
    [visibleClientIds],
  );
}

import {
  isSingleClientSelected,
  matchesSubClients,
  subClientNamesForClient,
} from "@/lib/portfolio-data";

interface CommFilters {
  query: string;
  date: string;
  client: string;
  subClients: string[];
  channel: string;
  status: string;
  journey: string;
  purpose: string;
  email: string;
  from: string;
  to: string;
}

export function CommunicationTable({
  rows,
  showClientFilter = true,
  initialStatus = "All Statuses",
  initialChannel = "All Channels",
  initialClient = "All Clients",
  initialJourney = "All Workflows",
  advanced = false,
}: {
  rows: Communication[];
  showClientFilter?: boolean;
  initialStatus?: string;
  initialChannel?: string;
  initialClient?: string;
  initialJourney?: string;
  /** Enables instant date-range filtering, retention and the shared export report. */
  advanced?: boolean;
}) {
  const { visibleClients } = useRole();
  const initial: CommFilters = {
    query: "",
    date: "All Dates",
    client: initialClient,
    subClients: [],
    channel: initialChannel,
    status: initialStatus,
    journey: initialJourney,
    purpose: "All Purposes",
    email: "",
    from: "",
    to: "",
  };
  const [applied, setApplied] = useState<CommFilters>(initial);
  const [pending, setPending] = useState<CommFilters>(initial);
  const [exportOpen, setExportOpen] = useState(false);

  const setFilter = <K extends keyof CommFilters>(key: K, value: CommFilters[K]) => {
    setPending((p) => ({ ...p, [key]: value }));
    setApplied((p) => ({ ...p, [key]: value }));
  };

  /** Date-range edits stay pending until the user applies them. */
  const setDate = (key: "from" | "to", value: string) => {
    setPending((p) => ({ ...p, [key]: value }));
  };

  const rangeDirty = pending.from !== applied.from || pending.to !== applied.to;
  const applyRange = () =>
    setApplied((p) => ({ ...p, from: pending.from, to: pending.to }));
  const resetRange = () =>
    setPending((p) => ({ ...p, from: applied.from, to: applied.to }));


  const f = applied;
  const journeyNames = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => journeyById(r.journeyId)?.name).filter((n): n is string => !!n)),
      ),
    [rows],
  );

  const filtered = rows.filter((c) => {
    if (advanced && !withinRetention(c)) return false;
    const q = f.query.trim().toLowerCase();
    if (
      q &&
      !c.customer.toLowerCase().includes(q) &&
      !c.reference.toLowerCase().includes(q) &&
      !c.id.toLowerCase().includes(q) &&
      !clientName(c.clientId).toLowerCase().includes(q) &&
      !recipientEmailOf(c).toLowerCase().includes(q)
    )
      return false;
    if (f.date !== "All Dates" && c.dateBucket !== f.date) return false;
    if (showClientFilter && f.client !== "All Clients" && clientName(c.clientId) !== f.client)
      return false;
    if (!matchesSubClients(c.clientId, c.accountId, f.subClients)) return false;
    if (f.channel !== "All Channels" && c.channel !== f.channel) return false;
    if (f.status !== "All Statuses" && c.status !== f.status) return false;
    if (f.journey !== "All Workflows" && journeyById(c.journeyId)?.name !== f.journey) return false;
    if (f.purpose !== "All Purposes" && c.purpose !== f.purpose) return false;
    if (f.from && commSentDate(c) < new Date(`${f.from}T00:00:00`)) return false;
    if (f.to && commSentDate(c) > new Date(`${f.to}T23:59:59`)) return false;
    return true;
  });

  const shown = pending;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <SearchInput
          value={shown.query}
          onChange={(v) => setFilter("query", v)}
          placeholder="Search client, customer, email or account"
          className="w-72"
        />
        <FilterSelect
          label="Date"
          value={shown.date}
          onChange={(v) => setFilter("date", v)}
          options={["All Dates", ...commDateRanges]}
        />
        {showClientFilter && (
          <FilterSelect
            label="Client"
            value={shown.client}
            onChange={(v) => {
              setFilter("client", v);
              setFilter("subClients", []);
            }}
            options={["All Clients", ...visibleClients.map((c) => c.name)]}
          />
        )}
        {isSingleClientSelected(shown.client) && (
          <FilterMultiSelect
            label="Sub-Client"
            allLabel="All Sub-Clients"
            selected={shown.subClients}
            onChange={(v) => setFilter("subClients", v)}
            options={subClientNamesForClient(visibleClients, shown.client)}
          />
        )}
        <FilterSelect
          label="Channel"
          value={shown.channel}
          onChange={(v) => setFilter("channel", v)}
          options={["All Channels", ...commChannels]}
        />
        <span
          className="flex h-8 cursor-not-allowed items-center gap-2 rounded-md border border-border bg-surface px-2.5 opacity-60"
          title="WhatsApp is coming later"
        >
          <span className="text-[11px] font-medium text-muted-foreground">Channel</span>
          <span className="text-[13px] font-medium text-muted-foreground">WhatsApp · coming later</span>
        </span>
        <FilterSelect
          label="Status"
          value={shown.status}
          onChange={(v) => setFilter("status", v)}
          options={["All Statuses", ...commStatuses]}
        />
        <FilterSelect
          label="Workflow"
          value={shown.journey}
          onChange={(v) => setFilter("journey", v)}
          options={["All Workflows", ...journeyNames]}
        />
        <FilterSelect
          label="Purpose"
          value={shown.purpose}
          onChange={(v) => setFilter("purpose", v)}
          options={["All Purposes", ...commPurposes]}
        />
        {advanced && (
          <div className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5">
            <span className="text-[11px] font-medium text-muted-foreground">From</span>
            <input
              type="date"
              value={shown.from}
              onChange={(e) => setDate("from", e.target.value)}
              className="bg-transparent text-[13px] text-foreground outline-none"
            />
            <span className="text-[11px] font-medium text-muted-foreground">To</span>
            <input
              type="date"
              value={shown.to}
              onChange={(e) => setDate("to", e.target.value)}
              className="bg-transparent text-[13px] text-foreground outline-none"
            />
          </div>
        )}
        {advanced && rangeDirty && (
          <div className="flex h-8 items-center gap-1.5">
            <Btn variant="primary" className="h-8 px-3" onClick={applyRange}>
              Apply
            </Btn>
            <Btn variant="ghost" className="h-8 px-2.5" onClick={resetRange}>
              Reset
            </Btn>
          </div>
        )}
      </div>
        {advanced && (
          <Btn variant="primary" className="ml-auto shrink-0" onClick={() => setExportOpen(true)}>
            Generate Exportable View
          </Btn>
        )}
      </div>

      {advanced && (
        <p className="mb-2 text-[12px] text-muted-foreground">
          {filtered.length} communication{filtered.length === 1 ? "" : "s"} match the current
          filters. Records older than each client's retention period are excluded.
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No communications match these filters"
          description={
            advanced
              ? "No retained communications match the selected filters. Adjust the filters or check the client's retention period."
              : "Adjust the search or filters to see customer communications."
          }
        />
      ) : (
        <DataTable
          minWidth={1100}
          head={[
            "Time",
            "Client",
            "Customer",
            "Account",
            "Channel",
            "Purpose",
            "Workflow",
            "Status",
            "Engagement",
          ]}
        >
          {filtered.map((c) => (
            <Tr key={c.id}>
              <Td>
                <Link to="/communications/$communicationId" params={{ communicationId: c.id }}>
                  <PrimaryCell
                    title={<span className="tabular text-primary hover:underline">{c.time}</span>}
                    subtitle={c.dateLabel}
                  />
                </Link>
              </Td>
              <Td>{clientName(c.clientId)}</Td>
              <Td className="font-medium">{c.customer}</Td>
              <Td className="tabular">
                <Link
                  to="/accounts/$accountId"
                  params={{ accountId: c.accountId }}
                  className="text-primary hover:underline"
                >
                  {c.reference}
                </Link>
              </Td>
              <Td>
                <StatusPill tone={c.channel === "SMS" ? "info" : "neutral"}>{c.channel}</StatusPill>
              </Td>
              <Td>{c.purpose}</Td>
              <Td className="text-muted-foreground">{journeyById(c.journeyId)?.name ?? "—"}</Td>
              <Td>
                <StatusPill tone={commStatusTone(c.status)}>{c.status}</StatusPill>
              </Td>
              <Td className="text-muted-foreground">{engagementLabel(c)}</Td>
            </Tr>
          ))}
        </DataTable>
      )}

      {advanced && (
        <CommunicationExport
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          rows={filtered}
          filters={{
            client: f.client === "All Clients" ? "All Clients" : f.client,
            subClients: f.subClients,
            email: f.email,
            from: f.from,
            to: f.to,
          }}
        />
      )}
    </>
  );
}
