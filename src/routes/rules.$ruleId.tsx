import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PageHeader,
  Panel,
  Btn,
  StatusPill,
  KpiCard,
  EmptyState,
} from "@/components/payflow-ui";
import { RuleSummaryCard } from "@/components/rule-builder";
import { useRole } from "@/lib/role-context";
import { useRules } from "@/lib/rules-context";
import { conditionSummary, statusToneForRule } from "@/lib/rules-data";

export const Route = createFileRoute("/rules/$ruleId")({
  head: () => ({
    meta: [
      { title: "Rule detail — PayFlow Governance" },
      {
        name: "description",
        content:
          "Rule scope, structured conditions, resulting action, usage across clients and change history.",
      },
      { property: "og:title", content: "Rule detail — PayFlow Governance" },
      {
        property: "og:description",
        content: "Conditions, action, scope and change history for a governance rule.",
      },
    ],
  }),
  component: RuleDetail,
});

const today = "12 Sep 2026";

function RuleDetail() {
  const { ruleId } = Route.useParams();
  const { visibleClients, userName } = useRole();
  const { visibleRules, updateRule, canEditRule } = useRules();

  const rule = visibleRules.find((r) => r.id === ruleId);

  if (!rule) {
    return (
      <Panel title="Rule unavailable">
        <p className="text-sm text-muted-foreground">
          This rule either does not exist or belongs to a client that is not assigned to you.
        </p>
        <Link to="/rules" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to rules
        </Link>
      </Panel>
    );
  }

  const editable = canEditRule(rule);
  const clientName = (id: string) => visibleClients.find((c) => c.id === id)?.name ?? id;
  const scope =
    rule.clientId === null ? "System / Available Globally" : `Client: ${clientName(rule.clientId)}`;

  const setStatus = (status: typeof rule.status) =>
    updateRule(rule.id, {
      status,
      lastUpdated: today,
      history: [{ at: today, change: `Rule set to ${status}`, by: userName }, ...rule.history],
    });

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Rules", to: "/rules" }, { label: rule.name }]}
        title={rule.name}
        description={rule.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={statusToneForRule(rule.status)}>{rule.status}</StatusPill>
            <StatusPill tone={rule.type === "System Rule" ? "info" : "neutral"}>
              {rule.type}
            </StatusPill>
            {editable && rule.status !== "Active" && (
              <Btn variant="primary" onClick={() => setStatus("Active")}>
                Activate
              </Btn>
            )}
            {editable && rule.status === "Active" && (
              <Btn onClick={() => setStatus("Inactive")}>Deactivate</Btn>
            )}
            {!editable && <StatusPill>Read-only</StatusPill>}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Category" value={rule.category} />
        <KpiCard label="Result" value={rule.action} />
        <KpiCard label="Triggers · last 7 days" value={String(rule.triggers7d)} />
        <KpiCard label="Conditions" value={`${rule.conditions.length} · ${rule.logic}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel title="Conditions" description={`${rule.logic === "ALL" ? "All" : "Any"} must match`}>
            <ul className="space-y-2">
              {rule.conditions.map((condition, i) => (
                <li key={condition.id}>
                  {i > 0 && (
                    <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                      {rule.logic === "ALL" ? "AND" : "OR"}
                    </p>
                  )}
                  <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-[13px]">
                    {conditionSummary(condition)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-lg border border-border bg-card px-3.5 py-2.5">
              <p className="text-eyebrow">Then</p>
              <p className="mt-1 text-[13px] font-medium">{rule.action}</p>
            </div>
          </Panel>

          <Panel
            title="Where This Rule Is Used"
            description={
              rule.type === "System Rule"
                ? "System rules can be applied to any client"
                : "Client rules apply only to their own client"
            }
          >
            {rule.appliedTo.length === 0 ? (
              <EmptyState title="Not applied to any client yet" />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {rule.appliedTo.map((id) => (
                  <li key={id}>
                    <Link to="/clients/$clientId" params={{ clientId: id }}>
                      <StatusPill tone="info">{clientName(id)}</StatusPill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Under Supervised AI a triggered review rule creates a human review item instead of
              executing the proposed action. Under Autopilot routine actions proceed within the
              configured boundaries.
            </p>
          </Panel>
        </div>

        <div className="space-y-5">
          <RuleSummaryCard
            draft={{
              name: rule.name,
              description: rule.description,
              type: rule.type,
              clientId: rule.clientId,
              category: rule.category,
              logic: rule.logic,
              conditions: rule.conditions,
              action: rule.action,
            }}
          />
          <Panel title="Details">
            <dl className="divide-y divide-border">
              {[
                ["Scope", scope],
                ["Created by", rule.createdBy],
                ["Last updated", rule.lastUpdated],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-[12px] text-muted-foreground">{label}</dt>
                  <dd className="text-[12px] font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Change History">
            <ol className="space-y-3">
              {rule.history.map((entry, i) => (
                <li key={`${entry.at}-${i}`} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span className="leading-tight">
                    <span className="block text-[12px] font-medium text-foreground">
                      {entry.change}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {entry.at} · {entry.by}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
