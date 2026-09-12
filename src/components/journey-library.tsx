import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DataTable,
  Td,
  Tr,
  StatusPill,
  SearchInput,
  FilterSelect,
  PrimaryCell,
  EmptyState,
} from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { formatNumber } from "@/lib/payflow-data";
import {
  journeyLibrary,
  journeyStatuses,
  journeyStatusTone,
  journeyTypeTone,
  journeyTypes,
  type Journey,
} from "@/lib/journey-data";

export function useVisibleJourneys() {
  const { visibleClientIds } = useRole();
  return useMemo(
    () => journeyLibrary.filter((j) => j.clientId === null || visibleClientIds.includes(j.clientId)),
    [visibleClientIds],
  );
}

export function JourneyLibrary({
  journeys,
  showClientFilter = true,
}: {
  journeys: Journey[];
  showClientFilter?: boolean;
}) {
  const { visibleClients } = useRole();
  const [query, setQuery] = useState("");
  const [client, setClient] = useState("All Clients");
  const [type, setType] = useState("All Types");
  const [status, setStatus] = useState("All Statuses");
  const [source, setSource] = useState("All Sources");

  const sources = useMemo(
    () => Array.from(new Set(journeys.map((j) => j.source))),
    [journeys],
  );

  const rows = journeys.filter((j) => {
    if (query && !j.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (showClientFilter && client !== "All Clients" && j.scope !== client && j.scope !== "Global")
      return false;
    if (type !== "All Types" && j.type !== type) return false;
    if (status !== "All Statuses" && j.status !== status) return false;
    if (source !== "All Sources" && j.source !== source) return false;
    return true;
  });

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search journeys"
          className="w-56"
        />
        {showClientFilter && (
          <FilterSelect
            label="Client"
            value={client}
            onChange={setClient}
            options={["All Clients", ...visibleClients.map((c) => c.name)]}
          />
        )}
        <FilterSelect
          label="Type"
          value={type}
          onChange={setType}
          options={["All Types", ...journeyTypes]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...journeyStatuses]}
        />
        <FilterSelect
          label="Source"
          value={source}
          onChange={setSource}
          options={["All Sources", ...sources]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No journeys match these filters"
          description="Adjust the search or filters to see collection strategies."
        />
      ) : (
        <DataTable
          minWidth={980}
          head={[
            "Journey",
            "Scope",
            "Type",
            "Accounts Assigned",
            "Recovery / Outcome",
            "Status",
            "Last Updated",
          ]}
        >
          {rows.map((j) => (
            <Tr key={j.id}>
              <Td>
                <Link to="/journeys/$journeyId" params={{ journeyId: j.id }} className="block">
                  <PrimaryCell
                    title={<span className="text-primary hover:underline">{j.name}</span>}
                    subtitle={`${j.version} · ${j.source}`}
                  />
                </Link>
              </Td>
              <Td>{j.scope}</Td>
              <Td>
                <StatusPill tone={journeyTypeTone(j.type)}>{j.type}</StatusPill>
              </Td>
              <Td className="tabular">{formatNumber(j.accountsAssigned)} accounts</Td>
              <Td className="text-muted-foreground">{j.recoveryNote}</Td>
              <Td>
                <StatusPill tone={journeyStatusTone(j.status)}>{j.status}</StatusPill>
              </Td>
              <Td className="text-muted-foreground">{j.lastUpdated}</Td>
            </Tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
