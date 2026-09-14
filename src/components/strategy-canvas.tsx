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
  Maximize2,
} from "lucide-react";
import { StatusPill } from "@/components/payflow-ui";
import { cn } from "@/lib/utils";
import {
  conditionLabel,
  nodeTone,
  templateForNode,
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
      <span className="size-1.5 rounded-full bg-primary/50" aria-hidden />
      <span className="h-5 w-px bg-gradient-to-b from-primary/40 to-border-strong" aria-hidden />
      {label && (
        <span
          className={cn(
            "rounded-full border px-2 py-[1px] text-[10px] font-bold tracking-wide shadow-subtle",
            tone === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {label}
        </span>
      )}
      <span className="h-5 w-px bg-gradient-to-b from-border-strong to-primary/40" aria-hidden />
      <span className="-mt-1 size-1.5 rotate-45 border-r border-b border-primary/60" aria-hidden />
    </div>
  );
}

function accent(kind: StrategyNodeKind) {
  switch (kind) {
    case "Condition":
      return "bg-warning/15 text-warning-foreground";
    case "AI Reassessment":
      return "bg-ai/10 text-ai";
    case "Outcome":
      return "bg-success/10 text-success";
    case "Human Review":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-primary/10 text-primary";
  }
}

function NodeCard({
  node,
  selected,
  onSelect,
  onExpand,
}: {
  node: StrategyNode;
  selected: boolean;
  onSelect: () => void;
  onExpand?: () => void;
}) {
  const timing = timingLabel(node);
  const condition = conditionLabel(node);
  const template = templateForNode(node);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative w-[248px] cursor-pointer rounded-xl border bg-card px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel",
        selected
          ? "border-primary ring-2 ring-primary/25 shadow-panel"
          : "border-border shadow-subtle hover:border-primary/40",
        node.disabled && "opacity-55",
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-[3px] rounded-t-xl",
          node.kind === "Condition"
            ? "bg-warning"
            : node.kind === "Outcome"
              ? "bg-success"
              : node.kind === "AI Reassessment"
                ? "bg-ai"
                : node.kind === "Human Review"
                  ? "bg-destructive"
                  : "bg-primary",
        )}
        aria-hidden
      />
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", accent(node.kind))}>
          <NodeIcon kind={node.kind} channel={node.config.channel} />
        </span>
        <span className="text-eyebrow">{node.kind}</span>
        <span className="ml-auto flex items-center gap-1">
          {node.origin === "Human Modified" && (
            <span className="rounded-full bg-info/10 px-1.5 py-[1px] text-[9.5px] font-bold text-info">
              Human
            </span>
          )}
          {onExpand && (
            <button
              type="button"
              aria-label={`Edit step: ${node.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="rounded-md border border-border/70 bg-surface p-1 text-muted-foreground opacity-0 transition-all hover:border-primary/50 hover:text-primary group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Maximize2 className="size-3" />
            </button>
          )}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-snug font-semibold text-foreground">{node.title}</p>
      {condition && <p className="mt-1 text-[11.5px] text-muted-foreground">{condition}</p>}
      {timing && <p className="mt-1 text-[11.5px] text-muted-foreground">{timing}</p>}
      {template && (
        <div className="mt-2 rounded-lg border border-border/60 bg-surface px-2.5 py-2">
          <p className="text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">
            Sending
          </p>
          <p className="mt-0.5 text-[11.5px] font-medium text-foreground">{template.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
            {template.subject ?? template.body}
          </p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {node.config.channel && <StatusPill tone={nodeTone(node.kind)}>{node.config.channel}</StatusPill>}
        {node.config.purpose && <StatusPill>{node.config.purpose}</StatusPill>}
        {node.config.action && <StatusPill>{node.config.action}</StatusPill>}
        {node.config.outcome && <StatusPill tone="success">{node.config.outcome}</StatusPill>}
        {node.disabled && <StatusPill tone="neutral">Disabled</StatusPill>}
      </div>
    </div>
  );
}

function NodeBranch({
  strategy,
  nodeId,
  selectedId,
  onSelect,
  onExpand,
  depth = 0,
}: {
  strategy: Strategy;
  nodeId: string | null | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExpand?: (id: string) => void;
  depth?: number;
}) {
  if (!nodeId || depth > 24) return null;
  const node = strategy.nodes[nodeId];
  if (!node) return null;

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        node={node}
        selected={selectedId === node.id}
        onSelect={() => onSelect(node.id)}
        {...(onExpand ? { onExpand: () => onExpand(node.id) } : {})}
      />
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
                    {...(onExpand ? { onExpand } : {})}
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
            {...(onExpand ? { onExpand } : {})}
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
  onExpand,
}: {
  strategy: Strategy;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExpand?: (id: string) => void;
}) {
  return (
    <div
      className="overflow-x-auto rounded-xl border border-border/70 bg-surface px-6 py-8"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in oklab, var(--color-border-strong) 60%, transparent) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      <div className="flex min-w-max justify-center">
        <NodeBranch
          strategy={strategy}
          nodeId={strategy.entryNodeId}
          selectedId={selectedId}
          onSelect={onSelect}
          {...(onExpand ? { onExpand } : {})}
        />
      </div>
    </div>
  );
}

/** Small non-interactive preview of a strategy's shape, used on library cards. */
export function StrategyMiniMap({ strategy }: { strategy: Strategy }) {
  const rows: { kinds: StrategyNodeKind[] }[] = [];
  let current: string | null | undefined = strategy.entryNodeId;
  let guard = 0;
  while (current && guard < 6) {
    const node: StrategyNode | undefined = strategy.nodes[current];
    if (!node) break;
    if (node.kind === "Condition") {
      rows.push({ kinds: ["Condition"] });
      const yes = node.yes ? strategy.nodes[node.yes] : undefined;
      const no = node.no ? strategy.nodes[node.no] : undefined;
      const pair: StrategyNodeKind[] = [];
      if (yes) pair.push(yes.kind);
      if (no) pair.push(no.kind);
      if (pair.length) rows.push({ kinds: pair });
      current = node.no ?? null;
    } else {
      rows.push({ kinds: [node.kind] });
      current = node.next ?? null;
    }
    guard += 1;
  }

  const barColor = (kind: StrategyNodeKind) =>
    kind === "Condition"
      ? "bg-warning/60"
      : kind === "Outcome"
        ? "bg-success/60"
        : kind === "AI Reassessment"
          ? "bg-ai/60"
          : "bg-primary/45";

  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-3 py-3"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in oklab, var(--color-border-strong) 50%, transparent) 1px, transparent 1px)",
        backgroundSize: "12px 12px",
      }}
      aria-hidden
    >
      {rows.slice(0, 5).map((row, i) => (
        <div key={i} className="flex w-full items-center justify-center gap-2">
          {row.kinds.map((kind, j) => (
            <span
              key={j}
              className="flex h-4 flex-1 items-center gap-1 rounded-[4px] border border-border/70 bg-card px-1"
              style={{ maxWidth: row.kinds.length > 1 ? 60 : 96 }}
            >
              <span className={cn("size-1.5 rounded-full", barColor(kind))} />
              <span className="h-1 flex-1 rounded-full bg-border-strong/60" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
