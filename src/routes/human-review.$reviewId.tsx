import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  PageHeader,
  Panel,
  StatusPill,
  Btn,
  Field,
  SelectInput,
  TextInput,
  TextArea,
  SectionHeading,
} from "@/components/payflow-ui";
import { useReviews } from "@/lib/reviews-context";
import { formatCurrency } from "@/lib/payflow-data";
import { useRole } from "@/lib/role-context";
import {
  formatWaiting,
  priorityTone,
  proposedActions,
  rejectionReasons,
  reviewStatusTone,
  type HumanReview,
} from "@/lib/review-data";

export const Route = createFileRoute("/human-review/$reviewId")({
  head: () => ({
    meta: [
      { title: "Review decision — PayFlow Human Review" },
      {
        name: "description",
        content:
          "Focused supervisor workspace: why review is required, the proposed collection action, customer context and the approve, modify, reject or hold decision.",
      },
      { property: "og:title", content: "Review decision — PayFlow Human Review" },
      {
        property: "og:description",
        content: "Supervisor decision workspace for a collection exception.",
      },
    ],
  }),
  component: ReviewDetail,
});

type Mode = null | "approve" | "modify" | "reject" | "hold";

function ReviewDetail() {
  const { reviewId } = Route.useParams();
  const { visibleReviews, canDecide, approve, modify, reject, hold } = useReviews();
  const { visibleClients } = useRole();
  const [mode, setMode] = useState<Mode>(null);
  const [why, setWhy] = useState(false);

  const review = visibleReviews.find((r) => r.id === reviewId);

  if (!review) {
    return (
      <Panel title="Review unavailable">
        <p className="text-sm text-muted-foreground">
          This review either does not exist or belongs to a client that is not assigned to you.
        </p>
        <Link to="/human-review" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to human review
        </Link>
      </Panel>
    );
  }

  const clientLabel = visibleClients.find((c) => c.id === review.clientId)?.name ?? review.clientId;
  const decidable = canDecide(review) && review.status === "Awaiting Review";
  const close = () => setMode(null);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Human Review", to: "/human-review" },
          { label: `${clientLabel} · ${review.customer}` },
        ]}
        title="Human Review"
        description={`${clientLabel} · ${review.customer} · ${review.reference}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={priorityTone(review.priority)}>
              {review.priority} Priority
            </StatusPill>
            <StatusPill tone={reviewStatusTone(review.status)}>{review.status}</StatusPill>
          </div>
        }
      />

      <div className="panel mb-5 grid gap-4 px-5 py-4 sm:grid-cols-3">
        <HeaderFact label="Outstanding Balance" value={formatCurrency(review.outstanding)} />
        <HeaderFact label="Current Workflow" value={review.journey} />
        <HeaderFact
          label="Review Created"
          value={`${formatWaiting(review.waitingMinutes)} ago`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-warning/40 bg-warning/8 px-5 py-4">
            <p className="text-eyebrow">Why this requires review</p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Pair label="Triggered Rule">
                <Link
                  to="/rules/$ruleId"
                  params={{ ruleId: review.ruleId }}
                  className="text-[13px] font-semibold text-primary hover:underline"
                >
                  {review.ruleName}
                </Link>
              </Pair>
              <Pair label="Condition">
                <span className="text-[13px] font-medium">{review.conditionText}</span>
              </Pair>
              <Pair label="Observed Value">
                <span className="text-[13px] font-medium">{review.observedValue}</span>
              </Pair>
              <Pair label="Result">
                <span className="text-[13px] font-medium">Require Human Review</span>
              </Pair>
            </dl>
          </section>

          <Panel
            title="PayFlow Recommendation"
            description="Proposed action awaiting your decision"
            action={
              review.confidence !== null ? (
                <StatusPill tone="ai">Confidence {review.confidence}%</StatusPill>
              ) : undefined
            }
          >
            <p className="text-[14px] leading-relaxed font-medium text-foreground">
              {review.proposedAction}
            </p>
            <button
              type="button"
              onClick={() => setWhy((v) => !v)}
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-primary"
            >
              Why this action?
              <ChevronDown className={`size-3.5 transition-transform ${why ? "rotate-180" : ""}`} />
            </button>
            {why && (
              <ul className="mt-2 space-y-1.5 rounded-lg border border-border bg-surface px-4 py-3">
                {review.explanation.map((line) => (
                  <li key={line} className="text-[12px] leading-relaxed text-muted-foreground">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent Activity" description="Events relevant to this decision">
            <ol className="relative space-y-3.5 pl-5">
              <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-border" />
              {review.timeline.map((event) => (
                <li key={event.at + event.label} className="relative">
                  <span className="absolute top-1 -left-5 size-[11px] rounded-full border-2 border-card bg-primary/70" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13px] font-medium text-foreground">{event.label}</p>
                    <span className="text-xs text-muted-foreground">{event.at}</span>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              to="/accounts/$accountId"
              params={{ accountId: review.accountId }}
              className="mt-4 inline-block text-[12px] font-medium text-primary hover:underline"
            >
              View Full History
            </Link>
          </Panel>

          <Panel title="Decision" description="Each decision has a distinct operational outcome">
            {!decidable ? (
              <ResolvedSummary review={review} canDecide={canDecide(review)} />
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Btn variant="primary" onClick={() => setMode("approve")}>
                    Approve
                  </Btn>
                  <Btn onClick={() => setMode("modify")}>Modify / Guide</Btn>
                  <Btn variant="danger" onClick={() => setMode("reject")}>
                    Reject
                  </Btn>
                  <Btn onClick={() => setMode("hold")}>Hold</Btn>
                </div>

                {mode === "approve" && (
                  <ApprovePanel
                    review={review}
                    onCancel={close}
                    onConfirm={() => {
                      approve(review.id);
                      close();
                    }}
                  />
                )}
                {mode === "modify" && (
                  <ModifyPanel
                    review={review}
                    onCancel={close}
                    onConfirm={(input) => {
                      modify(review.id, input);
                      close();
                    }}
                  />
                )}
                {mode === "reject" && (
                  <RejectPanel
                    onCancel={close}
                    onConfirm={(input) => {
                      reject(review.id, input);
                      close();
                    }}
                  />
                )}
                {mode === "hold" && (
                  <HoldPanel
                    onCancel={close}
                    onConfirm={(input) => {
                      hold(review.id, input);
                      close();
                    }}
                  />
                )}
              </>
            )}
          </Panel>

          <div>
            <SectionHeading
              title="Review History"
              description="Full audit trail for this decision"
            />
            <Panel>
              <ol className="space-y-3">
                {review.history.map((entry, i) => (
                  <li key={`${entry.at}-${i}`} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span className="leading-tight">
                      <span className="block text-[12px] font-medium text-foreground">
                        {entry.event}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {entry.at}
                        {entry.by ? ` · ${entry.by}` : ""}
                        {entry.detail ? ` · ${entry.detail}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>

        <div className="space-y-5">
          <Panel title="Customer & Account" bodyClassName="px-5 pb-4">
            <dl className="divide-y divide-border">
              {[
                ["Client", clientLabel],
                ["Customer", review.customer],
                ["Account", review.reference],
                ["Original Balance", formatCurrency(review.originalBalance)],
                ["Outstanding Balance", formatCurrency(review.outstanding)],
                ["Amount Recovered", formatCurrency(review.recovered)],
                ["Days Past Due", String(review.daysPastDue)],
                ["Current Workflow", review.journey],
                ...review.context.map((c) => [c.label, c.value] as [string, string]),
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2">
                  <dt className="text-[12px] text-muted-foreground">{label}</dt>
                  <dd className="text-right text-[12px] font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <Link
              to="/accounts/$accountId"
              params={{ accountId: review.accountId }}
              className="mt-3 inline-block text-[12px] font-medium text-primary hover:underline"
            >
              View Full Collection Case
            </Link>
          </Panel>

          <Panel title="Governance">
            <dl className="divide-y divide-border">
              <Row label="Rule">
                <Link
                  to="/rules/$ruleId"
                  params={{ ruleId: review.ruleId }}
                  className="text-[12px] font-medium text-primary hover:underline"
                >
                  {review.ruleName}
                </Link>
              </Row>
              <Row label="Requirement">
                <span className="text-[12px] font-medium">Require Human Review</span>
              </Row>
              <Row label="Client Scope">
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: review.clientId }}
                  className="text-[12px] font-medium text-primary hover:underline"
                >
                  {clientLabel}
                </Link>
              </Row>
            </dl>
          </Panel>

          <Panel title="Review Metadata">
            <dl className="divide-y divide-border">
              <Row label="Review ID">
                <span className="text-[12px] font-medium">{review.id}</span>
              </Row>
              <Row label="Assigned Supervisor">
                <span className="text-[12px] font-medium">
                  {review.assignedSupervisor ?? "Unassigned"}
                </span>
              </Row>
              <Row label="Waiting">
                <span className="tabular text-[12px] font-medium">
                  {formatWaiting(review.waitingMinutes)}
                </span>
              </Row>
              {review.holdUntil && (
                <Row label="Hold Until">
                  <span className="text-[12px] font-medium">{review.holdUntil}</span>
                </Row>
              )}
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Approved, modified and rejected decisions are recorded as feedback for later analytics
              and collection workflow evaluation. A single decision does not retrain the model.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}

function HeaderFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-eyebrow">{label}</p>
      <p className="tabular mt-1 text-[15px] font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Pair({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function DecisionBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-4">{children}</div>
  );
}

function ApprovePanel({
  review,
  onCancel,
  onConfirm,
}: {
  review: HumanReview;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <DecisionBox>
      <p className="text-[13px] font-semibold text-foreground">Approve this recommended action?</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {review.proposedAction} — the governance requirement is satisfied and the approved action
        proceeds on the collection case.
      </p>
      <div className="mt-3 flex gap-2">
        <Btn variant="primary" onClick={onConfirm}>
          Approve &amp; Continue
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </DecisionBox>
  );
}

function ModifyPanel({
  review,
  onCancel,
  onConfirm,
}: {
  review: HumanReview;
  onCancel: () => void;
  onConfirm: (input: { action: string; guidance: string }) => void;
}) {
  const [action, setAction] = useState(review.proposedAction);
  const [guidance, setGuidance] = useState("");
  return (
    <DecisionBox>
      <p className="text-[13px] font-semibold text-foreground">Modify or guide the action</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Recommended: {review.proposedAction}
      </p>
      <div className="mt-3 space-y-3">
        <Field label="Final action">
          <SelectInput value={action} options={proposedActions} onChange={setAction} />
        </Field>
        <Field label="Guidance (optional)" hint="Recorded with the decision for future analysis.">
          <TextArea
            value={guidance}
            onChange={setGuidance}
            placeholder="Customer made a recent partial payment. Maintain softer tone for the next communication."
          />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Btn variant="primary" onClick={() => onConfirm({ action, guidance })}>
          Apply Guidance &amp; Continue
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </DecisionBox>
  );
}

function RejectPanel({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (input: { reason: string; comment: string }) => void;
}) {
  const [reason, setReason] = useState(rejectionReasons[0]!);
  const [comment, setComment] = useState("");
  return (
    <DecisionBox>
      <p className="text-[13px] font-semibold text-foreground">Reject the proposed action</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        The recommendation will not execute. The case returns for reassessment with an alternative
        strategy.
      </p>
      <div className="mt-3 space-y-3">
        <Field label="Rejection reason">
          <SelectInput value={reason} options={rejectionReasons} onChange={setReason} />
        </Field>
        <Field label="Comment (optional)">
          <TextArea value={comment} onChange={setComment} placeholder="Additional context" />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Btn variant="danger" onClick={() => onConfirm({ reason, comment })}>
          Reject Action
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </DecisionBox>
  );
}

function HoldPanel({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (input: { until: string; reason: string }) => void;
}) {
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("");
  const [furtherReview, setFurtherReview] = useState(false);
  return (
    <DecisionBox>
      <p className="text-[13px] font-semibold text-foreground">Hold the proposed action</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Collection activity respects the hold until the review resumes.
      </p>
      <div className="mt-3 space-y-3">
        <Field label="Hold until (date / time)">
          <TextInput
            value={until}
            onChange={setUntil}
            placeholder="14 Sep 2026 · 09:00"
            disabled={furtherReview}
          />
        </Field>
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <input
            type="checkbox"
            checked={furtherReview}
            onChange={(e) => setFurtherReview(e.target.checked)}
          />
          Hold until further review
        </label>
        <Field label="Reason (optional)">
          <TextArea
            value={reason}
            onChange={setReason}
            placeholder="Customer contacted support and requested 48 hours."
          />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Btn
          variant="primary"
          onClick={() =>
            onConfirm({ until: furtherReview ? "Further review" : until, reason })
          }
        >
          Place On Hold
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </DecisionBox>
  );
}

function ResolvedSummary({
  review,
  canDecide,
}: {
  review: HumanReview;
  canDecide: boolean;
}) {
  if (review.status === "Awaiting Review" && !canDecide) {
    return (
      <p className="text-[13px] text-muted-foreground">
        You have view-only access to human reviews for this client. Approving reviews requires the
        “Approve Human Reviews” permission.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={reviewStatusTone(review.status)}>{review.status}</StatusPill>
        {review.assignedSupervisor && <StatusPill>by {review.assignedSupervisor}</StatusPill>}
      </div>
      {review.finalAction && (
        <p className="text-[13px] text-foreground">
          <span className="text-muted-foreground">Final action: </span>
          {review.finalAction}
        </p>
      )}
      {review.guidance && (
        <p className="text-[12px] text-muted-foreground">Guidance: {review.guidance}</p>
      )}
      {review.rejectionReason && (
        <p className="text-[12px] text-muted-foreground">
          Rejection reason: {review.rejectionReason}
        </p>
      )}
      {review.holdUntil && (
        <p className="text-[12px] text-muted-foreground">Held until: {review.holdUntil}</p>
      )}
    </div>
  );
}
