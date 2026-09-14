import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatusPill, statusTone, Btn } from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { useReviews } from "@/lib/reviews-context";
import { reviewStatusTone } from "@/lib/review-data";
import { accounts, clientName, formatCurrency } from "@/lib/payflow-data";
import { journeyStateForAccount, journeyStatusTone, journeyTypeTone } from "@/lib/journey-data";
import {
  commStatusTone,
  communicationTimelineEvents,
  communicationsForAccount,
  engagementLabel,
} from "@/lib/communication-data";
import {
  outcomeHandling,
  paymentStatusTone,
  paymentSummaryFor,
  paymentTimelineEvents,
  paymentTokenForAccount,
  type PaymentOutcome,
} from "@/lib/payment-data";

export const Route = createFileRoute("/accounts/$accountId")({
  head: () => ({
    meta: [
      { title: "Customer account & collection case — PayFlow" },
      {
        name: "description",
        content:
          "Customer account detail with balances, collection status, current workflow and full collection activity timeline.",
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

interface TimelineEvent {
  at: string;
  label: string;
  detail: string;
  reviewId?: string;
  communicationId?: string;
}

function AccountDetail() {
  const { accountId } = Route.useParams();
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const { canSeeClient } = useRole();
  const { reviewsForAccount, accountReviewEvents } = useReviews();
  const account = accounts.find((a) => a.id === accountId)!;
  const caseReviews = reviewsForAccount(accountId);
  const journeyState = journeyStateForAccount(accountId, account.journey);
  const accountComms = communicationsForAccount(accountId);
  const payment = paymentSummaryFor(accountId);
  const handledOutcome: PaymentOutcome =
    payment?.status === "Paid in Full"
      ? "Paid in Full"
      : payment?.status === "Payment Plan Active"
        ? "Installment Received"
        : payment?.status === "Last Payment Failed"
          ? "Payment Failed"
          : payment?.status === "Partial Payment Received"
            ? "Partial Payment"
            : "Payment Not Completed";
  const timeline: TimelineEvent[] = [
    ...account.timeline,
    ...communicationTimelineEvents(accountId),
    ...paymentTimelineEvents(accountId),
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
    { label: "Customer / Customer Account", value: account.customer },
    { label: "Account Reference", value: account.reference },
    { label: "Collection Case", value: account.caseReference },
    { label: "Original Balance", value: formatCurrency(account.originalBalance) },
    { label: "Outstanding Balance", value: formatCurrency(account.outstanding) },
    { label: "Amount Recovered", value: formatCurrency(account.recovered) },
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
        description={`Account ${account.reference} · Case ${account.caseReference}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill tone={statusTone(account.status)}>{account.status}</StatusPill>
            {account.humanReview && <StatusPill tone="danger">Human review</StatusPill>}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
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

          {payment && (
            <Panel
              title="Payment"
              description="Payment outcomes received from the customer payment experience"
              action={
                <a href={`/pay/${paymentTokenForAccount(account)}`} target="_blank" rel="noreferrer">
                  <Btn>Preview Payment Experience</Btn>
                </a>
              }
              bodyClassName="p-0"
            >
              <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5">
                <span className="text-[13px] text-muted-foreground">Payment Status</span>
                <StatusPill tone={paymentStatusTone(payment.status)}>{payment.status}</StatusPill>
              </div>
              <dl className="divide-y divide-border">
                <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[13px] text-muted-foreground">Outstanding Balance</dt>
                  <dd className="tabular text-[13px] font-medium text-foreground">
                    {formatCurrency(payment.outstanding)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[13px] text-muted-foreground">Amount Recovered</dt>
                  <dd className="tabular text-[13px] font-medium text-foreground">
                    {formatCurrency(payment.recovered)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[13px] text-muted-foreground">Last Payment</dt>
                  <dd className="tabular text-[13px] font-medium text-foreground">
                    {payment.lastPayment
                      ? `${formatCurrency(payment.lastPayment.amount)} · ${payment.lastPayment.at} · ${payment.lastPayment.method}`
                      : "No payment received yet"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[13px] text-muted-foreground">Payment Plan</dt>
                  <dd className="tabular text-[13px] font-medium text-foreground">
                    {payment.plan
                      ? `${payment.plan.paymentsMade} of ${payment.plan.totalPayments} payments made`
                      : "No active arrangement"}
                  </dd>
                </div>
                {payment.plan && (
                  <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <dt className="text-[13px] text-muted-foreground">Next Installment</dt>
                    <dd className="tabular text-[13px] font-medium text-foreground">
                      {formatCurrency(payment.plan.installmentAmount)} · {payment.plan.nextInstallment}
                    </dd>
                  </div>
                )}
                {payment.failedAttempts > 0 && (
                  <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <dt className="text-[13px] text-muted-foreground">Failed Attempts</dt>
                    <dd className="tabular text-[13px] font-medium text-foreground">
                      {payment.failedAttempts}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="border-t border-border px-4 py-3">
                <p className="text-[12px] font-medium text-foreground">
                  How this outcome is handled
                </p>
                <ul className="mt-1.5 space-y-1">
                  {outcomeHandling[handledOutcome].map((line) => (
                    <li key={line} className="text-[12px] leading-relaxed text-muted-foreground">
                      · {line}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          )}

          {journeyState?.journey && (
            <Panel
              title="Current Workflow"
              description="The collection strategy currently applied to this case"
            >

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-foreground">
                  {journeyState.journey.name}
                </span>
                <StatusPill tone={journeyTypeTone(journeyState.journey.type)}>
                  {journeyState.journey.type}
                </StatusPill>
                <StatusPill tone={journeyStatusTone(journeyState.journey.status)}>
                  {journeyState.journey.status}
                </StatusPill>
              </div>
              <dl className="mt-3 divide-y divide-border border-t border-border">
                <div className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-[13px] text-muted-foreground">Current Stage</dt>
                  <dd className="text-[13px] font-medium text-foreground">{journeyState.stage}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-[13px] text-muted-foreground">Workflow Started</dt>
                  <dd className="text-[13px] font-medium text-foreground">
                    {journeyState.startedAt}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-[13px] text-muted-foreground">Next Planned Action</dt>
                  <dd className="text-[13px] font-medium text-foreground">
                    {journeyState.nextAction}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  Why this workflow was selected for this account:{" "}
                </span>
                {journeyState.whySelected}
              </p>
            </Panel>
          )}

          {journeyState?.journey && (
            <WorkflowFlowPanel
              clientId={account.clientId}
              workflowName={journeyState.journey.name}
              title="Workflow Map"
              description="The live visual strategy for this case. Click any step to review or adjust it."
            />
          )}


          {accountComms.length > 0 && (
            <Panel
              title="Communications"
              description="Actions executed as part of the current strategy"
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-border">
                {accountComms.map((c) => (
                  <li key={c.id} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to="/communications/$communicationId"
                        params={{ communicationId: c.id }}
                        className="text-[13px] font-semibold text-primary hover:underline"
                      >
                        {c.channel} · {c.purpose}
                      </Link>
                      <StatusPill tone={commStatusTone(c.status)}>{c.status}</StatusPill>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.dateLabel} {c.time} · {c.journeyStage} · {engagementLabel(c)}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

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
              {timeline.slice(0, showAllTimeline ? undefined : 6).map((event, i) => (
                <li key={`${event.label}-${event.at}-${i}`} className="relative">
                  <span className="absolute top-1 -left-5 size-[11px] rounded-full border-2 border-card bg-primary/70" />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-medium text-foreground">{event.label}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{event.at}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.detail}</p>
                  {event.reviewId && (
                    <Link
                      to="/human-review/$reviewId"
                      params={{ reviewId: event.reviewId }}
                      className="mt-0.5 inline-block text-[11px] font-medium text-primary hover:underline"
                    >
                      Open review
                    </Link>
                  )}
                  {event.communicationId && (
                    <Link
                      to="/communications/$communicationId"
                      params={{ communicationId: event.communicationId }}
                      className="mt-0.5 inline-block text-[11px] font-medium text-primary hover:underline"
                    >
                      Open communication
                    </Link>
                  )}
                </li>
              ))}
            </ol>
              {timeline.length > 6 && (
                <button
                  onClick={() => setShowAllTimeline(!showAllTimeline)}
                  className="mt-4 text-[12px] font-medium text-primary hover:underline"
                >
                  {showAllTimeline ? "Show less" : `Show ${timeline.length - 6} more events`}
                </button>
              )}
          </Panel>
        </div>
      </div>
    </>
  );
}
