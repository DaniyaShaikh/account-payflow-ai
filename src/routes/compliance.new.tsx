import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/payflow-ui";
import { ComplianceNotice } from "@/components/compliance-common";
import { ComplianceEditor } from "@/components/compliance-editor";
import { newComplianceRule } from "@/lib/compliance-data";
import { useRole } from "@/lib/role-context";
import { useState } from "react";
import { ruleTemplates } from "@/lib/jurisdiction-library";
import { Field, SelectInput } from "@/components/payflow-ui";
import type { ComplianceRule } from "@/lib/compliance-data";
export const Route = createFileRoute("/compliance/new")({
  validateSearch: (s: Record<string, unknown>): { clientId?: string } => typeof s["clientId"] === "string" ? { clientId: s["clientId"] } : {},
  head: () => ({ meta: [{ title: "Add Compliance Rule — PayFlow" }, { name: "description", content: "Create structured jurisdiction and channel compliance protections." }, { property: "og:title", content: "Add Compliance Rule — PayFlow" }, { property: "og:description", content: "Configure compliance conditions, enforcement and actions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: NewRule,
});
function NewRule() {
  const { clientId } = Route.useSearch(); const { visibleClients } = useRole(); const client = visibleClients.find(c => c.id === clientId);
  const [code, setCode] = useState(""); const label = (r: typeof ruleTemplates[number]) => `${r.code} · ${r.name}`; const t = ruleTemplates.find(x => label(x) === code); const base = newComplianceRule();
  const initial: ComplianceRule = { ...base, clientId: client?.id ?? null, jurisdiction: client?.config.jurisdiction ?? base.jurisdiction,
    ...(t ? { name: t.name, category: t.category as ComplianceRule["category"], action: t.action as ComplianceRule["action"], description: `${t.code} ${t.name}: ${t.example}`, conditions: [{ id: "c1", field: t.field, operator: t.operator ?? "Equals", value: t.value, period: 7 }] } : {}) };
  return <><PageHeader title="Add Compliance Rule" breadcrumb={[{ label: "Compliance Rules", to: "/compliance" }, { label: "New Rule" }]} /><ComplianceNotice />
    <div className="mb-5 max-w-xl"><Field label="Start from a rule type (optional)"><SelectInput value={code} options={["", ...ruleTemplates.map(label)]} onChange={setCode} /></Field>{t ? <p className="mt-1 text-xs text-muted-foreground">{t.name} — {t.example}. Default action: {t.action}.</p> : <p className="mt-1 text-xs text-muted-foreground">Pick a type (JUR-01 to JUR-25) to pre-fill the form, or start blank for any new kind of rule.</p>}</div>
    <ComplianceEditor key={code} initial={initial} /></>;
}
