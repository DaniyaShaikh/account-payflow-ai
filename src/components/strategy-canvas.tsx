import {
  Play,
  Mail,
  Clock,
  GitBranch,
  CreditCard,
  FolderCog,
  UserCheck,
  Sparkles,
  Flag,
  MessageSquare,
} from "lucide-react";
import { StatusPill } from "@/components/payflow-ui";
import { cn } from "@/lib/utils";
import {
  conditionLabel,
  nodeTone,
  timingLabel,
  type Strategy,
  type StrategyNode,
  type StrategyNodeKind,
} from "@/lib/strategy-data";

function NodeIcon({ kind, channel }: { kind: StrategyNodeKind; channel?: string | undefined }) {
  const cls = "size-4";
  switch (kind) {
    case "Trigger":
      return <Play className={cls} />;
    case "Communication":
      return channel === "SMS" ? <MessageSquare className={cls} /> : <Mail className={cls} />;
    case "Wait":
      return <Clock className={cls} />;
    case "Condition":
      return <GitBranch className={cls} />;
    case "Payment Action":
      return <CreditCard className={cls} />;
    case "Case Action":
      return <FolderCog className={cls} />;
    case "Human Review":
      return <UserCheck className={cls} />;
    case "AI Reassessment":
      return <Sparkles className={cls} />;
    default:
      return <Flag className={cls} />;
  }
}

function Connector({ label, tone }: { label?: string; tone?: "success" | "danger" }) {
  return (
    <div className="flex flex-col items-center">
      <span className="h-5 w-px bg-border-strong" aria-hidden />
      {label && (
        <span
          className={cn(
            "rounded-full border px-2 py-[1px] text-[10px] font-bold tracking-wide",
            tone === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {label}
        </span>
      )}
      <span className="h-5 w-px bg-border-strong" aria-hidden />
      <span className="-mt-1 size-1.5 rotate-45 border-r border-b border-border-strong" aria-hidden />
    </div>
  );
}

function NodeCard({
  node,
  selected,
  onSelect,
}: {
  node: StrategyNode;
  selected: boolean;
  onSelect: () => void;
}) {
  const timing = timingLabel(node);
  const condition = conditionLabel(node);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-[236px] rounded-xl border bg-card px-3.5 py-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-panel",
        selected
          ? "border-primary ring-2 ring-primary/25 shadow-panel"
          : "border-border shadow-subtle hover:border-border-strong",
        node.disabled && "opacity-55",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            node.kind === "Condition"
              ? "bg-warning/15 text-warning-foreground"
              : node.kind === "AI Reassessment"
                ? "bg-ai/10 text-ai"
                : node.kind === "Outcome"
                  ? "bg-success/10 text-success"
                  : "bg-primary/10 text-primary",
          )}
        >
          <NodeIcon kind={node.kind} channel={node.config.channel} />
        </span>
        <span className="text-eyebrow">{node.kind}</span>
        {node.origin === "Human Modified" && (
          <span className="ml-auto rounded-full bg-info/10 px-1.5 py-[1px] text-[9.5px] font-bold text-info">
            Human
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] leading-snug font-semibold text-foreground">{node.title}</p>
      {condition && <p className="mt-1 text-[11.5px] text-muted-foreground">{condition}</p>}
      {timing && <p className="mt-1 text-[11.5px] text-muted-foreground">{timing}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {node.config.channel && <StatusPill tone={nodeTone(node.kind)}>{node.config.channel}</StatusPill>}
        {node.config.purpose && <StatusPill>{node.config.purpose}</StatusPill>}
        {node.config.action && <StatusPill>{node.config.action}</StatusPill>}
        {node.config.outcome && <StatusPill tone="success">{node.config.outcome}</StatusPill>}
        {node.disabled && <StatusPill tone="neutral">Disabled</StatusPill>}
      </div>
    </button>
  );
}

function NodeBranch({
  strategy,
  nodeId,
  selectedId,
  onSelect,
  depth = 0,
}: {
  strategy: Strategy;
  nodeId: string | null | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  if (!nodeId || depth > 24) return null;
  const node = strategy.nodes[nodeId];
  if (!node) return null;

  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} selected={selectedId === node.id} onSelect={() => onSelect(node.id)} />
      {node.kind === "Condition" ? (
        <>
          <span className="h-5 w-px bg-border-strong" aria-hidden />
          <div className="flex items-start gap-6 sm:gap-10">
            {(["yes", "no"] as const).map((path) => {
              const target = node[path];
              if (!target) return null;
              return (
                <div key={path} className="flex flex-col items-center">
                  <Connector
                    label={path === "yes" ? "YES" : "NO"}
                    tone={path === "yes" ? "success" : "danger"}
                  />
                  <NodeBranch
                    strategy={strategy}
                    nodeId={target}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    depth={depth + 1}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : node.next ? (
        <>
          <Connector />
          <NodeBranch
            strategy={strategy}
            nodeId={node.next}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        </>
      ) : null}
    </div>
  );
}

export function StrategyCanvas({
  strategy,
  selectedId,
  onSelect,
}: {
  strategy: Strategy;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-surface px-6 py-8">
      <div className="flex min-w-max justify-center">
        <NodeBranch
          strategy={strategy}
          nodeId={strategy.entryNodeId}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
