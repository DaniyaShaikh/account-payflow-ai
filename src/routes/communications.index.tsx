import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, KpiCard, StatusPill } from "@/components/payflow-ui";
import { CommunicationTable, useVisibleCommunications } from "@/components/communication-table";
import { commSummary, dropOffSegmentOf, dropOffSegments } from "@/lib/communication-data";

export const Route = createFileRoute("/communications/")({
  head: () => ({
    meta: [
      { title: "Customer Communications — PayFlow" },
      {
        name: "description",
        content:
          "Monitor collection communications across clients and channels, with delivery, engagement and payment link activity for every customer account.",
      },
      { property: "og:title", content: "Customer Communications — PayFlow" },
      {
        property: "og:description",
        content: "Email and SMS collection communications with delivery and engagement outcomes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    status?: string | undefined;
    channel?: string | undefined;
    client?: string | undefined;
    journey?: string | undefined;
  } => {
    const pick = (key: string) =>
      typeof search[key] === "string" ? (search[key] as string) : undefined;
    return { status: pick("status"), channel: pick("channel"), client: pick("client"), journey: pick("journey") };
  },

  component: CommunicationsPage,
});

function CommunicationsPage() {
  const rows = useVisibleCommunications();
  const search = Route.useSearch();
  const summary = commSummary(rows);

  return (
    <>
      <PageHeader
        title="Communications"
        description="Monitor customer collection communications across Clients and channels."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Sent Today" value={String(summary.sentToday)} />
        <KpiCard label="Delivered" value={String(summary.delivered)} />
        <KpiCard label="Engaged" value={String(summary.engaged)} />
        <KpiCard label="Payment Link Clicks" value={String(summary.clicks)} tone="primary" />
        <KpiCard label="Failed" value={String(summary.failed)} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Drop-off
        </span>
        {dropOffSegments.map((segment) => (
          <StatusPill key={segment}>
            {segment} · {rows.filter((c) => dropOffSegmentOf(c) === segment).length}
          </StatusPill>
        ))}
      </div>

      <Panel
        title="Communication Log"
        description="Every communication belongs to a client, customer account, collection case and journey."
      >
        <CommunicationTable
          rows={rows}
          initialStatus={search.status ?? "All Statuses"}
          initialChannel={search.channel ?? "All Channels"}
          initialClient={search.client ?? "All Clients"}
          initialJourney={search.journey ?? "All Journeys"}
        />
      </Panel>
    </>
  );
}
