import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
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
  defaultSegment,
  delinquencyBands,
  excludedTargetingAttributes,
  languagePreferences,
  postalRegions,
  suggestedNodes,
  tenureBands,
  type Strategy,
  type StrategySegment,
} from "@/lib/strategy-data";

export const Route = createFileRoute("/strategies/new")({
  head: () => ({
    meta: [
      { title: "Create a workflow — PayFlow" },
      {
        name: "description",
        content:
          "Create a collection workflow yourself while PayFlow AI suggests the steps, channels, templates and timing for the accounts you select.",
      },
      { property: "og:title", content: "Create a workflow — PayFlow" },
      {
        property: "og:description",
        content: "Human-created collection workflow with AI-suggested steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreateStrategyPage,
});

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
  const [segment, setSegment] = useState<StrategySegment>(defaultSegment);
  const [nodes, setNodes] = useState<Strategy["nodes"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tips = useMemo(() => aiSuggestions(segment), [segment]);
  const activePortfolios = portfoliosForClient(clientId);
  const resolvedPortfolioId =
    activePortfolios.find((p) => p.id === portfolioId)?.id ?? activePortfolios[0]?.id ?? "";

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

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Strategies / Workflows", to: "/strategies" }, { label: "Create workflow" }]}
        title="Create a workflow"
        description="You define who the workflow applies to; PayFlow AI suggests the steps, channels, templates and timing. You can change every step before it is submitted for approval."
      />

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Panel title="Workflow details">
            <div className="space-y-3">
              <Field label="Workflow name">
                <TextInput value={name} onChange={setName} placeholder="e.g. PayPal Loans Early Reminder" />
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

          <Panel
            title="Who it applies to"
            description="Operational and geographic attributes only."
          >
            <div className="space-y-3">
              <Field label="Age band">
                <SelectInput value={segment.ageBand} options={ageBands} onChange={(v) => seg({ ageBand: v })} />
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
                <SelectInput value={segment.tenure} options={tenureBands} onChange={(v) => seg({ tenure: v })} />
              </Field>
              <p className="text-[11.5px] text-muted-foreground">
                Excluded from targeting: {excludedTargetingAttributes.join(", ")}. These attributes are
                never used to decide treatment.
              </p>
            </div>
          </Panel>

          <Panel
            title="AI assistance"
            description="Suggestions based on the accounts you selected."
            action={<StatusPill tone="ai">AI</StatusPill>}
          >
            <ul className="space-y-2">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-ai" />
                  {tip}
                </li>
              ))}
            </ul>
            <Btn
              className="mt-3"
              variant="primary"
              onClick={() => {
                setNodes(suggestedNodes(segment));
                setError(null);
              }}
            >
              <Sparkles className="size-3.5" />
              {nodes ? "Re-suggest steps" : "Let AI suggest the steps"}
            </Btn>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title="Suggested flow"
            description="Review the suggested steps. After you create the workflow you can edit any step and its message."
            bodyClassName="p-3"
            action={
              <Btn
                variant="primary"
                onClick={() => {
                  if (!name.trim()) return setError("Give the workflow a name.");
                  if (!resolvedPortfolioId) return setError("Select a sub-client / portfolio.");
                  if (!nodes) return setError("Ask AI to suggest the steps first.");
                  const id = createStrategy({
                    name: name.trim(),
                    clientId,
                    portfolioId: resolvedPortfolioId,
                    summary: summary.trim() || "Human-created workflow with AI-suggested steps.",
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
                  Choose the accounts this workflow applies to, then let PayFlow AI suggest a starting
                  flow with channels, message templates and timing.
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
