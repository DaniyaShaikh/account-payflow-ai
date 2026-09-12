import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatusPill, Btn } from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { accounts, clientName, formatNumber } from "@/lib/payflow-data";
import {
  accountsAssignedToJourney,
  journeyById,
  journeyStatusTone,
  journeyStepTone,
  journeyTypeTone,
} from "@/lib/journey-data";
import { communicationsForJourney } from "@/lib/communication-data";

export const Route = createFileRoute("/journeys/$journeyId")({
  head: () => ({
    meta: [
      { title: "Workflow detail — PayFlow Collections" },
      {
        name: "description",
        content:
          "Collection collection workflow detail with its stages, timing, reassessment points, version history and the accounts currently assigned to it.",
      },
      { property: "og:title", content: "Workflow detail — PayFlow Collections" },
      {
        property: "og:description",
        content: "Stages, timing and reassessment points of a PayFlow collection strategy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ params }) => {
    if (!journeyById(params.journeyId)) throw notFound();
    return null;
  },
  component: JourneyDetail,
});

function JourneyDetail() {
  const { journeyId } = Route.useParams();
  const { canSeeClient } = useRole();
  const journey = journeyById(journeyId)!;
  const [showReasoning, setShowReasoning] = useState(false);

  if (journey.clientId && !canSeeClient(journey.clientId)) {
    return (
      <Panel title="No access to this collection workflow">
        <p className="text-sm text-muted-foreground">
          This journey belongs to a client that is not assigned to your supervisor account.
        </p>
        <Link to="/journeys" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to collection workflows
        </Link>
      </Panel>
    );
  }

  const assignments = accountsAssignedToJourney(journey.id).filter((a) => {
    const account = accounts.find((acc) => acc.id === a.accountId);
    return account ? canSeeClient(account.clientId) : false;
  });
  const journeyComms = communicationsForJourney(journey.id).filter((c) => canSeeClient(c.clientId));

  const facts = [
    { label: "Scope", value: journey.scope },
    ...(journey.clientId ? [{ label: "Client", value: clientName(journey.clientId) }] : []),
    { label: "Type", value: journey.type },
    { label: "Current Version", value: journey.version },
    { label: "Status", value: journey.status },
    { label: "Accounts Assigned", value: `${formatNumber(journey.accountsAssigned)} accounts` },
    { label: "Created By / Source", value: journey.source },
    { label: "Recovery / Outcome", value: journey.recoveryNote },
    { label: "Last Updated", value: journey.lastUpdated },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Workflows", to: "/journeys" }, { label: journey.name }]}
        title={journey.name}
        description={`${journey.scope} · ${journey.type}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={journeyTypeTone(journey.type)}>{journey.type}</StatusPill>
            <StatusPill tone={journeyStatusTone(journey.status)}>{journey.status}</StatusPill>
            <StatusPill>{journey.version}</StatusPill>
          </div>
        }
      />

      {journey.status === "Awaiting Approval" && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-[13px] text-foreground">
            This collection workflow requires supervisor approval under the client's governance configuration
            before it can be used.
          </p>
          {journey.reviewId && (
            <Link to="/human-review/$reviewId" params={{ reviewId: journey.reviewId }}>
              <Btn variant="primary">Open Human Review</Btn>
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-5">
          <Panel title="Workflow Summary" bodyClassName="p-0">
            <dl className="divide-y divide-border">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                  <dd className="tabular text-[13px] font-medium text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Why PayFlow uses this Workflow">
            <button
              onClick={() => setShowReasoning((v) => !v)}
              className="text-[13px] font-medium text-primary hover:underline"
            >
              {showReasoning ? "Hide explanation" : "Show explanation"}
            </button>
            {showReasoning && (
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {journey.reasoning}
              </p>
            )}
          </Panel>

          <Panel title="Version History" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {journey.versions.map((v) => (
                <li key={v.version} className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-semibold text-foreground">{v.version}</span>
                    <span className="text-xs text-muted-foreground">{v.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{v.note}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            title="Collection Strategy"
            description="Stages are guidance, not a fixed script — each reassessment can change the next action."
          >
            <ol className="space-y-2">
              {journey.steps.map((step, i) => (
                <li key={`${step.title}-${i}`}>
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5">
                    <span className="tabular mt-0.5 w-4 shrink-0 text-[11px] text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-foreground">
                          {step.title}
                        </span>
                        <StatusPill tone={journeyStepTone(step.kind)}>{step.kind}</StatusPill>
                        {step.channel && <StatusPill>{step.channel}</StatusPill>}
                        {step.timing && (
                          <span className="text-[11px] text-muted-foreground">{step.timing}</span>
                        )}
                      </div>
                      {step.detail && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                      )}
                    </div>
                  </div>
                  {i < journey.steps.length - 1 && (
                    <div className="ml-[26px] h-3 w-px bg-border" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel
            title="Accounts on this Workflow"
            description="Collection cases currently following this strategy"
            bodyClassName="p-0"
          >
            {assignments.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                No visible accounts are currently assigned to this collection workflow.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {assignments.map((a) => {
                  const account = accounts.find((acc) => acc.id === a.accountId)!;
                  return (
                    <li key={a.accountId} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          to="/accounts/$accountId"
                          params={{ accountId: a.accountId }}
                          className="text-[13px] font-semibold text-primary hover:underline"
                        >
                          {account.customer} · {account.reference}
                        </Link>
                        <StatusPill>{a.stage}</StatusPill>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {clientName(account.clientId)} · next: {a.nextAction}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title="Recent Communications"
            description="Actions executed as part of this strategy"
            bodyClassName="p-0"
          >
            {journeyComms.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                No communications recorded for this collection workflow yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {journeyComms.slice(0, 6).map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <Link
                      to="/communications/$communicationId"
                      params={{ communicationId: c.id }}
                      className="text-[13px] font-medium text-primary hover:underline"
                    >
                      {c.channel} · {c.purpose} · {c.customer}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {c.dateLabel} · {c.journeyStage}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
