import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Panel, Btn, Field, SelectInput, StatusPill, TextArea } from "./payflow-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ExpectedSender } from "./sender-management";
import { useStrategies } from "@/lib/strategy-context";
import { useRole } from "@/lib/role-context";
import {
  modifyActions,
  COMPLIANCE_AT_SEND,
  canReviewDecision,
  resolveAdaptiveDecision,
  reassessAdaptiveCase,
  usageStatus,
  isExhausted,
  occurrenceLabel,
  type Occurrence,
} from "@/lib/adaptive-workflow-data";
import type { CustomerAccount } from "@/lib/payflow-data";

const timestamp = (value: string) =>
  new Date(value.endsWith("Z") ? value : `${value}Z`).toLocaleString("en-GB", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " UTC";

export function AdaptiveCasePanel({ account }: { account: CustomerAccount }) {
  const { adaptiveCases, strategyById, updateAdaptiveCase } = useStrategies();
  const { can, userName } = useRole();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    action: "",
    channel: "Email",
    scheduled: "",
    content: "",
    note: "",
  });
  const state = adaptiveCases.find((c) => c.accountId === account.id);
  if (!state) return null;
  const strategy = strategyById(state.strategyId);
  const enabled = strategy?.adaptiveEnabled ?? false;
  const d = state.decision;
  const authorized = can("Approve Human Reviews", account.clientId);
  const modifiable = can("Modify / Guide AI Recommendation", account.clientId);
  const inHumanReview = account.humanReview;
  const expired = d.status === "Pending" && Date.parse(d.expiresAt) <= Date.now();
  const shownStatus = expired ? "Expired" : d.status;
  const awaiting = d.requiresApproval && d.status === "Pending" && !expired;
  const actionable =
    enabled &&
    !inHumanReview &&
    state.status !== "Completed" &&
    canReviewDecision(d, authorized, new Date().toISOString());
  const followup = strategy?.adaptiveFollowups?.find((f) => f.id === d.followupId);
  const followups = strategy?.adaptiveFollowups ?? [];
  // Modify may only pick approved, unused content (the decision's own scheduled set stays selectable).
  const eligible = followups.flatMap((f) =>
    (["first", "repeat"] as const)
      .filter((o) => {
        const st = usageStatus(state.usage, f, o);
        return st === "Available" || (st === "Scheduled" && f.id === d.followupId && o === d.occurrence);
      })
      .map((o) => ({ f, o, key: `${f.name} · ${occurrenceLabel[o]}` })),
  );
  const terminal = ["Rejected", "Cancelled", "Superseded", "Expired", "Blocked"].includes(d.status);
  const noSend = [
    "Wait for further activity",
    "Pause workflow",
    "Cancel scheduled communication",
    "Stop workflow",
    "Route for Operations review",
  ].includes(d.action);
  const status = !enabled ? "Disabled" : inHumanReview ? "Paused" : state.status;
  const latest = state.history.at(-1);
  const decide = (decision: "Approved" | "Rejected") => {
    if (!actionable) return;
    updateAdaptiveCase(
      resolveAdaptiveDecision(state, decision, userName, new Date().toISOString()),
    );
    setNotice(
      decision === "Approved"
        ? "Decision approved. The eligible action is scheduled; no communication has been sent."
        : "Decision rejected. The original plan is retained.",
    );
  };
  return (
    <section
      id="adaptive-decision"
      className="scroll-mt-24 target:rounded-lg target:ring-2 target:ring-primary/40"
    >
      <Panel
        title="Adaptive Workflow"
        description={inHumanReview ? "Case is in Human Review · no new adaptive decisions until it is resolved" : "Mock engagement and decision snapshot"}
        action={
          <StatusPill
            tone={
              status === "Active" ? "success" : "neutral"
            }
          >
            {status}{awaiting && status === "Active" ? " · 1 decision waiting" : ""}
          </StatusPill>
        }
      >
        <div className="space-y-4 text-xs">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Customer engagement</dt>
              <dd className="mt-1 font-medium">{state.engagement}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Current step</dt>
              <dd className="mt-1 font-medium">{state.originalStep}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Latest event</dt>
              <dd className="mt-1">
                {latest?.label ?? "No activity yet"}
                {latest && (
                  <span className="ml-2 text-muted-foreground">{timestamp(latest.at)}</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Next scheduled action</dt>
              <dd className="mt-1 font-medium">
                {!enabled || d.status === "Rejected" || d.status === "Pending"
                  ? `${state.originalStep} · ${state.originalChannel} · ${timestamp(state.originalScheduled)}`
                  : status === "Completed" || noSend || terminal
                    ? d.action
                    : `${followup?.name ?? d.action} · ${d.channel} · ${timestamp(d.scheduled)}`}
              </dd>
              {awaiting && (
                <p className="mt-1 text-muted-foreground">
                  Sent as planned unless the change is approved first.
                </p>
              )}
            </div>
          </dl>
          <div className="grid gap-4 border-y border-border py-3 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold">Originally Planned</h3>
              <p className="mt-2">{state.originalStep} · Payment reminder</p>
              <p className="mt-1 text-muted-foreground">
                {state.originalChannel} · {timestamp(state.originalScheduled)}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Recommended / Adapted Action</h3>
              <p className="mt-2">{d.action}</p>
              {!noSend && <p className="mt-1">{followup?.name ?? "Existing communication"}</p>}
              <p className="mt-1 text-muted-foreground">
                {noSend ? "No communication scheduled" : `${d.channel} · ${timestamp(d.scheduled)}`}
              </p>
              <div className="mt-2">
                <StatusPill
                  tone={awaiting ? "warning" : terminal ? "neutral" : "success"}
                >
                  {awaiting ? "Awaiting approval" : shownStatus}
                </StatusPill>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Decision Details</h3>
            <p className="mt-2 text-muted-foreground">
              {d.source} · {timestamp(d.at)}
              {d.confidence !== undefined && ` · ${d.confidence}% mock confidence`}
            </p>
            <p className="mt-2 font-medium">Customer Engagement Event · {d.trigger}</p>
            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              <div><dt className="inline text-muted-foreground">Follow-up · </dt><dd className="inline">{followup?.name ?? "—"}</dd></div>
              <div><dt className="inline text-muted-foreground">Occurrence · </dt><dd className="inline">{d.occurrence ? occurrenceLabel[d.occurrence] : "—"}</dd></div>
              <div><dt className="inline text-muted-foreground">Content Version · </dt><dd className="inline">{d.contentVersion ?? "Main / Default"}</dd></div>
              <div><dt className="inline text-muted-foreground">Replaces · </dt><dd className="inline">{d.replaces ?? state.originalStep}</dd></div>
              <div><dt className="inline text-muted-foreground">Channel · </dt><dd className="inline">{d.channel}</dd></div>
              <div><dt className="inline text-muted-foreground">Scheduled Execution · </dt><dd className="inline">{timestamp(d.scheduled)}</dd></div>
              <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Decision Source · </dt><dd className="inline">{d.source}</dd></div>
            </dl>
            {isExhausted(state.usage, d.followupId) && (
              <p className="mt-2 text-warning">
                Both First Time and Repeat content for {followup?.name} have been sent — reassess for the next eligible action.
              </p>
            )}
            <p className="mt-2 leading-relaxed text-muted-foreground">{d.explanation}</p>
            <p className="mt-2">
              {d.compliance === "Blocked — contact restriction" ? `Compliance · ${d.compliance}` : COMPLIANCE_AT_SEND}
            </p>
            <p className="mt-1 text-muted-foreground">
              {d.requiresApproval
                ? `AI decision · supervised client · ${awaiting && !actionable ? "You can't approve this one" : awaiting ? "Approve, modify or reject before the planned message is due" : shownStatus}`
                : "Chosen by a fixed rule · text approved with the workflow · applied automatically"}
            </p>
          </div>
          {!noSend && (
            <details>
              <summary className="cursor-pointer font-semibold text-primary">
                Preview proposed communication
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-muted-foreground">
                  Version the customer gets · <span className="font-medium text-foreground">{d.contentVersion ?? "Main / Default · English"}</span>
                </p>
                <p className="font-medium">{d.subject}</p>
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {d.body}
                </p>
                <p className="border-t border-border pt-2 text-muted-foreground">SMS · {d.sms}</p>
                <ExpectedSender accountId={account.id} clientId={account.clientId} channel={d.channel} />
                <dl className="grid gap-x-4 gap-y-1 border-t border-border pt-2 sm:grid-cols-2">
                  <div><dt className="inline text-muted-foreground">Email consent · </dt><dd className="inline">Given</dd></div>
                  <div><dt className="inline text-muted-foreground">SMS consent · </dt><dd className="inline">Given</dd></div>
                  <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Opt-out · </dt><dd className="inline">None on file</dd></div>
                </dl>
              </div>
            </details>
          )}
          {actionable && (
            <div className="flex flex-wrap gap-2">
              <Btn variant="primary" onClick={() => decide("Approved")}>
                Approve
              </Btn>
              {modifiable && (
                <Btn
                  onClick={() => {
                    setDraft({
                      action: d.channel !== state.originalChannel ? "Switch channel" : "Use a follow-up",
                      channel: d.channel,
                      scheduled: d.scheduled,
                      note: "",
                      content: followup && d.occurrence ? `${followup.name} · ${occurrenceLabel[d.occurrence]}` : (eligible[0]?.key ?? ""),
                    });
                    setEditing(true);
                  }}
                >
                  Modify
                </Btn>
              )}
              <Btn variant="danger" onClick={() => decide("Rejected")}>
                Reject
              </Btn>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <p className="min-w-0 flex-1 text-muted-foreground">Ask the AI to look at the latest activity again. The plan keeps running meanwhile.</p>
            <Btn
              disabled={
                !enabled ||
                inHumanReview ||
                status === "Completed" ||
                loading ||
                !can("Modify / Guide AI Recommendation", account.clientId)
              }
              onClick={async () => {
                setLoading(true);
                setNotice("");
                await new Promise((resolve) => setTimeout(resolve, 650));
                {
                  const result = "recommendation" as const;
                  updateAdaptiveCase(reassessAdaptiveCase(state, result, new Date().toISOString()));
                  setNotice(
                    state.supervised
                      ? "New AI decision ready for approval. The planned message still goes out if it isn't approved in time."
                      : "Plan reassessed and the change applied automatically.",
                  );
                }
                setLoading(false);
              }}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {loading ? "Reassessing…" : "Reassess Plan"}
            </Btn>
          </div>
          {notice && (
            <p
              role="status"
              className={notice.includes("unavailable") ? "text-destructive" : "text-primary"}
            >
              {notice}
            </p>
          )}
          <div>
            <h3 className="font-semibold">Adaptive Follow-up Usage</h3>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              First-time content is used for the initial occurrence. Repeat content provides a
              different approach for subsequent occurrences. Once both have been sent, further
              occurrences are handled through the existing workflow and AI reassessment.
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-1.5 pr-2 font-medium">Follow-up</th>
                    <th className="py-1.5 pr-2 font-medium">First Time</th>
                    <th className="py-1.5 font-medium">Repeat</th>
                  </tr>
                </thead>
                <tbody>
                  {followups.map((f) => (
                    <tr key={f.id} className="border-b border-border/60 align-top">
                      <td className="py-1.5 pr-2">
                        {f.name}
                        {isExhausted(state.usage, f.id) && (
                          <span className="ml-1.5"><StatusPill tone="neutral">Exhausted</StatusPill></span>
                        )}
                      </td>
                      {(["first", "repeat"] as Occurrence[]).map((o) => {
                        const st = usageStatus(state.usage, f, o);
                        const entry = state.usage?.[f.id]?.[o];
                        return (
                          <td key={o} className="py-1.5 pr-2">
                            <StatusPill tone={st === "Sent" ? "success" : st === "Scheduled" ? "warning" : st === "Not Written Yet" ? "warning" : "neutral"}>
                              {st}
                            </StatusPill>
                            {entry?.at && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {timestamp(entry.at)}{entry.replaced ? ` · Replaced ${entry.replaced}` : ""}
                              </p>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <details>
            <summary className="cursor-pointer font-semibold">
              Engagement & Decision History · {state.history.length} events
            </summary>
            <ol className="mt-3 space-y-4 border-l border-border pl-3">
              {[...state.history]
                .sort((a, b) => a.at.localeCompare(b.at))
                .map((event, index) => (
                  <li key={`${event.at}-${index}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{event.label}</p>
                      {event.status && (
                        <StatusPill tone={event.status === "Pending" ? "warning" : event.status === "Applied" || event.status === "Approved" || event.status === "Changed" ? "success" : event.status === "Failed" || event.status === "Rejected" ? "danger" : "neutral"}>
                          {event.status}
                        </StatusPill>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground">{timestamp(event.at)}</p>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{event.detail}</p>
                  </li>
                ))}
            </ol>
          </details>
        </div>
      </Panel>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modify adaptive decision</DialogTitle>
            <DialogDescription>
              Your change is applied right away. The AI's original suggestion stays in the history.
            </DialogDescription>
          </DialogHeader>
          <Field label="Action">
            <SelectInput
              value={draft.action}
              options={modifyActions}
              onChange={(action) => setDraft((v) => ({ ...v, action }))}
            />
          </Field>
          <Field label="Channel">
            <SelectInput
              value={draft.channel}
              options={["Email", "SMS"]}
              onChange={(channel) => setDraft((v) => ({ ...v, channel }))}
            />
          </Field>
          <Field label="Date and time (UTC)">
            <input
              aria-label="Proposed date / time"
              type="datetime-local"
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs"
              value={draft.scheduled}
              onChange={(e) => setDraft((v) => ({ ...v, scheduled: e.target.value }))}
            />
          </Field>
          <Field label="Follow-up (approved, not used yet)">
            <SelectInput
              value={draft.content}
              options={eligible.map((e) => e.key)}
              onChange={(content) => setDraft((v) => ({ ...v, content }))}
            />
          </Field>
          {(() => {
            const pick = eligible.find((e) => e.key === draft.content);
            const v = (pick?.o === "repeat" ? pick.f.repeat : pick?.f.config)?.communicationVersions?.find((x) => x.id === "default");
            return v ? (
              <div className="rounded-md border border-border p-3 text-xs">
                <p className="font-medium">{v.subject}</p>
                <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-muted-foreground">{v.emailBody}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No eligible unused content remains.</p>
            );
          })()}
          <Field label="Note">
            <TextArea
              value={draft.note}
              onChange={(note) => setDraft((v) => ({ ...v, note }))}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setEditing(false)}>Cancel</Btn>
            <Btn
              variant="primary"
              disabled={
                !actionable ||
                !modifiable ||
                (draft.action === "Use a follow-up" && !eligible.some((e) => e.key === draft.content)) ||
                !draft.scheduled ||
                Date.parse(draft.scheduled + "Z") <= Date.now()
              }
              onClick={() => {
                if (!actionable || !modifiable) return;
                const pick = eligible.find((e) => e.key === draft.content);
                const v = (pick?.o === "repeat" ? pick.f.repeat : pick?.f.config)?.communicationVersions?.find((x) => x.id === "default");
                updateAdaptiveCase(
                  resolveAdaptiveDecision(state, "Modified", userName, new Date().toISOString(), {
                    action: draft.action,
                    channel: draft.channel,
                    scheduled: draft.scheduled,
                    note: draft.note,
                    ...(pick && v
                      ? { followupId: pick.f.id, occurrence: pick.o, subject: v.subject, body: v.emailBody, sms: v.smsContent }
                      : {}),
                  }),
                );
                setEditing(false);
                setNotice("Change saved and applied. The AI's original suggestion is kept in the history.");
              }}
            >
              Save changes
            </Btn>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
