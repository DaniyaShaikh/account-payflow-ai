import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, GripVertical, Trash2, Plus } from "lucide-react";
import {
  PageHeader,
  Panel,
  Btn,
  Field,
  SelectInput,
  TextInput,
  TextArea,
  StatusPill,
} from "@/components/payflow-ui";
import { StrategyCanvas } from "@/components/strategy-canvas";
import { useRole } from "@/lib/role-context";
import { useStrategies } from "@/lib/strategy-context";
import { clientName } from "@/lib/payflow-data";
import {
  aiSuggestions,
  ageBands,
  balanceBands,
  channels,
  defaultSegment,
  delinquencyBands,
  excludedTargetingAttributes,
  languagePreferences,
  messagePurposes,
  postalRegions,
  tenureBands,
  timeUnits,
  type Strategy,
  type StrategyNode,
  type StrategyNodeKind,
  type StrategySegment,
} from "@/lib/strategy-data";

export const Route = createFileRoute("/strategies/new")({
  head: () => ({
    meta: [
      { title: "Create a workflow — PayFlow" },
      {
        name: "description",
        content:
          "Build a collection workflow step by step with drag and drop, or describe your goal and let PayFlow AI suggest the steps, channels, templates and timing.",
      },
      { property: "og:title", content: "Create a workflow — PayFlow" },
      {
        property: "og:description",
        content: "Drag-and-drop workflow builder with PayFlow AI suggestions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreateStrategyPage,
});

type Step = {
  id: string;
  kind: StrategyNodeKind;
  channel?: string;
  purpose?: string;
  amount: number;
  unit: string;
};

const addableKinds: StrategyNodeKind[] = [
  "Communication",
  "Wait",
  "Condition",
  "AI Reassessment",
  "Case Action",
  "Human Review",
];

let seq = 0;
const uid = () => `s${(seq += 1)}-${Date.now().toString(36)}`;

function makeStep(kind: StrategyNodeKind): Step {
  if (kind === "Communication") {
    return {
      id: uid(),
      kind,
      channel: "Email",
      purpose: messagePurposes[0] ?? "Payment Reminder",
      amount: 0,
      unit: "Days",
    };
  }
  return { id: uid(), kind, amount: kind === "Wait" ? 3 : 0, unit: "Days" };
}

function stepTitle(step: Step) {
  switch (step.kind) {
    case "Communication":
      return `Send ${step.channel} — ${step.purpose}`;
    case "Wait":
      return "Wait / observe";
    case "Condition":
      return "Payment received?";
    case "AI Reassessment":
      return "AI reassessment";
    case "Case Action":
      return "Case action";
    case "Human Review":
      return "Human review";
    default:
      return step.kind;
  }
}

/** Turn the ordered step list into a linked node graph, with YES/NO paths for conditions. */
function buildNodes(steps: Step[]): Record<string, StrategyNode> {
  const nodes: Record<string, StrategyNode> = {
    t1: {
      id: "t1",
      kind: "Trigger",
      title: "Case enters this workflow",
      origin: "Human Modified",
      config: { referenceEvent: "Case Received", amount: 0, unit: "Days", direction: "After" },
      next: steps[0]?.id ?? null,
    },
  };

  steps.forEach((step, i) => {
    const nextId = steps[i + 1]?.id ?? null;
    if (step.kind === "Condition") {
      const outcomeId = `${step.id}-paid`;
      nodes[outcomeId] = {
        id: outcomeId,
        kind: "Outcome",
        title: "Case closed — paid",
        origin: "Human Modified",
        config: { outcome: "Paid In Full" },
        next: null,
      };
      nodes[step.id] = {
        id: step.id,
        kind: "Condition",
        title: stepTitle(step),
        origin: "Human Modified",
        config: { attribute: "Payment Status", operator: "Equals", value: "Paid In Full" },
        next: null,
        yes: outcomeId,
        no: nextId,
      };
      return;
    }
    nodes[step.id] = {
      id: step.id,
      kind: step.kind,
      title: stepTitle(step),
      origin: "Human Modified",
      config:
        step.kind === "Communication"
          ? {
              channel: step.channel ?? "Email",
              purpose: step.purpose ?? messagePurposes[0]!,
              referenceEvent: "Previous Action",
              amount: step.amount,
              unit: step.unit,
              direction: "After",
            }
          : {
              referenceEvent: "Previous Action",
              amount: step.amount,
              unit: step.unit,
              direction: "After",
            },
      next: nextId,
    };
  });

  return nodes;
}

/** Deterministic prototype "AI": reads the prompt plus the selected accounts. */
function suggestFromPrompt(prompt: string, segment: StrategySegment): Step[] {
  const p = prompt.toLowerCase();
  const gentle = /gentle|soft|early|gradual|gradually|remind/.test(p);
  const urgent = /urgent|fast|aggressive|escalat|final|late|overdue/.test(p);
  const smsFirst = /sms|text|mobile/.test(p);
  const wantsPlan = /plan|installment|instalment|arrangement|afford/.test(p);
  const wantsReview = /review|supervisor|approval|sensitive/.test(p);

  const first = makeStep("Communication");
  first.channel = smsFirst ? "SMS" : "Email";
  first.purpose = messagePurposes[0] ?? "Payment Reminder";
  first.amount = urgent ? 0 : 1;

  const wait = makeStep("Wait");
  wait.amount = urgent ? 2 : gentle ? 5 : 3;

  const check = makeStep("Condition");

  const second = makeStep("Communication");
  second.channel = smsFirst ? "Email" : "SMS";
  second.purpose = wantsPlan
    ? (messagePurposes.find((m) => /plan|arrangement/i.test(m)) ?? messagePurposes[0]!)
    : (messagePurposes[1] ?? messagePurposes[0]!);
  second.amount = urgent ? 1 : 3;

  const steps: Step[] = [first, wait, check, second, makeStep("AI Reassessment")];
  if (segment.delinquency.toLowerCase().includes("90") || urgent) {
    const finalNotice = makeStep("Communication");
    finalNotice.channel = "Email";
    finalNotice.purpose = messagePurposes.find((m) => /final|notice/i.test(m)) ?? messagePurposes[0]!;
    finalNotice.amount = 5;
    steps.push(finalNotice);
  }
  if (wantsReview) steps.push(makeStep("Human Review"));
  return steps;
}

function CreateStrategyPage() {
  const navigate = useNavigate();
  const { visibleClients, userName } = useRole();
  const { portfoliosForClient, createStrategy } = useStrategies();

  const firstClient = visibleClients[0]?.id ?? "";
  const [clientId, setClientId] = useState(firstClient);
  const clientPortfolios = portfoliosForClient(clientId);
  const [portfolioId, setPortfolioId] = useState(clientPortfolios[0]?.id ?? "");
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [prompt, setPrompt] = useState("");
  const [segment, setSegment] = useState<StrategySegment>(defaultSegment);
  const [steps, setSteps] = useState<Step[]>([]);
  const [addKind, setAddKind] = useState<StrategyNodeKind>("Communication");
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tips = useMemo(() => aiSuggestions(segment), [segment]);
  const activePortfolios = portfoliosForClient(clientId);
  const resolvedPortfolioId =
    activePortfolios.find((p) => p.id === portfolioId)?.id ?? activePortfolios[0]?.id ?? "";

  const nodes = useMemo(() => (steps.length ? buildNodes(steps) : null), [steps]);

  const preview: Strategy | null = nodes
    ? {
        id: "preview",
        name: name || "New workflow",
        clientId,
        portfolioId: resolvedPortfolioId,
        status: "Under Review",
        origin: "Human Modified",
        version: "v1.0",
        lastUpdated: "",
        coverage: 0,
        summary,
        aiContext: [],
        entryNodeId: "t1",
        nodes,
        versions: [],
        segment,
      }
    : null;

  const seg = (patch: Partial<StrategySegment>) => setSegment((prev) => ({ ...prev, ...patch }));
  const patchStep = (id: string, patch: Partial<Step>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const moveStep = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setSteps((prev) => {
      const from = prev.findIndex((s) => s.id === fromId);
      const to = prev.findIndex((s) => s.id === toId);
      if (from < 0 || to < 0) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved!);
      return copy;
    });
  };

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Strategies / Workflows", to: "/strategies" },
          { label: "Create workflow" },
        ]}
        title="Create a workflow"
        description="Describe what you want and let PayFlow AI suggest a starting flow, or add the steps yourself and drag them into the order you want."
      />

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Panel title="Workflow details">
            <div className="space-y-3">
              <Field label="Workflow name">
                <TextInput
                  value={name}
                  onChange={setName}
                  placeholder="e.g. PayPal Loans Early Reminder"
                />
              </Field>
              <Field label="Client">
                <SelectInput
                  value={clientName(clientId)}
                  options={visibleClients.map((c) => c.name)}
                  onChange={(label) => {
                    const match = visibleClients.find((c) => c.name === label);
                    if (match) {
                      setClientId(match.id);
                      setPortfolioId(portfoliosForClient(match.id)[0]?.id ?? "");
                    }
                  }}
                />
              </Field>
              <Field label="Sub-client / Portfolio">
                <SelectInput
                  value={activePortfolios.find((p) => p.id === resolvedPortfolioId)?.name ?? ""}
                  options={activePortfolios.map((p) => p.name)}
                  onChange={(label) => {
                    const match = activePortfolios.find((p) => p.name === label);
                    if (match) setPortfolioId(match.id);
                  }}
                />
              </Field>
              <Field label="What this workflow is for">
                <TextArea
                  value={summary}
                  onChange={setSummary}
                  placeholder="e.g. early email reminder for smaller balances that usually pay after one nudge"
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Who it applies to" description="Operational and geographic attributes only.">
            <div className="space-y-3">
              <Field label="Age band">
                <SelectInput
                  value={segment.ageBand}
                  options={ageBands}
                  onChange={(v) => seg({ ageBand: v })}
                />
              </Field>
              <Field label="Postal region">
                <SelectInput
                  value={segment.postalRegion}
                  options={postalRegions}
                  onChange={(v) => seg({ postalRegion: v })}
                />
              </Field>
              <Field label="Balance band">
                <SelectInput
                  value={segment.balanceBand}
                  options={balanceBands}
                  onChange={(v) => seg({ balanceBand: v })}
                />
              </Field>
              <Field label="Delinquency stage">
                <SelectInput
                  value={segment.delinquency}
                  options={delinquencyBands}
                  onChange={(v) => seg({ delinquency: v })}
                />
              </Field>
              <Field label="Language preference">
                <SelectInput
                  value={segment.language}
                  options={languagePreferences}
                  onChange={(v) => seg({ language: v })}
                />
              </Field>
              <Field label="Customer tenure">
                <SelectInput
                  value={segment.tenure}
                  options={tenureBands}
                  onChange={(v) => seg({ tenure: v })}
                />
              </Field>
              <p className="text-[11.5px] text-muted-foreground">
                Excluded from targeting: {excludedTargetingAttributes.join(", ")}. These attributes
                are never used to decide treatment.
              </p>
            </div>
          </Panel>

          <Panel
            title="Ask PayFlow AI"
            description="Describe the outcome you want. AI suggests the steps; you stay in control."
            action={<StatusPill tone="ai">AI</StatusPill>}
          >
            <Field label="Your prompt">
              <TextArea
                value={prompt}
                onChange={setPrompt}
                placeholder="e.g. gentle SMS-first reminder for small balances, offer an installment plan if there is no payment after a week"
              />
            </Field>
            <Btn
              className="mt-2"
              variant="primary"
              onClick={() => {
                setSteps(suggestFromPrompt(prompt, segment));
                setError(null);
              }}
            >
              <Sparkles className="size-3.5" />
              {steps.length ? "Re-suggest steps" : "Suggest steps"}
            </Btn>
            <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
              {tips.map((tip) => (
                <li
                  key={tip}
                  className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground"
                >
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-ai" />
                  {tip}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title="Build the steps"
            description="Drag a step by its handle to reorder it. A condition splits the flow into a YES and a NO path."
            action={
              <div className="flex items-end gap-2">
                <SelectInput
                  value={addKind}
                  options={addableKinds}
                  onChange={(v) => setAddKind(v as StrategyNodeKind)}
                />
                <Btn
                  onClick={() => {
                    setSteps((prev) => [...prev, makeStep(addKind)]);
                    setError(null);
                  }}
                >
                  <Plus className="size-3.5" />
                  Add
                </Btn>
              </div>
            }
          >
            {steps.length === 0 ? (
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                No steps yet. Describe what you want in “Ask PayFlow AI”, or add steps here and drag
                them into order.
              </p>
            ) : (
              <ul className="space-y-2">
                {steps.map((step, i) => (
                  <li
                    key={step.id}
                    draggable
                    onDragStart={() => setDragId(step.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragId) moveStep(dragId, step.id);
                      setDragId(null);
                    }}
                    className={
                      "rounded-xl border border-border bg-card px-3 py-2.5 shadow-subtle " +
                      (dragId === step.id ? "opacity-60" : "")
                    }
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                      <span className="text-[11px] font-bold text-muted-foreground">{i + 1}</span>
                      <StatusPill>{step.kind}</StatusPill>
                      <span className="truncate text-[12.5px] font-medium text-foreground">
                        {stepTitle(step)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove step ${i + 1}`}
                        className="ml-auto rounded-md border border-border/70 p-1 text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                        onClick={() => setSteps((prev) => prev.filter((s) => s.id !== step.id))}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {step.kind === "Communication" && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <Field label="Channel">
                          <SelectInput
                            value={step.channel ?? "Email"}
                            options={channels}
                            onChange={(v) => patchStep(step.id, { channel: v })}
                          />
                        </Field>
                        <Field label="Message purpose">
                          <SelectInput
                            value={step.purpose ?? messagePurposes[0]!}
                            options={messagePurposes}
                            onChange={(v) => patchStep(step.id, { purpose: v })}
                          />
                        </Field>
                        <Field label="Days after previous step">
                          <TextInput
                            value={String(step.amount)}
                            onChange={(v) =>
                              patchStep(step.id, {
                                amount: Math.max(0, Number(v.replace(/\D/g, "")) || 0),
                              })
                            }
                          />
                        </Field>
                      </div>
                    )}
                    {step.kind === "Wait" && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <Field label="Wait for">
                          <TextInput
                            value={String(step.amount)}
                            onChange={(v) =>
                              patchStep(step.id, {
                                amount: Math.max(0, Number(v.replace(/\D/g, "")) || 0),
                              })
                            }
                          />
                        </Field>
                        <Field label="Unit">
                          <SelectInput
                            value={step.unit}
                            options={timeUnits}
                            onChange={(v) => patchStep(step.id, { unit: v })}
                          />
                        </Field>
                      </div>
                    )}
                    {step.kind === "Condition" && (
                      <p className="mt-2 text-[11.5px] text-muted-foreground">
                        Checks whether the payment was received. YES closes the case as paid; NO
                        continues with the steps below. You can change what it checks after the
                        workflow is created.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Flow preview"
            description="This is how the workflow will run. After you create it you can edit any step and its message."
            bodyClassName="p-3"
            action={
              <Btn
                variant="primary"
                onClick={() => {
                  if (!name.trim()) return setError("Give the workflow a name.");
                  if (!resolvedPortfolioId) return setError("Select a sub-client / portfolio.");
                  if (!nodes) return setError("Add at least one step.");
                  const id = createStrategy({
                    name: name.trim(),
                    clientId,
                    portfolioId: resolvedPortfolioId,
                    summary: summary.trim() || "Human-created workflow with AI assistance.",
                    segment,
                    nodes,
                    author: userName,
                  });
                  void navigate({ to: "/strategies/$strategyId", params: { strategyId: id } });
                }}
              >
                Create workflow
              </Btn>
            }
          >
            {error && (
              <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-[12.5px] text-destructive">
                {error}
              </p>
            )}
            {preview ? (
              <StrategyCanvas strategy={preview} selectedId={null} onSelect={() => {}} />
            ) : (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
                <p className="text-[13px] font-semibold text-foreground">No steps yet</p>
                <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                  Add steps or ask PayFlow AI for a suggestion, and the flow will appear here.
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
