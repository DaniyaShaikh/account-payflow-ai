import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/payflow-ui";
import { ImportFlow } from "@/components/import-flow";

export const Route = createFileRoute("/accounts/import")({
  head: () => ({
    meta: [
      { title: "Upload Daily CRM File — PayFlow Collections" },
      { name: "description", content: "Upload the daily CRM account file to refresh existing accounts and create new ones." },
      { property: "og:title", content: "Upload Daily CRM File — PayFlow Collections" },
      { property: "og:description", content: "Validate, preview and process the daily CRM account file." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        breadcrumb={[{ label: "Accounts / Cases", to: "/accounts" }, { label: "Upload Daily CRM File" }]}
        title="Upload Daily CRM File"
        description="Provide the latest CRM account data. Existing accounts are refreshed and new accounts are created after you review the preview."
      />
      <ImportFlow kind="account" />
    </>
  ),
});
