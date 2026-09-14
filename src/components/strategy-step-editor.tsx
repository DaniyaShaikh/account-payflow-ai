import { useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Btn, Field, SelectInput, StatusPill, TextArea, TextInput } from "@/components/payflow-ui";
import {
  caseActions,
  channels,
  conditionAttributes,
  conditionOperators,
  conditionValues,
  messagePurposes,
  outcomes,
  paymentActions,
  referenceEvents,
  templateForNode,
  templatesFor,
  timeDirections,
  timeUnits,
  type NodeConfig,
  type Strategy,
  type StrategyNode,
  type StrategyNodeKind,
} from "@/lib/strategy-data";

const addableKinds: StrategyNodeKind[] = ["Communication", "Wait", "AI Reassessment", "Case Action"];

export function TemplatePreview({ node }: { node: StrategyNode }) {
  const template = templateForNode(node);
  if (!template) return null;
  const isSms = template.channel === "SMS";
  return (
    <div className="rounded-lg border border-border/70 bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          {isSms ? <MessageSquare className="size-3.5" /> : <Mail className="size-3.5" />}
        </span>
        <p className="text-[12.5px] font-semibold text-foreground">{template.name}</p>
      </div>
      {template.subject && (
        <p className="mt-2 text-[12px] text-foreground">
          <span className="text-muted-foreground">Subject: </span>
          {template.subject}
        </p>
      )}
      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-muted-foreground">
        {template.body}
      </pre>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Values in double braces are filled per customer at send time.
      </p>
    </div>
  );
}

export function StepConfigForm({
  strategy,
  node,
  canEdit = true,
  onChange,
  onToggleDisabled,
  onAddAfter,
}: {
  strategy: Strategy;
  node: StrategyNode;
  canEdit?: boolean;
  onChange: (patch: NodeConfig) => void;
  onToggleDisabled: () => void;
  onAddAfter: (kind: StrategyNodeKind) => void;
}) {
  const [addKind, setAddKind] = useState<StrategyNodeKind>("Communication");
  const templates = templatesFor(node.config.channel, node.config.purpose);
  const activeTemplate = templateForNode(node);

  return (
    <div className="space-y-3">
      {node.kind === "Communication" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Channel">
              <SelectInput
                value={node.config.channel ?? "Email"}
                options={channels}
                disabled={!canEdit}
                onChange={(v) => onChange({ channel: v, templateId: undefined })}
              />
            </Field>
            <Field label="Message Purpose">
              <SelectInput
                value={node.config.purpose ?? messagePurposes[0]!}
                options={messagePurposes}
                disabled={!canEdit}
                onChange={(v) => onChange({ purpose: v, templateId: undefined })}
              />
            </Field>
          </div>
          <Field label="Template" hint="What the customer receives at this step.">
            <SelectInput
              value={activeTemplate?.name ?? templates[0]?.name ?? ""
              }
              options={templates.map((t) => t.name)}
              disabled={!canEdit}
              onChange={(name) => {
                const match = templates.find((t) => t.name === name);
                if (match) onChange({ templateId: match.id });
              }}
            />
          </Field>
          <TemplatePreview node={node} />
        </>
      )}

      {node.kind === "Payment Action" && (
        <Field label="Payment Action">
          <SelectInput
            value={node.config.action ?? paymentActions[0]!}
            options={paymentActions}
            disabled={!canEdit}
            onChange={(v) => onChange({ action: v })}
          />
        </Field>
      )}

      {node.kind === "Case Action" && (
        <Field label="Case Action">
          <SelectInput
            value={node.config.action ?? caseActions[0]!}
            options={caseActions}
            disabled={!canEdit}
            onChange={(v) => onChange({ action: v })}
          />
        </Field>
      )}

      {node.kind === "Outcome" && (
        <Field label="Outcome">
          <SelectInput
            value={node.config.outcome ?? outcomes[0]!}
            options={outcomes}
            disabled={!canEdit}
            onChange={(v) => onChange({ outcome: v })}
          />
        </Field>
      )}

      {node.kind === "Human Review" && (
        <Field label="Review Note" hint="Shown to the supervisor who picks up the review.">
          <TextArea value={node.config.note ?? ""} disabled={!canEdit} onChange={(v) => onChange({ note: v })} />
        </Field>
      )}

      {node.kind === "Condition" && (
        <>
          <Field label="Condition">
            <SelectInput
              value={node.config.attribute ?? conditionAttributes[0]!}
              options={conditionAttributes}
              disabled={!canEdit}
              onChange={(v) => onChange({ attribute: v, value: conditionValues[v]?.[0] ?? "" })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Operator">
              <SelectInput
                value={node.config.operator ?? "Equals"}
                options={conditionOperators}
                disabled={!canEdit}
                onChange={(v) => onChange({ operator: v })}
              />
            </Field>
            <Field label="Value">
              <SelectInput
                value={node.config.value ?? ""}
                options={conditionValues[node.config.attribute ?? ""] ?? ["Unpaid"]}
                disabled={!canEdit}
                onChange={(v) => onChange({ value: v })}
              />
            </Field>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface px-3 py-2.5 text-[12px]">
            <p className="text-muted-foreground">
              <span className="font-semibold text-success">YES path</span> →{" "}
              {node.yes ? strategy.nodes[node.yes]?.title : "End of strategy"}
            </p>
            <p className="mt-1 text-muted-foreground">
              <span className="font-semibold text-destructive">NO path</span> →{" "}
              {node.no ? strategy.nodes[node.no]?.title : "End of strategy"}
            </p>
          </div>
        </>
      )}

      {node.config.referenceEvent && (
        <>
          <Field label="Timing Reference">
            <SelectInput
              value={node.config.referenceEvent}
              options={referenceEvents}
              disabled={!canEdit}
              onChange={(v) => onChange({ referenceEvent: v })}
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Number">
              <TextInput
                value={String(node.config.amount ?? 0)}
                disabled={!canEdit}
                onChange={(v) => onChange({ amount: Math.max(0, Number(v.replace(/\D/g, "")) || 0) })}
              />
            </Field>
            <Field label="Unit">
              <SelectInput
                value={node.config.unit ?? "Days"}
                options={timeUnits}
                disabled={!canEdit}
                onChange={(v) => onChange({ unit: v })}
              />
            </Field>
            <Field label="Before / After">
              <SelectInput
                value={node.config.direction ?? "After"}
                options={timeDirections}
                disabled={!canEdit}
                onChange={(v) => onChange({ direction: v })}
              />
            </Field>
          </div>
          <p className="text-[11.5px] text-muted-foreground">
            {node.config.amount
              ? `Runs ${node.config.amount} ${(node.config.unit ?? "Days").toLowerCase()} ${(node.config.direction ?? "After").toLowerCase()} ${node.config.referenceEvent}.`
              : `Runs immediately when ${node.config.referenceEvent.toLowerCase()} occurs.`}
          </p>
        </>
      )}

      {canEdit && node.kind !== "Trigger" && (
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          <Btn onClick={onToggleDisabled}>{node.disabled ? "Enable step" : "Disable step"}</Btn>
        </div>
      )}

      {canEdit && node.kind !== "Condition" && (
        <div className="border-t border-border/60 pt-3">
          <Field label="Add a step after this one">
            <SelectInput
              value={addKind}
              options={addableKinds}
              onChange={(v) => setAddKind(v as StrategyNodeKind)}
            />
          </Field>
          <Btn className="mt-2" onClick={() => onAddAfter(addKind)}>
            Add step
          </Btn>
        </div>
      )}
    </div>
  );
}

export function StepEditorDialog({
  strategy,
  node,
  open,
  canEdit = true,
  onOpenChange,
  onChange,
  onToggleDisabled,
  onAddAfter,
}: {
  strategy: Strategy;
  node: StrategyNode | undefined;
  open: boolean;
  canEdit?: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: NodeConfig) => void;
  onToggleDisabled: () => void;
  onAddAfter: (kind: StrategyNodeKind) => void;
}) {
  return (
    <Dialog open={open && !!node} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[540px]">
        {node && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[15px]">
                {node.title}
                <StatusPill tone={node.origin === "AI Proposed" ? "ai" : "info"}>
                  {node.origin}
                </StatusPill>
              </DialogTitle>
              <DialogDescription className="text-[12px]">
                {node.kind} step — adjust the details below. Changes are recorded as human
                modifications.
              </DialogDescription>
            </DialogHeader>
            <StepConfigForm
              strategy={strategy}
              node={node}
              canEdit={canEdit}
              onChange={onChange}
              onToggleDisabled={onToggleDisabled}
              onAddAfter={onAddAfter}
            />
            <div className="flex justify-end pt-1">
              <Btn variant="primary" onClick={() => onOpenChange(false)}>
                Done
              </Btn>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
