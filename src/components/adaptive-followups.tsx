import { useState } from "react";
import { Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { Panel, Btn, StatusPill } from "./payflow-ui";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { StepConfigForm } from "./strategy-step-editor";
import { followupNode } from "@/lib/adaptive-workflow-data";
import { useStrategies } from "@/lib/strategy-context";
import type { Strategy } from "@/lib/strategy-data";

export function AdaptiveFollowups({ strategy, canEdit }: { strategy: Strategy; canEdit: boolean }) {
  const { setAdaptiveEnabled, updateFollowup, writeFollowupMessages } = useStrategies();
  const [selected, setSelected] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const followup = strategy.adaptiveFollowups?.find((f) => f.id === selected);
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
      });
    setSelected(null);
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
            <h3 className="text-sm font-semibold">Adaptive Follow-ups</h3>
            <StatusPill tone="ai">Simulated</StatusPill>
          </div>
          <div className="mt-2 divide-y divide-border">
            {(strategy.adaptiveFollowups ?? []).map((f) => {
              const versions = f.config.communicationVersions ?? [];
              const written = versions.length > 0;
              const final =
                written && versions.every((v) => v.status === "Final" && !v.hasUnsavedChanges);
              return (
                <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">{f.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Sent When · {f.trigger}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={written ? "neutral" : "warning"}>
                      {written ? `${versions.length} content versions` : "Not Written Yet"}
                    </StatusPill>
                    <StatusPill tone={final ? "success" : "warning"}>
                      {final ? "Approved with workflow" : "Awaiting workflow approval"}
                    </StatusPill>
                    <Btn variant="ghost" onClick={() => setSelected(f.id)}>
                      Details
                      <ChevronRight className="size-3.5" />
                    </Btn>
                  </div>
                </div>
              );
            })}
            {!strategy.adaptiveFollowups?.length && (
              <p className="py-3 text-xs text-muted-foreground">
                No follow-ups available for this workflow.
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
              </div>
              {!followup.config.communicationVersions?.length ? (
                <div className="space-y-3">
                  <StatusPill tone="warning">Not Written Yet</StatusPill>
                  <div>
                    <Btn
                      variant="primary"
                      disabled={!canEdit || writing}
                      onClick={async () => {
                        setWriting(true);
                        await new Promise((resolve) => setTimeout(resolve, 500));
                        writeFollowupMessages(strategy.id, followup.id);
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
                  key={followup.id}
                  strategy={strategy}
                  node={followupNode(followup)}
                  adaptive
                  canEdit={canEdit}
                  onChange={(patch) => updateFollowup(strategy.id, followup.id, patch)}
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
