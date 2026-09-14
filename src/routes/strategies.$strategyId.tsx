import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Info } from "lucide-react";
import {
  PageHeader,
  Panel,
  StatusPill,
  Btn,
  Field,
  SelectInput,
  TextInput,
  TextArea,
} from "@/components/payflow-ui";
import { StrategyCanvas } from "@/components/strategy-canvas";
import { useRole } from "@/lib/role-context";
import { useStrategies } from "@/lib/strategy-context";
import { clientName, formatNumber } from "@/lib/payflow-data";
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
  strategyStatusTone,
  timeDirections,
  timeUnits,
  type StrategyNodeKind,
} from "@/lib/strategy-data";
import { seedStrategies } from "@/lib/strategy-data";

export const Route = createFileRoute("/strategies/$strategyId")({
  head: () => ({
    meta: [
      { title: "Strategy builder — PayFlow" },
      {
        name: "description",
        content:
          "Visual PayFlow strategy builder: review an AI-proposed collection strategy, adjust nodes, timing and conditions, then approve or request regeneration.",
      },
      { property: "og:title", content: "Strategy builder — PayFlow" },
      {
        property: "og:description",
        content: "Review, modify and approve an AI-proposed collection strategy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ params }) => {
    if (!seedStrategies.some((s) => s.id === params.strategyId)) throw notFound();
    return null;
  },
  component: StrategyBuilder,
});

const addableKinds: StrategyNodeKind[] = ["Communication", "Wait", "AI Reassessment", "Case Action"];

function StrategyBuilder() {
  const { strategyId } = Route.useParams();
  const { canSeeClient, isAdmin, userName } = useRole();
  const {
    strategyById,
    portfolioById,
    updateNodeConfig,
    toggleNodeDisabled,
    addNodeAfter,
    approveStrategy,
    rejectStrategy,
    saveDraft,
  } = useStrategies();

  const strategy = strategyById(strategyId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<StrategyNodeKind>("Communication");

  if (!strategy || !canSeeClient(strategy.clientId)) {
    return (
      <Panel title="No access to this strategy">
        <p className="text-sm text-muted-foreground">
          This strategy belongs to a client that is not assigned to your account.
        </p>
        <Link to="/strategies" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to strategies
        </Link>
      </Panel>
    );
  }

  const portfolio = portfolioById(strategy.portfolioId);
  const node = selectedId ? strategy.nodes[selectedId] : undefined;
  const humanModified = Object.values(strategy.nodes).filter(
    (n) => n.origin === "Human Modified",
  ).length;
  // Supervisors approve strategies for their assigned clients; admins for all.
  const canDecide = isAdmin || canSeeClient(strategy.clientId);

  const set = (patch: Parameters<typeof updateNodeConfig>[2]) => {
    if (!node) return;
    updateNodeConfig(strategy.id, node.id, patch);
    setNotice("Change recorded as Human Modified.");
  };

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Strategies / Workflows", to: "/strategies" },
          { label: clientName(strategy.clientId) },
          { label: portfolio?.name ?? "Portfolio" },
          { label: strategy.name },
        ]}
        title={strategy.name}
        description={strategy.summary}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={strategyStatusTone(strategy.status)} dot>
              {strategy.status}
            </StatusPill>
            <StatusPill>{strategy.version}</StatusPill>
            <Btn onClick={() => { saveDraft(strategy.id); setNotice("Draft saved."); }}>
              Save Draft
            </Btn>
            <Btn
              variant="danger"
              disabled={!canDecide}
              onClick={() => {
                rejectStrategy(strategy.id, rejectNote);
                setNotice("Regeneration requested. PayFlow will propose a revised strategy.");
              }}
            >
              Reject / Request Regeneration
            </Btn>
            <Btn
              variant="primary"
              disabled={!canDecide}
              onClick={() => {
                approveStrategy(strategy.id, userName);
                setNotice(`Strategy approved by ${userName} and is now active.`);
              }}
            >
              Approve Strategy
            </Btn>
          </div>
        }
      />

      {notice && (
        <div className="mb-4 rounded-lg border border-primary/25 bg-primary/[0.06] px-4 py-2.5 text-[12.5px] text-foreground">
          {notice}
        </div>
      )}

      {strategy.origin === "AI Proposed" && strategy.status !== "Active" && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ai/25 bg-ai/[0.06] px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-7 items-center justify-center rounded-lg bg-ai/15 text-ai">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-foreground">AI Proposed Strategy</p>
              <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
                PayFlow generated this strategy using the available portfolio, account, payment and
                engagement context. Review each step, adjust what needs changing, then approve.
              </p>
            </div>
          </div>
          <Btn variant="ghost" onClick={() => setShowContext((v) => !v)}>
            <Info className="size-3.5" />
            {showContext ? "Hide reasoning" : "Why PayFlow proposed this strategy"}
          </Btn>
        </div>
      )}

      {showContext && (
        <Panel
          title="Why PayFlow proposed this strategy"
          description="Operational context only. Strategy decisions never use demographic attributes."
          className="mb-4"
        >
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {strategy.aiContext.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-1.5">
                <dt className="text-[12px] text-muted-foreground">{item.label}</dt>
                <dd className="text-[12.5px] font-medium text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_310px]">
        <Panel
          title="Strategy flow"
          description="Select any step to review or adjust its configuration."
          bodyClassName="p-3"
        >
          <StrategyCanvas
            strategy={strategy}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
          />
        </Panel>

        <div className="space-y-4">
          {!node ? (
            <Panel title="Step configuration">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Select a step on the canvas to see its configuration. Timing, channels and conditions
                use the values PayFlow allows for this client.
              </p>
            </Panel>
          ) : (
            <Panel
              title={node.kind}
              description={node.title}
              action={
                <StatusPill tone={node.origin === "AI Proposed" ? "ai" : "info"}>
                  {node.origin}
                </StatusPill>
              }
            >
              <div className="space-y-3">
                {node.kind === "Communication" && (
                  <>
                    <Field label="Action">
                      <TextInput value="Send Communication" onChange={() => {}} disabled />
                    </Field>
                    <Field label="Channel">
                      <SelectInput
                        value={node.config.channel ?? "Email"}
                        options={channels}
                        onChange={(v) => set({ channel: v })}
                      />
                    </Field>
                    <Field label="Message Purpose">
                      <SelectInput
                        value={node.config.purpose ?? messagePurposes[0]!}
                        options={messagePurposes}
                        onChange={(v) => set({ purpose: v })}
                      />
                    </Field>
                  </>
                )}

                {node.kind === "Payment Action" && (
                  <Field label="Payment Action">
                    <SelectInput
                      value={node.config.action ?? paymentActions[0]!}
                      options={paymentActions}
                      onChange={(v) => set({ action: v })}
                    />
                  </Field>
                )}

                {node.kind === "Case Action" && (
                  <Field label="Case Action">
                    <SelectInput
                      value={node.config.action ?? caseActions[0]!}
                      options={caseActions}
                      onChange={(v) => set({ action: v })}
                    />
                  </Field>
                )}

                {node.kind === "Outcome" && (
                  <Field label="Outcome">
                    <SelectInput
                      value={node.config.outcome ?? outcomes[0]!}
                      options={outcomes}
                      onChange={(v) => set({ outcome: v })}
                    />
                  </Field>
                )}

                {node.kind === "Human Review" && (
                  <Field label="Review Note" hint="Shown to the supervisor who picks up the review.">
                    <TextArea
                      value={node.config.note ?? ""}
                      onChange={(v) => set({ note: v })}
                    />
                  </Field>
                )}

                {node.kind === "Condition" && (
                  <>
                    <Field label="Condition">
                      <SelectInput
                        value={node.config.attribute ?? conditionAttributes[0]!}
                        options={conditionAttributes}
                        onChange={(v) =>
                          set({ attribute: v, value: conditionValues[v]?.[0] ?? "" })
                        }
                      />
                    </Field>
                    <Field label="Operator">
                      <SelectInput
                        value={node.config.operator ?? "Equals"}
                        options={conditionOperators}
                        onChange={(v) => set({ operator: v })}
                      />
                    </Field>
                    <Field label="Value">
                      <SelectInput
                        value={node.config.value ?? ""}
                        options={conditionValues[node.config.attribute ?? ""] ?? ["Unpaid"]}
                        onChange={(v) => set({ value: v })}
                      />
                    </Field>
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
                        onChange={(v) => set({ referenceEvent: v })}
                      />
                    </Field>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Number">
                        <TextInput
                          value={String(node.config.amount ?? 0)}
                          onChange={(v) => set({ amount: Math.max(0, Number(v.replace(/\D/g, "")) || 0) })}
                        />
                      </Field>
                      <Field label="Unit">
                        <SelectInput
                          value={node.config.unit ?? "Days"}
                          options={timeUnits}
                          onChange={(v) => set({ unit: v })}
                        />
                      </Field>
                      <Field label="Before / After">
                        <SelectInput
                          value={node.config.direction ?? "After"}
                          options={timeDirections}
                          onChange={(v) => set({ direction: v })}
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

                {node.kind !== "Trigger" && (
                  <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                    <Btn
                      onClick={() => {
                        toggleNodeDisabled(strategy.id, node.id);
                        setNotice(
                          node.disabled ? "Step re-enabled." : "Step disabled in this strategy.",
                        );
                      }}
                    >
                      {node.disabled ? "Enable step" : "Disable step"}
                    </Btn>
                  </div>
                )}

                {node.kind !== "Condition" && (
                  <div className="border-t border-border/60 pt-3">
                    <Field label="Add a step after this one">
                      <SelectInput
                        value={addKind}
                        options={addableKinds}
                        onChange={(v) => setAddKind(v as StrategyNodeKind)}
                      />
                    </Field>
                    <Btn
                      className="mt-2"
                      onClick={() => {
                        addNodeAfter(strategy.id, node.id, addKind);
                        setNotice(`${addKind} step added and marked Human Modified.`);
                      }}
                    >
                      Add step
                    </Btn>
                  </div>
                )}
              </div>
            </Panel>
          )}

          <Panel
            title="Approval & versions"
            action={
              <Btn variant="ghost" onClick={() => setShowAudit((v) => !v)}>
                {showAudit ? "Hide" : "View changes"}
              </Btn>
            }
          >
            <dl className="space-y-1.5 text-[12.5px]">
              {[
                ["Origin", strategy.origin],
                ["Human modified steps", String(humanModified)],
                ["Approved By", strategy.approvedBy ?? "Not yet approved"],
                ["Approval Date", strategy.approvalDate ?? "—"],
                ["Strategy Version", strategy.version],
                ["Cases covered", formatNumber(strategy.coverage)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            {showAudit && (
              <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
                {strategy.versions.map((v, i) => (
                  <li key={`${v.version}-${i}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px] font-semibold text-foreground">{v.version}</span>
                      <span className="text-[11px] text-muted-foreground">{v.date}</span>
                    </div>
                    <p className="text-[11.5px] text-muted-foreground">{v.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Request regeneration">
            <Field label="Note for PayFlow" hint="Optional. Explain what should change.">
              <TextArea
                value={rejectNote}
                onChange={setRejectNote}
                placeholder="e.g. reduce contact volume for low balances"
              />
            </Field>
          </Panel>
        </div>
      </div>
    </>
  );
}
