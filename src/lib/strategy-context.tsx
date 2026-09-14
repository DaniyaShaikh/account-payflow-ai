import { useContext, useMemo, useState, type ReactNode } from "react";
import { createStableContext } from "./stable-context";
import { seedPortfolios, type Portfolio } from "./portfolio-data";
import {
  seedStrategies,
  type NodeConfig,
  type Strategy,
  type StrategyNode,
  type StrategyNodeKind,
  type StrategySegment,
} from "./strategy-data";

interface StrategyContextValue {
  portfolios: Portfolio[];
  portfoliosForClient: (clientId: string) => Portfolio[];
  portfolioById: (id: string) => Portfolio | undefined;
  addPortfolio: (portfolio: Portfolio) => void;
  strategies: Strategy[];
  strategyById: (id: string) => Strategy | undefined;
  strategiesForPortfolio: (portfolioId: string) => Strategy[];
  strategiesForClient: (clientId: string) => Strategy[];
  updateNodeConfig: (strategyId: string, nodeId: string, patch: NodeConfig) => void;
  toggleNodeDisabled: (strategyId: string, nodeId: string) => void;
  addNodeAfter: (strategyId: string, nodeId: string, kind: StrategyNodeKind) => void;
  createStrategy: (input: {
    name: string;
    clientId: string;
    portfolioId: string;
    summary: string;
    segment: StrategySegment;
    nodes: Record<string, StrategyNode>;
    author: string;
  }) => string;
  approveStrategy: (strategyId: string, approver: string) => void;
  rejectStrategy: (strategyId: string, note: string) => void;
  saveDraft: (strategyId: string) => void;
}

const StrategyContext = createStableContext<StrategyContextValue | null>("strategies", null);

const today = "14 Sep 2026";

function bumpVersion(version: string) {
  const match = /^v(\d+)\.(\d+)$/.exec(version);
  if (!match) return version;
  return `v${match[1]}.${Number(match[2]) + 1}`;
}

export function StrategyProvider({ children }: { children: ReactNode }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(seedPortfolios);
  const [strategies, setStrategies] = useState<Strategy[]>(seedStrategies);

  const value = useMemo<StrategyContextValue>(() => {
    const patchStrategy = (strategyId: string, patch: (s: Strategy) => Strategy) =>
      setStrategies((prev) => prev.map((s) => (s.id === strategyId ? patch(s) : s)));

    const markHuman = (strategy: Strategy, nodeId: string, node: StrategyNode): Strategy => ({
      ...strategy,
      origin: "Human Modified",
      lastUpdated: today,
      status: strategy.status === "AI Proposed" ? "Under Review" : strategy.status,
      nodes: { ...strategy.nodes, [nodeId]: { ...node, origin: "Human Modified" } },
    });

    return {
      portfolios,
      portfoliosForClient: (clientId) => portfolios.filter((p) => p.clientId === clientId),
      portfolioById: (id) => portfolios.find((p) => p.id === id),
      addPortfolio: (portfolio) => setPortfolios((prev) => [...prev, portfolio]),
      strategies,
      strategyById: (id) => strategies.find((s) => s.id === id),
      strategiesForPortfolio: (portfolioId) =>
        strategies.filter((s) => s.portfolioId === portfolioId),
      strategiesForClient: (clientId) => strategies.filter((s) => s.clientId === clientId),
      updateNodeConfig: (strategyId, nodeId, patch) =>
        patchStrategy(strategyId, (s) => {
          const node = s.nodes[nodeId];
          if (!node) return s;
          return markHuman(s, nodeId, { ...node, config: { ...node.config, ...patch } });
        }),
      toggleNodeDisabled: (strategyId, nodeId) =>
        patchStrategy(strategyId, (s) => {
          const node = s.nodes[nodeId];
          if (!node) return s;
          return markHuman(s, nodeId, { ...node, disabled: !node.disabled });
        }),
      addNodeAfter: (strategyId, nodeId, kind) =>
        patchStrategy(strategyId, (s) => {
          const node = s.nodes[nodeId];
          if (!node || node.kind === "Condition") return s;
          const newId = `h-${Date.now().toString(36)}`;
          const created: StrategyNode = {
            id: newId,
            kind,
            title:
              kind === "Communication"
                ? "Send communication"
                : kind === "Wait"
                  ? "Wait / observe"
                  : `${kind} step`,
            origin: "Human Modified",
            config:
              kind === "Communication"
                ? {
                    channel: "Email",
                    purpose: "Payment Reminder",
                    referenceEvent: "Previous Action",
                    amount: 2,
                    unit: "Days",
                    direction: "After",
                  }
                : { referenceEvent: "Previous Action", amount: 2, unit: "Days", direction: "After" },
            next: node.next ?? null,
          };
          return {
            ...s,
            origin: "Human Modified",
            lastUpdated: today,
            status: s.status === "AI Proposed" ? "Under Review" : s.status,
            nodes: {
              ...s.nodes,
              [newId]: created,
              [nodeId]: { ...node, next: newId },
            },
          };
        }),
      createStrategy: (input) => {
        const id = `hs-${Date.now().toString(36)}`;
        const created: Strategy = {
          id,
          name: input.name,
          clientId: input.clientId,
          portfolioId: input.portfolioId,
          status: "Under Review",
          origin: "Human Modified",
          version: "v1.0",
          lastUpdated: today,
          coverage: 0,
          summary: input.summary,
          aiContext: [
            { label: "Created by", value: input.author },
            { label: "Age band", value: input.segment.ageBand },
            { label: "Postal region", value: input.segment.postalRegion },
            { label: "Balance band", value: input.segment.balanceBand },
            { label: "Delinquency", value: input.segment.delinquency },
            { label: "Language", value: input.segment.language },
          ],
          entryNodeId: "t1",
          nodes: input.nodes,
          segment: input.segment,
          versions: [
            { version: "v1.0", date: today, note: `Created by ${input.author} with AI assistance` },
          ],
        };
        setStrategies((prev) => [created, ...prev]);
        return id;
      },
      approveStrategy: (strategyId, approver) =>
        patchStrategy(strategyId, (s) => ({
          ...s,
          status: "Active",
          approvedBy: approver,
          approvalDate: today,
          version: bumpVersion(s.version),
          lastUpdated: today,
          versions: [
            { version: bumpVersion(s.version), date: today, note: `Approved by ${approver}` },
            ...s.versions,
          ],
        })),
      rejectStrategy: (strategyId, note) =>
        patchStrategy(strategyId, (s) => ({
          ...s,
          status: "AI Proposed",
          lastUpdated: today,
          versions: [
            {
              version: s.version,
              date: today,
              note: note || "Regeneration requested by supervisor",
            },
            ...s.versions,
          ],
        })),
      saveDraft: (strategyId) =>
        patchStrategy(strategyId, (s) => ({
          ...s,
          lastUpdated: today,
          status: s.status === "AI Proposed" ? "Under Review" : s.status,
          versions: [{ version: s.version, date: today, note: "Draft saved" }, ...s.versions],
        })),
    };
  }, [portfolios, strategies]);

  return <StrategyContext.Provider value={value}>{children}</StrategyContext.Provider>;
}

export function useStrategies() {
  const ctx = useContext(StrategyContext);
  if (!ctx) throw new Error("useStrategies must be used inside StrategyProvider");
  return ctx;
}
