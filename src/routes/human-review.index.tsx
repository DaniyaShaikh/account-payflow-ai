import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, KpiCard, Panel } from "@/components/payflow-ui";
import { ReviewQueue } from "@/components/review-queue";
import { useReviews } from "@/lib/reviews-context";
import { useRole } from "@/lib/role-context";
import { formatNumber } from "@/lib/payflow-data";

interface ReviewSearch {
  status?: string;
  priority?: string;
}

export const Route = createFileRoute("/human-review/")({
  validateSearch: (search: Record<string, unknown>): ReviewSearch => ({
    ...(typeof search["status"] === "string" ? { status: search["status"] } : {}),
    ...(typeof search["priority"] === "string" ? { priority: search["priority"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Human Review — PayFlow Collections" },
      {
        name: "description",
        content:
          "Exception queue for collection decisions that governance requires a supervisor to approve, modify, reject or hold.",
      },
      { property: "og:title", content: "Human Review — PayFlow Collections" },
      {
        property: "og:description",
        content: "Supervisor decision queue for collection exceptions requiring human judgement.",
      },
    ],
  }),
  component: HumanReviewPage,
});

function HumanReviewPage() {
  const { status, priority } = Route.useSearch();
  const { counts } = useReviews();
  const { isAdmin } = useRole();

  return (
    <>
      <PageHeader
        title="Human Review"
        description="Review collection decisions requiring human judgement."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Awaiting Review" value={formatNumber(counts.awaiting)} tone="primary" />
        <KpiCard label="High Priority" value={formatNumber(counts.highPriority)} />
        <KpiCard label="Due Today" value={formatNumber(counts.dueToday)} />
        <KpiCard label="On Hold" value={formatNumber(counts.onHold)} />
      </div>

      <ReviewQueue
        {...(status ? { initialStatus: status } : {})}
        {...(priority ? { initialPriority: priority } : {})}
      />

      <Panel className="mt-5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Human review is an exception workspace, not the normal workflow. Routine
          outcomes — partial payments, successful installments, no response, failed payments and
          communication failures — update the customer context and trigger reassessment. A review is
          created only when an evaluated governance rule requires human judgement.
          {!isAdmin && " You only see reviews for the clients assigned to you."}
        </p>
      </Panel>
    </>
  );
}
