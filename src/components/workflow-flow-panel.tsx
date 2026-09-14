import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Panel, StatusPill, Btn } from "@/components/payflow-ui";
import { StrategyCanvas } from "@/components/strategy-canvas";
import { StepEditorDialog } from "@/components/strategy-step-editor";
import { useStrategies } from "@/lib/strategy-context";
import { strategyStatusTone, type Strategy } from "@/lib/strategy-data";

function tokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Deterministically resolves the strategy that best matches a workflow name for a client. */
export function resolveStrategy(
  strategies: Strategy[],
  clientId?: string,
  workflowName?: string,
): Strategy | undefined {
  const scoped = clientId ? strategies.filter((s) => s.clientId === clientId) : strategies;
  const pool = scoped.length ? scoped : strategies;
  if (!pool.length) return undefined;
  if (!workflowName) return pool[0];
  const wanted = tokens(workflowName);
  let best = pool[0];
  let bestScore = -1;
  for (const s of pool) {
    const have = tokens(`${s.name} ${s.summary}`);
    const score = wanted.filter((t) => have.includes(t)).length;
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Shared visual workflow view. Renders the same node canvas and step popup used in the
 * Strategy Builder, so every place that shows a workflow shows the current design.
 */
export function WorkflowFlowPanel({
  clientId,
  workflowName,
  title = "Collection Workflow",
  description = "Same visual map used in the Strategy Builder. Click a step to open its configuration.",
  className,
}: {
  clientId?: string;
  workflowName?: string;
  title?: string;
  description?: string;
  className?: string;
}) {
  const {
    strategies,
    portfolioById,
    updateNodeConfig,
    toggleNodeDisabled,
    addNodeAfter,
  } = useStrategies();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const strategy = useMemo(
    () => resolveStrategy(strategies, clientId, workflowName),
    [strategies, clientId, workflowName],
  );

  if (!strategy) return null;
  const node = selectedId ? strategy.nodes[selectedId] : undefined;
  const portfolio = portfolioById(strategy.portfolioId);

  return (
    <Panel
      title={title}
      description={description}
      className={className}
      bodyClassName="p-3"
      action={
        <Link to="/strategies/$strategyId" params={{ strategyId: strategy.id }}>
          <Btn>Open in Strategy Builder</Btn>
        </Link>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
        <span className="text-[13px] font-semibold text-foreground">{strategy.name}</span>
        <StatusPill tone={strategyStatusTone(strategy.status)} dot>
          {strategy.status}
        </StatusPill>
        <StatusPill>{strategy.version}</StatusPill>
        {portfolio && <StatusPill>{portfolio.name}</StatusPill>}
      </div>

      <StrategyCanvas
        strategy={strategy}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setDialogOpen(true);
        }}
        onExpand={(id) => {
          setSelectedId(id);
          setDialogOpen(true);
        }}
      />

      <StepEditorDialog
        strategy={strategy}
        node={node}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onChange={(patch) => {
          if (node) updateNodeConfig(strategy.id, node.id, patch);
        }}
        onToggleDisabled={() => {
          if (node) toggleNodeDisabled(strategy.id, node.id);
        }}
        onAddAfter={(kind) => {
          if (node) addNodeAfter(strategy.id, node.id, kind);
        }}
      />
    </Panel>
  );
}
