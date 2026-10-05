import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/payflow-ui";
import { ImportFlow } from "@/components/import-flow";

export const Route = createFileRoute("/clients/import")({
  head: () => ({
    meta: [
      { title: "Import Clients — PayFlow Collections" },
      { name: "description", content: "Upload a CRM file to create or update Clients and their Sub-Clients/Portfolios in bulk." },
      { property: "og:title", content: "Import Clients — PayFlow Collections" },
      { property: "og:description", content: "Bulk Client → Sub-Client import with validation, preview and results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        breadcrumb={[{ label: "Clients", to: "/clients" }, { label: "Import from File" }]}
        title="Import Clients"
        description="Upload a CRM file containing Clients and their Sub-Clients/Portfolios (Client → Sub-Client). New records are created and existing ones updated after you review the preview."
        actions={
          <Link to="/imports" search={{ type: "client" }} className="text-[12.5px] font-semibold text-primary hover:underline">
            Import History
          </Link>
        }
      />
      <ImportFlow kind="client" />
    </>
  ),
});
