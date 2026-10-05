import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable, FilterSelect, PageHeader, StatusPill, Td, Tr, PrimaryCell } from "@/components/payflow-ui";
import { formatNumber } from "@/lib/payflow-data";
import { importKindLabel, importStatusTone, listImports, type ImportKind } from "@/lib/import-data";

export const Route = createFileRoute("/imports/")({
  validateSearch: (s: Record<string, unknown>): { type?: ImportKind } =>
    s["type"] === "client" || s["type"] === "account" ? { type: s["type"] as ImportKind } : {},
  head: () => ({
    meta: [
      { title: "Import History — PayFlow Collections" },
      { name: "description", content: "History of Client and daily CRM account file imports with results and errors." },
      { property: "og:title", content: "Import History — PayFlow Collections" },
      { property: "og:description", content: "Review past CRM file imports, results and errors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportHistory,
});

const typeOptions = ["All Import Types", importKindLabel.client, importKindLabel.account];

function ImportHistory() {
  const { type } = Route.useSearch();
  const navigate = Route.useNavigate();
  const rows = listImports(type);
  const back = type === "client" ? { to: "/clients", label: "Clients" } : { to: "/accounts", label: "Accounts / Cases" };
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: back.label, to: back.to }, { label: "Import History" }]}
        title="Import History"
        description="Every CRM file uploaded to PayFlow, with its reconciliation results."
      />
      <div className="mb-4">
        <FilterSelect
          label="Type"
          value={type ? importKindLabel[type] : typeOptions[0]!}
          onChange={(v) =>
            navigate({
              search: v === importKindLabel.client ? { type: "client" } : v === importKindLabel.account ? { type: "account" } : {},
            })
          }
          options={typeOptions}
        />
      </div>
      <DataTable
        minWidth={1080}
        head={["File Name", "Date / Time", "Import Type", "Total", "Created", "Updated", "Unchanged", "Failed", "Status", ""]}
      >
        {rows.map((r) => (
          <Tr key={r.id}>
            <Td>
              <PrimaryCell title={r.fileName} subtitle={`By ${r.uploadedBy}`} />
            </Td>
            <Td className="text-muted-foreground">{r.dateTime}</Td>
            <Td>{importKindLabel[r.kind]}</Td>
            <Td className="tabular">{formatNumber(r.counts.total)}</Td>
            <Td className="tabular">{formatNumber(r.counts.created)}</Td>
            <Td className="tabular">{formatNumber(r.counts.updated)}</Td>
            <Td className="tabular">{formatNumber(r.counts.unchanged)}</Td>
            <Td className="tabular">{formatNumber(r.counts.failed)}</Td>
            <Td>
              <StatusPill tone={importStatusTone(r.status)}>{r.status}</StatusPill>
            </Td>
            <Td>
              <div className="flex gap-3 text-[12.5px] font-semibold text-primary">
                <Link to="/imports/$importId" params={{ importId: r.id }} className="hover:underline">
                  View Details
                </Link>
                {r.errors.length > 0 && (
                  <Link to="/imports/$importId" params={{ importId: r.id }} search={{ errors: true }} className="hover:underline">
                    View Errors
                  </Link>
                )}
              </div>
            </Td>
          </Tr>
        ))}
      </DataTable>
    </>
  );
}
