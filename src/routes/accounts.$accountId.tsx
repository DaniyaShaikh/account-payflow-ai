import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader, Panel, StatusPill, statusTone } from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { useReviews } from "@/lib/reviews-context";
import { reviewStatusTone } from "@/lib/review-data";
import { accounts, clientName, formatCurrency } from "@/lib/payflow-data";

export const Route = createFileRoute("/accounts/$accountId")({
  head: () => ({
    meta: [
      { title: "Customer account & collection case — PayFlow" },
      {
        name: "description",
        content:
          "Customer account detail with balances, collection status, current journey and full collection activity timeline.",
      },
      { property: "og:title", content: "Customer account & collection case — PayFlow" },
      {
        property: "og:description",
        content: "Balances, collection case status and activity timeline for a customer account.",
      },
    ],
  }),
  loader: ({ params }) => {
    if (!accounts.some((a) => a.id === params.accountId)) throw notFound();
    return null;
  },
  component: AccountDetail,
});

function AccountDetail() {
  const { accountId } = Route.useParams();
  const { canSeeClient } = useRole();
  const { reviewsForAccount, accountReviewEvents } = useReviews();
  const account = accounts.find((a) => a.id === accountId)!;
  const caseReviews = reviewsForAccount(accountId);
  const timeline: { at: string; label: string; detail: string; reviewId?: string }[] = [
    ...account.timeline,
    ...accountReviewEvents(accountId),
  ];

  if (!canSeeClient(account.clientId)) {
    return (
      <Panel title="No access to this account">
        <p className="text-sm text-muted-foreground">
          This account belongs to a client that is not assigned to your supervisor account.
        </p>
        <Link to="/accounts" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to accounts
        </Link>
      </Panel>
    );
  }

  const facts = [
    { label: "Client", value: clientName(account.clientId) },
    { label: "Account Reference", value: account.reference },
    { label: "Original Balance", value: formatCurrency(account.originalBalance) },
    { label: "Outstanding Balance", value: formatCurrency(account.outstanding) },
    { label: "Amount Recovered", value: formatCurrency(account.recovered) },
    { label: "Current Journey", value: account.journey },
    { label: "Last Action", value: account.lastAction },
    { label: "Next Action", value: account.nextAction },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Accounts / Cases", to: "/accounts" },
          { label: clientName(account.clientId) },
          { label: account.customer },
        ]}
        title={account.customer}
        description={`${account.reference} · collection case`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill tone={statusTone(account.status)}>{account.status}</StatusPill>
            {account.humanReview && <StatusPill tone="danger">Human review</StatusPill>}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Panel title="Case Summary" bodyClassName="p-0">
          <dl className="divide-y divide-border">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                <dd className="tabular text-[13px] font-medium text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <div className="space-y-5">
          {caseReviews.length > 0 && (
            <Panel
              title="Human Review"
              description="Governance exceptions raised on this collection case"
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-border">
                {caseReviews.map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to="/human-review/$reviewId"
                        params={{ reviewId: r.id }}
                        className="text-[13px] font-semibold text-primary hover:underline"
                      >
                        {r.reason}
                      </Link>
                      <StatusPill tone={reviewStatusTone(r.status)}>{r.status}</StatusPill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Rule: {r.ruleName} · Proposed: {r.proposedAction}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Activity Timeline">
            <ol className="relative space-y-4 pl-5">
              <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-border" />
              {timeline.map((event) => (
                <li key={event.label + event.at} className="relative">
                  <span className="absolute top-1 -left-5 size-[11px] rounded-full border-2 border-card bg-primary/70" />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-medium text-foreground">{event.label}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{event.at}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.detail}</p>
                  {"reviewId" in event && event.reviewId && (
                    <Link
                      to="/human-review/$reviewId"
                      params={{ reviewId: event.reviewId }}
                      className="mt-0.5 inline-block text-[11px] font-medium text-primary hover:underline"
                    >
                      Open review
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
