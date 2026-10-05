import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn, PageHeader, Panel } from "@/components/payflow-ui";
import { ImportErrorTable, ImportResult } from "@/components/import-flow";
import { getImport, importKindLabel } from "@/lib/import-data";

export const Route = createFileRoute("/imports/$importId")({
  validateSearch: (s: Record<string, unknown>): { errors?: boolean } => (s["errors"] ? { errors: true } : {}),
  head: () => ({
    meta: [
      { title: "Import Details — PayFlow Collections" },
      { name: "description", content: "Results, reconciliation and error details for a CRM file import." },
      { property: "og:title", content: "Import Details — PayFlow Collections" },
      { property: "og:description", content: "Reconciliation results and errors for a CRM file import." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportDetail,
});

function ImportDetail() {
  const { importId } = Route.useParams();
  const run = getImport(importId);
  if (!run) {
    return (
      <Panel title="Import not found">
        <Link to="/imports" className="text-[13px] font-medium text-primary">
          Back to Import History
        </Link>
      </Panel>
    );
  }
  const back = run.kind === "client" ? "/clients" : "/accounts";
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Import History", to: "/imports" }, { label: run.fileName }]}
        title="Import Details"
        description={`${importKindLabel[run.kind]} · uploaded by ${run.uploadedBy}`}
      />
      <ImportResult
        run={run}
        returnTo={
          <Link to={back}>
            <Btn variant="primary">Return to {run.kind === "client" ? "Clients" : "Accounts"}</Btn>
          </Link>
        }
      />
      <div className="mt-6">
        <h2 className="mb-3 text-[15px] font-semibold text-foreground">Errors &amp; Validation Details</h2>
        <ImportErrorTable errors={run.errors} />
      </div>
    </>
  );
}
