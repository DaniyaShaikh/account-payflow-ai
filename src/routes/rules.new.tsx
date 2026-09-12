import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Btn, StatusPill } from "@/components/payflow-ui";
import {
  ConditionBuilder,
  RuleBasics,
  RuleSummaryCard,
  emptyRuleDraft,
  type RuleDraft,
} from "@/components/rule-builder";
import { useRole } from "@/lib/role-context";
import { useRules } from "@/lib/rules-context";
import type { RuleStatus } from "@/lib/rules-data";

export const Route = createFileRoute("/rules/new")({
  head: () => ({
    meta: [
      { title: "Create Rule — PayFlow Governance" },
      {
        name: "description",
        content:
          "Create a structured governance rule with field, operator and value conditions plus an operational action.",
      },
      { property: "og:title", content: "Create Rule — PayFlow Governance" },
      {
        property: "og:description",
        content: "Configure conditions and actions without writing code.",
      },
    ],
  }),
  component: CreateRulePage,
});

const today = "12 Sep 2026";

function CreateRulePage() {
  const navigate = useNavigate();
  const { visibleClients, isAdmin, userName } = useRole();
  const { addRule, canCreateRuleForClient } = useRules();

  const editableClients = visibleClients.filter((c) => canCreateRuleForClient(c.id));
  const clientOptions = editableClients.map((c) => ({ id: c.id, name: c.name }));

  const [draft, setDraft] = useState<RuleDraft>(() =>
    emptyRuleDraft(
      isAdmin
        ? {}
        : {
            type: "Client Rule",
            clientId: clientOptions[0]?.id ?? null,
          },
    ),
  );

  const patch = (p: Partial<RuleDraft>) => setDraft((prev) => ({ ...prev, ...p }));

  const issues = [
    !draft.name.trim() ? "Rule name is required" : null,
    draft.type === "Client Rule" && !draft.clientId ? "Select the client this rule applies to" : null,
    draft.conditions.some((c) => !c.value.trim()) ? "Every condition needs a value" : null,
  ].filter(Boolean) as string[];

  if (clientOptions.length === 0 && !isAdmin) {
    return (
      <Panel title="You cannot create rules">
        <p className="text-sm text-muted-foreground">
          Creating or editing client rules requires the “Create / Edit Client Rules” permission on at
          least one assigned client. Rules are read-only for your account.
        </p>
        <Btn className="mt-3" onClick={() => navigate({ to: "/rules" })}>
          Back to rules
        </Btn>
      </Panel>
    );
  }

  const save = (status: RuleStatus) => {
    if (issues.length > 0) return;
    const created = addRule({
      name: draft.name.trim(),
      description: draft.description.trim(),
      type: draft.type,
      clientId: draft.type === "Client Rule" ? draft.clientId : null,
      category: draft.category,
      logic: draft.logic,
      conditions: draft.conditions,
      action: draft.action,
      status,
      createdBy: userName,
      lastUpdated: today,
      triggers7d: 0,
      appliedTo: draft.type === "Client Rule" && draft.clientId ? [draft.clientId] : [],
      history: [
        {
          at: today,
          change: status === "Active" ? "Rule created and activated" : "Draft created",
          by: userName,
        },
      ],
    });
    navigate({ to: "/rules/$ruleId", params: { ruleId: created.id } });
  };

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Rules", to: "/rules" }, { label: "Create Rule" }]}
        title="Create Rule"
        description="Configure a structured condition and the action PayFlow should take when it is met."
        actions={
          <div className="flex items-center gap-2">
            <Btn onClick={() => save("Draft")} disabled={issues.length > 0}>
              Save as Draft
            </Btn>
            <Btn variant="primary" onClick={() => save("Active")} disabled={issues.length > 0}>
              Create &amp; Activate
            </Btn>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel title="Rule Details">
            <RuleBasics draft={draft} patch={patch} clientOptions={clientOptions} />
          </Panel>
          <Panel
            title="Conditions"
            description="Field, operator and value — no code required"
          >
            <ConditionBuilder draft={draft} patch={patch} />
          </Panel>
        </div>

        <div className="space-y-5">
          <RuleSummaryCard draft={draft} />
          <Panel title="Before you save">
            {issues.length === 0 ? (
              <StatusPill tone="success">Ready to save</StatusPill>
            ) : (
              <ul className="space-y-1.5">
                {issues.map((issue) => (
                  <li
                    key={issue}
                    className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12px]"
                  >
                    {issue}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Draft and inactive rules do not affect operations. Active rules participate in
              governance evaluation for their scope only.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
