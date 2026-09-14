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
  communications,
  engagementLabel,
  type Communication,
} from "@/lib/communication-data";

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

export function CommunicationTable({
  rows,
  showClientFilter = true,
  initialStatus = "All Statuses",
  initialChannel = "All Channels",
  initialClient = "All Clients",
  initialJourney = "All Workflows",
}: {
  rows: Communication[];
  showClientFilter?: boolean;
  initialStatus?: string;
  initialChannel?: string;
  initialClient?: string;
  initialJourney?: string;
}) {
  const { visibleClients } = useRole();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("All Dates");
  const [client, setClient] = useState(initialClient);
  const [subClients, setSubClients] = useState<string[]>([]);
  const [channel, setChannel] = useState(initialChannel);
  const [status, setStatus] = useState(initialStatus);
  const [journey, setJourney] = useState(initialJourney);
  const [purpose, setPurpose] = useState("All Purposes");

  const journeyNames = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => journeyById(r.journeyId)?.name).filter((n): n is string => !!n)),
      ),
    [rows],
  );

  const filtered = rows.filter((c) => {
    const q = query.trim().toLowerCase();
    if (
      q &&
      !c.customer.toLowerCase().includes(q) &&
      !c.reference.toLowerCase().includes(q) &&
      !c.id.toLowerCase().includes(q)
    )
      return false;
    if (date !== "All Dates" && c.dateBucket !== date) return false;
    if (showClientFilter && client !== "All Clients" && clientName(c.clientId) !== client)
      return false;
    if (!matchesSubClients(c.clientId, c.accountId, subClients)) return false;
    if (channel !== "All Channels" && c.channel !== channel) return false;
    if (status !== "All Statuses" && c.status !== status) return false;
    if (journey !== "All Workflows" && journeyById(c.journeyId)?.name !== journey) return false;
    if (purpose !== "All Purposes" && c.purpose !== purpose) return false;
    return true;
  });

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Customer, account reference or ID"
          className="w-64"
        />
        <FilterSelect
          label="Date"
          value={date}
          onChange={setDate}
          options={["All Dates", ...commDateRanges]}
        />
        {showClientFilter && (
          <FilterSelect
            label="Client"
            value={client}
            onChange={(v) => {
              setClient(v);
              setSubClients([]);
            }}
            options={["All Clients", ...visibleClients.map((c) => c.name)]}
          />
        )}
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
          label="Channel"
          value={channel}
          onChange={setChannel}
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
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...commStatuses]}
        />
        <FilterSelect
          label="Workflow"
          value={journey}
          onChange={setJourney}
          options={["All Workflows", ...journeyNames]}
        />
        <FilterSelect
          label="Purpose"
          value={purpose}
          onChange={setPurpose}
          options={["All Purposes", ...commPurposes]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No communications match these filters"
          description="Adjust the search or filters to see customer communications."
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
    </>
  );
}
