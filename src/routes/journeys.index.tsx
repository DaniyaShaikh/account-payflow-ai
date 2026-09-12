import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, KpiCard } from "@/components/payflow-ui";
import { JourneyLibrary, useVisibleJourneys } from "@/components/journey-library";
import { formatNumber } from "@/lib/payflow-data";

export const Route = createFileRoute("/journeys/")({
  head: () => ({
    meta: [
      { title: "Workflows — PayFlow" },
      {
        name: "description",
        content:
          "Library of approved, AI-adapted and AI-created collection strategies applied to customer accounts across PayFlow clients.",
      },
      { property: "og:title", content: "Workflows — PayFlow" },
      {
        property: "og:description",
        content: "Reusable collection strategies, their scope, assigned accounts and outcomes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JourneysPage,
});

function JourneysPage() {
  const journeys = useVisibleJourneys();

  const active = journeys.filter((j) => j.status === "Active");
  const assigned = journeys.reduce((sum, j) => sum + j.accountsAssigned, 0);
  const adapted = journeys.filter((j) => j.type === "AI-Adapted Workflow").length;
  const created = journeys.filter((j) => j.type === "AI-Created Workflow").length;

  return (
    <>
      <PageHeader
        title="Workflows"
        description="View and manage the collection strategies used across PayFlow."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active Workflows" value={String(active.length)} hint="Available for assignment" />
        <KpiCard
          label="Accounts Currently Assigned"
          value={formatNumber(assigned)}
          hint="Across all visible workflows"
        />
        <KpiCard label="AI-Adapted Workflows" value={String(adapted)} hint="Adapted from approved strategies" />
        <KpiCard
          label="AI-Created Workflows"
          value={String(created)}
          hint="Created where no workflow fitted"
        />
      </div>

      <Panel
        title="Workflow Library"
        description="Reusable collection strategies. Existing workflows are reused or adapted before a new one is created."
      >
        <JourneyLibrary journeys={journeys} />
      </Panel>
    </>
  );
}
