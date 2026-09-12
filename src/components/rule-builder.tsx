import { Plus, Trash2 } from "lucide-react";
import {
  Field,
  SelectInput,
  TextInput,
  TextArea,
  Btn,
  StatusPill,
  Panel,
} from "@/components/payflow-ui";
import {
  blankCondition,
  fieldByLabel,
  operatorsForField,
  ruleActions,
  ruleCategories,
  ruleFields,
  ruleReadableSummary,
  type RuleCondition,
  type RuleLogic,
  type RuleType,
} from "@/lib/rules-data";
import { cn } from "@/lib/utils";

export interface RuleDraft {
  name: string;
  description: string;
  type: RuleType;
  clientId: string | null;
  category: string;
  logic: RuleLogic;
  conditions: RuleCondition[];
  action: string;
}

export function emptyRuleDraft(overrides: Partial<RuleDraft> = {}): RuleDraft {
  return {
    name: "",
    description: "",
    type: "System Rule",
    clientId: null,
    category: "Amount",
    logic: "ALL",
    conditions: [blankCondition()],
    action: "Require Human Review",
    ...overrides,
  };
}

const fieldLabelsByCategory = (category: string) => {
  const inCategory = ruleFields.filter((f) => f.category === category).map((f) => f.label);
  const others = ruleFields.filter((f) => f.category !== category).map((f) => f.label);
  return [...inCategory, ...others];
};

export function ConditionBuilder({
  draft,
  patch,
  readOnly,
}: {
  draft: RuleDraft;
  patch: (p: Partial<RuleDraft>) => void;
  readOnly?: boolean;
}) {
  const setCondition = (id: string, next: Partial<RuleCondition>) =>
    patch({
      conditions: draft.conditions.map((c) => (c.id === id ? { ...c, ...next } : c)),
    });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-eyebrow">When</span>
        <div className="flex rounded-md border border-border bg-card p-0.5">
          {(["ALL", "ANY"] as const).map((logic) => (
            <button
              key={logic}
              type="button"
              disabled={readOnly}
              onClick={() => patch({ logic })}
              className={cn(
                "rounded-[5px] px-2.5 py-1 text-[12px] font-medium transition-colors",
                draft.logic === logic
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {logic === "ALL" ? "All conditions" : "Any condition"}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {draft.logic === "ALL"
            ? "Every condition must be met."
            : "Any single condition is enough."}
        </span>
      </div>

      <div className="space-y-2">
        {draft.conditions.map((condition, index) => {
          const field = fieldByLabel(condition.field);
          const operators = operatorsForField(condition.field);
          return (
            <div key={condition.id}>
              {index > 0 && (
                <p className="mb-2 pl-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
                  {draft.logic === "ALL" ? "AND" : "OR"}
                </p>
              )}
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface p-3">
                <Field label="Field" className="min-w-[200px] flex-1">
                  <SelectInput
                    value={condition.field}
                    disabled={readOnly}
                    options={fieldLabelsByCategory(draft.category)}
                    onChange={(value) =>
                      setCondition(condition.id, {
                        field: value,
                        operator: operatorsForField(value)[0] ?? "Equals",
                        value: "",
                      })
                    }
                  />
                </Field>
                <Field label="Operator" className="min-w-[170px] flex-1">
                  <SelectInput
                    value={condition.operator}
                    disabled={readOnly}
                    options={operators}
                    onChange={(value) => setCondition(condition.id, { operator: value })}
                  />
                </Field>
                <Field
                  label="Value"
                  className="min-w-[150px] flex-1"
                  hint={
                    field?.type === "currency"
                      ? "Amount in USD"
                      : field?.type === "percent"
                        ? "Percentage"
                        : undefined
                  }
                >
                  {field?.type === "enum" ? (
                    <SelectInput
                      value={condition.value || (field.options?.[0] ?? "")}
                      disabled={readOnly}
                      options={field.options ?? []}
                      onChange={(value) => setCondition(condition.id, { value })}
                    />
                  ) : (
                    <TextInput
                      value={condition.value}
                      disabled={readOnly}
                      placeholder={field?.type === "text" ? "Enter text" : "0"}
                      onChange={(value) => setCondition(condition.id, { value })}
                    />
                  )}
                </Field>
                {!readOnly && draft.conditions.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      patch({ conditions: draft.conditions.filter((c) => c.id !== condition.id) })
                    }
                    className="mb-0.5 flex h-9 items-center rounded-md px-2 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Remove condition"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <Btn
          className="mt-3"
          onClick={() => patch({ conditions: [...draft.conditions, blankCondition()] })}
        >
          <Plus className="size-3.5" /> Add Condition
        </Btn>
      )}

      <div className="mt-5">
        <span className="text-eyebrow">Then</span>
        <div className="mt-2 max-w-sm">
          <SelectInput
            value={draft.action}
            disabled={readOnly}
            options={[...ruleActions]}
            onChange={(action) => patch({ action })}
          />
        </div>
      </div>
    </div>
  );
}

export function RuleBasics({
  draft,
  patch,
  clientOptions,
  readOnly,
}: {
  draft: RuleDraft;
  patch: (p: Partial<RuleDraft>) => void;
  clientOptions: { id: string; name: string }[];
  readOnly?: boolean;
}) {
  const selectedClient = clientOptions.find((c) => c.id === draft.clientId);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Rule Name" className="sm:col-span-2">
        <TextInput
          value={draft.name}
          disabled={readOnly}
          onChange={(name) => patch({ name })}
          placeholder="High Balance Review"
        />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <TextArea
          value={draft.description}
          disabled={readOnly}
          onChange={(description) => patch({ description })}
          placeholder="Explain when this rule should apply and why."
        />
      </Field>
      <Field label="Rule Type" hint="System rules are reusable across clients.">
        <SelectInput
          value={draft.type}
          disabled={readOnly}
          options={["System Rule", "Client Rule"]}
          onChange={(value) =>
            patch({
              type: value as RuleType,
              clientId: value === "Client Rule" ? (clientOptions[0]?.id ?? null) : null,
            })
          }
        />
      </Field>
      <Field label="Category">
        <SelectInput
          value={draft.category}
          disabled={readOnly}
          options={[...ruleCategories]}
          onChange={(category) => patch({ category })}
        />
      </Field>
      {draft.type === "Client Rule" && (
        <Field label="Client" hint="This rule only affects the selected client.">
          <SelectInput
            value={selectedClient?.name ?? ""}
            disabled={readOnly}
            options={clientOptions.map((c) => c.name)}
            onChange={(name) =>
              patch({ clientId: clientOptions.find((c) => c.name === name)?.id ?? null })
            }
          />
        </Field>
      )}
      <Field label="Scope">
        <div className="flex h-9 items-center">
          <StatusPill tone={draft.type === "System Rule" ? "info" : "neutral"}>
            {draft.type === "System Rule"
              ? "System / Available Globally"
              : `Client: ${selectedClient?.name ?? "Not selected"}`}
          </StatusPill>
        </div>
      </Field>
    </div>
  );
}

export function RuleSummaryCard({ draft }: { draft: RuleDraft }) {
  const { lines, action } = ruleReadableSummary(draft);
  return (
    <Panel title="Rule Summary" description="Human-readable view of the structured configuration">
      <div className="rounded-lg border border-border bg-surface px-4 py-3.5 text-[13px] leading-relaxed">
        <p className="text-eyebrow mb-1">If</p>
        {lines.length === 0 ? (
          <p className="text-muted-foreground">No conditions configured yet.</p>
        ) : (
          lines.map((line, i) => (
            <p
              key={`${line}-${i}`}
              className={
                line === "AND" || line === "OR"
                  ? "py-0.5 text-[11px] font-semibold text-muted-foreground"
                  : "text-foreground"
              }
            >
              {line}
            </p>
          ))
        )}
        <p className="text-eyebrow mt-3 mb-1">Then</p>
        <p className="font-medium text-foreground">{action}</p>
      </div>
    </Panel>
  );
}
