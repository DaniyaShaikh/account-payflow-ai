import { useState } from "react";
import { Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { Panel, Btn, StatusPill } from "./payflow-ui";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { StepConfigForm } from "./strategy-step-editor";
import { followupNode, occurrenceLabel, type Occurrence } from "@/lib/adaptive-workflow-data";
import { useStrategies } from "@/lib/strategy-context";
import type { Strategy } from "@/lib/strategy-data";

export function AdaptiveFollowups({ strategy, canEdit }: { strategy: Strategy; canEdit: boolean }) {
  const { setAdaptiveEnabled, updateFollowup, writeFollowupMessages } = useStrategies();
  const [selected, setSelected] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [occurrence, setOccurrence] = useState<Occurrence>("first");
  const found = strategy.adaptiveFollowups?.find((f) => f.id === selected);
  // Present the selected communication set through the shared follow-up shape.
  const followup = found && {
    ...found,
    config: occurrence === "repeat" ? (found.repeat ?? { communicationVersions: [] }) : found.config,
  };
  // A follow-up only ever takes a reminder's place; with no reminder there is nothing to replace.
  const hasReminder = Object.values(strategy.nodes).some((n) => n.kind === "Communication");
  const followups = hasReminder ? (strategy.adaptiveFollowups ?? []) : [];
  const close = () => {
    if (
      dirty &&
      !window.confirm("Discard unsaved message changes? Saved versions will not change.")
    )
      return;
    if (followup?.config.communicationVersions?.some((v) => v.hasUnsavedChanges))
      updateFollowup(strategy.id, followup.id, {
        communicationVersions: followup.config.communicationVersions.map((v) => ({
          ...v,
          hasUnsavedChanges: false,
        })),
      }, occurrence);
    setSelected(null);
    setOccurrence("first");
    setDirty(false);
  };
  return (
    <Panel
      title="Adaptive Workflow"
      className="mt-4"
      action={
        <Switch
          aria-label="Adaptive Workflow"
          checked={strategy.adaptiveEnabled ?? false}
          disabled={!canEdit}
          onCheckedChange={(enabled) => setAdaptiveEnabled(strategy.id, enabled)}
        />
      }
    >
      <p className="text-xs text-muted-foreground">
        Automatically reassess subsequent workflow actions based on customer engagement and payment
        activity.
      </p>
      {!strategy.adaptiveEnabled ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Disabled · The original fixed-sequence workflow remains unchanged.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Adaptive Follow-ups
              <span className="ml-2 font-normal text-muted-foreground">
                {followups.length} Follow-up Types · {followups.length * 2} Communication Sets
              </span>
            </h3>
            <StatusPill tone="ai">Simulated</StatusPill>
          </div>
          <div className="mt-2 divide-y divide-border">
            {followups.map((f) => {
              const sets = [
                { o: "first" as const, n: f.config.communicationVersions?.length ?? 0 },
                { o: "repeat" as const, n: f.repeat?.communicationVersions?.length ?? 0 },
              ];
              return (
                <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">{f.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Sent When · {f.trigger}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Waiting period · {f.waiting ?? "Pending configuration"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {sets.map(({ o, n }) => (
                      <StatusPill key={o} tone={n ? "neutral" : "warning"}>
                        {occurrenceLabel[o]} · {n ? "Written" : "Not written yet"}
                      </StatusPill>
                    ))}
                    <Btn variant="ghost" onClick={() => setSelected(f.id)}>
                      View / Edit
                      <ChevronRight className="size-3.5" />
                    </Btn>
                  </div>
                </div>
              );
            })}
            {!followups.length && (
              <p className="py-3 text-xs text-muted-foreground">
                No follow-ups: nothing for them to replace.
              </p>
            )}
            {followups.length > 0 && (
              <p className="pt-3 text-[11px] text-muted-foreground">
                A follow-up without text is never sent.
              </p>
            )}
          </div>
        </>
      )}
      <Dialog
        open={!!followup}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[580px]">
          {followup && (
            <>
              <DialogHeader>
                <DialogTitle>{followup.name}</DialogTitle>
                <DialogDescription>
                  Adaptive Follow-up · Finalized with overall workflow approval.
                </DialogDescription>
              </DialogHeader>
              <div className="border-b border-border pb-3">
                <p className="text-xs font-semibold">Sent When / Trigger</p>
                <p className="mt-1 text-xs text-muted-foreground">{followup.trigger}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Waiting period · {followup.waiting ?? "Pending configuration"}
                </p>
              </div>
              <div
                role="tablist"
                aria-label="Occurrence"
                className="inline-flex w-fit rounded-md border border-border bg-muted/40 p-0.5"
              >
                {(["first", "repeat"] as const).map((o) => (
                  <button
                    key={o}
                    role="tab"
                    aria-selected={occurrence === o}
                    className={`rounded px-3 py-1 text-xs font-medium ${occurrence === o ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                    onClick={() => {
                      if (o === occurrence) return;
                      if (dirty && !window.confirm("Discard unsaved changes in this set?")) return;
                      setDirty(false);
                      setOccurrence(o);
                    }}
                  >
                    {occurrenceLabel[o]}
                  </button>
                ))}
              </div>
              <p className="-mt-1 text-[11px] text-muted-foreground">
                {occurrence === "first"
                  ? "Used for the initial occurrence of this follow-up."
                  : "Used for subsequent occurrences — a different, more supportive approach."}
              </p>
              {!followup.config.communicationVersions?.length ? (
                <div className="space-y-3">
                  <StatusPill tone="warning">Not written yet · won't be sent</StatusPill>
                  <div>
                    <Btn
                      variant="primary"
                      disabled={!canEdit || writing}
                      onClick={async () => {
                        setWriting(true);
                        await new Promise((resolve) => setTimeout(resolve, 500));
                        writeFollowupMessages(strategy.id, followup.id, occurrence);
                        setWriting(false);
                      }}
                    >
                      {writing ? (
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      {writing ? "Writing…" : "Write Messages"}
                    </Btn>
                  </div>
                </div>
              ) : (
                <StepConfigForm
                  key={`${followup.id}-${occurrence}`}
                  strategy={strategy}
                  node={followupNode(followup)}
                  adaptive
                  canEdit={canEdit}
                  onChange={(patch) => updateFollowup(strategy.id, followup.id, patch, occurrence)}
                  onToggleDisabled={() => {}}
                  onAddAfter={() => {}}
                  onDirtyChange={setDirty}
                />
              )}
              <div className="flex justify-end">
                <Btn onClick={close}>Done</Btn>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
