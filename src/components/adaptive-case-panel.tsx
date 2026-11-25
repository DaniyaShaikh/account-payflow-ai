import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Panel, Btn, Field, SelectInput, StatusPill, TextInput, TextArea } from "./payflow-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { CommunicationCompliance } from "./communication-compliance";
import { ExpectedSender } from "./sender-management";
import { useStrategies } from "@/lib/strategy-context";
import { useRole } from "@/lib/role-context";
import {
  adaptiveActions,
  canReviewDecision,
  resolveAdaptiveDecision,
  reassessAdaptiveCase,
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
  const [outcome, setOutcome] = useState("Updated recommendation");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    action: "",
    channel: "Email",
    scheduled: "",
    subject: "",
    body: "",
    sms: "",
  });
  const state = adaptiveCases.find((c) => c.accountId === account.id);
  if (!state) return null;
  const strategy = strategyById(state.strategyId);
  const enabled = strategy?.adaptiveEnabled ?? false;
  const d = state.decision;
  const authorized = can("Approve Human Reviews", account.clientId);
  const modifiable = can("Modify / Guide AI Recommendation", account.clientId);
  const actionable =
    enabled &&
    state.status !== "Completed" &&
    canReviewDecision(d, authorized, new Date().toISOString());
  const followup = strategy?.adaptiveFollowups?.find((f) => f.id === d.followupId);
  const terminal = ["Rejected", "Cancelled", "Superseded", "Expired", "Blocked"].includes(d.status);
  const noSend = [
    "Wait for further activity",
    "Pause workflow",
    "Cancel scheduled communication",
    "Stop workflow",
    "Route for Operations review",
  ].includes(d.action);
  const status = !enabled ? "Disabled" : state.status;
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
        description="Mock engagement and decision snapshot"
        action={
          <StatusPill
            tone={
              status === "Requires Review" ? "warning" : status === "Active" ? "success" : "neutral"
            }
          >
            {status}
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
                {!enabled || d.status === "Rejected"
                  ? `${state.originalStep} · ${state.originalChannel} · ${timestamp(state.originalScheduled)}`
                  : status === "Completed" || noSend || terminal
                    ? d.action
                    : d.status === "Pending"
                      ? "On hold — awaiting decision"
                      : `${followup?.name ?? d.action} · ${d.channel} · ${timestamp(d.scheduled)}`}
              </dd>
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
                  tone={d.status === "Pending" ? "warning" : terminal ? "neutral" : "success"}
                >
                  {d.status}
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
            <p className="mt-2 font-medium">Trigger · {d.trigger}</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">{d.explanation}</p>
            <p className="mt-2">Compliance · {d.compliance}</p>
            <p className="mt-1 text-muted-foreground">
              {d.requiresApproval
                ? `Human approval required · ${d.status === "Pending" && !actionable ? "Unavailable for this user or expired decision" : d.status}`
                : "Uses already-approved workflow content; no additional approval required"}
            </p>
          </div>
          {!noSend && (
            <details>
              <summary className="cursor-pointer font-semibold text-primary">
                Preview proposed communication
              </summary>
              <div className="mt-3 space-y-2">
                <p className="font-medium">{d.subject}</p>
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {d.body}
                </p>
                <p className="border-t border-border pt-2 text-muted-foreground">SMS · {d.sms}</p>
                <ExpectedSender accountId={account.id} clientId={account.clientId} channel={d.channel} />
                <CommunicationCompliance
                  clientId={account.clientId}
                  channel={d.channel}
                  templateText={d.channel === "SMS" ? d.sms : `${d.subject}\n${d.body}`}
                />
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
                      action: d.action,
                      channel: d.channel,
                      scheduled: d.scheduled,
                      subject: d.subject,
                      body: d.body,
                      sms: d.sms,
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
            <div className="min-w-0 flex-1">
              <Field label="Mock reassessment outcome">
                <SelectInput
                  value={outcome}
                  options={[
                    "Updated recommendation",
                    "No change required",
                    "Contact restriction",
                    "Full payment confirmed",
                    "Unavailable / error",
                  ]}
                  disabled={!enabled || status === "Completed" || loading}
                  onChange={setOutcome}
                />
              </Field>
            </div>
            <Btn
              disabled={
                !enabled ||
                status === "Completed" ||
                loading ||
                !can("Modify / Guide AI Recommendation", account.clientId)
              }
              onClick={async () => {
                setLoading(true);
                setNotice("");
                await new Promise((resolve) => setTimeout(resolve, 650));
                if (outcome === "Unavailable / error")
                  setNotice(
                    "Reassessment unavailable. The current plan has not changed. Try again.",
                  );
                else {
                  const result =
                    outcome === "No change required"
                      ? "no-change"
                      : outcome === "Contact restriction"
                        ? "blocked"
                        : outcome === "Full payment confirmed"
                          ? "completed"
                          : "recommendation";
                  updateAdaptiveCase(reassessAdaptiveCase(state, result, new Date().toISOString()));
                  setNotice(
                    result === "no-change"
                      ? "No change required. The current plan remains appropriate."
                      : result === "completed"
                        ? "Full payment confirmed in this simulation. Collection reminders stopped."
                        : result === "blocked"
                          ? "Contact restricted. Communication blocked and routed for Operations review."
                          : "Updated recommendation awaits human approval. The previous decision is superseded.",
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
                        <StatusPill tone={event.status === "Pending" ? "warning" : "neutral"}>
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
              Changes remain pending until approved. Mandatory protections still apply.
            </DialogDescription>
          </DialogHeader>
          <Field label="Proposed action">
            <SelectInput
              value={draft.action}
              options={adaptiveActions}
              onChange={(action) => setDraft((v) => ({ ...v, action }))}
            />
          </Field>
          <Field label="Eligible channel">
            <SelectInput
              value={draft.channel}
              options={["Email", "SMS"]}
              onChange={(channel) => setDraft((v) => ({ ...v, channel }))}
            />
          </Field>
          <Field label="Proposed date / time (UTC)">
            <input
              aria-label="Proposed date / time"
              type="datetime-local"
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs"
              value={draft.scheduled}
              onChange={(e) => setDraft((v) => ({ ...v, scheduled: e.target.value }))}
            />
          </Field>
          <Field label="Email subject">
            <TextInput
              value={draft.subject}
              onChange={(subject) => setDraft((v) => ({ ...v, subject }))}
            />
          </Field>
          <Field label="Email body">
            <TextArea value={draft.body} onChange={(body) => setDraft((v) => ({ ...v, body }))} />
          </Field>
          <Field label="SMS content">
            <TextArea value={draft.sms} onChange={(sms) => setDraft((v) => ({ ...v, sms }))} />
          </Field>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setEditing(false)}>Cancel</Btn>
            <Btn
              variant="primary"
              disabled={
                !actionable ||
                !modifiable ||
                !draft.body.trim() ||
                !draft.subject.trim() ||
                !draft.sms.trim() ||
                !draft.scheduled ||
                Date.parse(draft.scheduled + "Z") <= Date.now()
              }
              onClick={() => {
                if (!actionable || !modifiable) return;
                updateAdaptiveCase(
                  resolveAdaptiveDecision(
                    state,
                    "Modified",
                    userName,
                    new Date().toISOString(),
                    draft,
                  ),
                );
                setEditing(false);
                setNotice("Modified decision saved. Approval is still required.");
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
