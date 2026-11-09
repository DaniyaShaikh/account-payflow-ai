import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useRules } from "@/lib/rules-context";
import { useRole } from "@/lib/role-context";
import { operationalRuleSelected } from "@/lib/client-rule-selection";
import type { ClientConfig } from "@/lib/payflow-data";
import { ConditionBuilder, emptyRuleDraft, type RuleDraft } from "./rule-builder";
import { ruleActions, ruleCategories } from "@/lib/rules-data";
import { Btn, Field, TextInput, SelectInput, StatusPill } from "./payflow-ui";

export function ClientOperationalRules({ config, patch, clientId = "", readOnly = false }: { config: ClientConfig; patch: (p: Partial<ClientConfig>) => void; clientId?: string; readOnly?: boolean }) {
  const { visibleRules, addRule } = useRules();
  const { userName } = useRole();
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const available = visibleRules.filter(r => r.type === "System Rule" || r.clientId === clientId);
  const selected = available.filter(r => operationalRuleSelected(r, clientId, config)).map(r => r.id);
  const toggle = (id: string, checked: boolean) => patch({ selectedOperationalRules: checked ? [...selected, id] : selected.filter(x => x !== id) });
  const save = () => {
    if (!draft || !draft.name.trim() || draft.conditions.some(c => !c.value.trim())) return;
    const rule = addRule({ ...draft, name: draft.name.trim(), status: "Draft", createdBy: userName, lastUpdated: new Date().toISOString(), triggers7d: 0, appliedTo: clientId ? [clientId] : [], history: [] });
    patch({ selectedOperationalRules: [...selected, rule.id] });
    setDraft(null);
  };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">System & Client Rules <span className="text-muted-foreground">· {selected.length} selected</span></h3>{!readOnly && <Btn onClick={() => setDraft(draft ? null : emptyRuleDraft({ type: "Client Rule", clientId: clientId || null }))}>{draft ? "Cancel new rule" : "+ Add Client Rule"}</Btn>}</div>
    {draft && <div className="space-y-4 border-y border-border py-4">
      <Field label="Rule name"><TextInput value={draft.name} onChange={name => setDraft({ ...draft, name })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Category"><SelectInput value={draft.category} options={[...ruleCategories]} onChange={category => setDraft({ ...draft, category })} /></Field><Field label="Action"><SelectInput value={draft.action} options={[...ruleActions]} onChange={action => setDraft({ ...draft, action })} /></Field></div>
      <ConditionBuilder draft={draft} patch={p => setDraft({ ...draft, ...p })} />
      <Btn variant="primary" disabled={!draft.name.trim() || draft.conditions.some(c => !c.value.trim())} onClick={save}>Save Client Rule as Draft</Btn>
    </div>}
    {(["System Rule", "Client Rule"] as const).map(type => <div key={type}><h4 className="mb-2 text-xs font-semibold text-muted-foreground">{type === "System Rule" ? "System Rules" : "Client Rules"}</h4>{available.filter(r => r.type === type).map(r => <div key={r.id} className="flex items-start gap-3 border-b border-border py-3">
      <input aria-label={`Select ${r.name}`} type="checkbox" checked={selected.includes(r.id)} disabled={readOnly} onChange={e => toggle(r.id, e.target.checked)} className="mt-1 size-4 shrink-0 accent-primary" />
      <div className="min-w-0 flex-1"><Link to="/rules/$ruleId" params={{ ruleId: r.id }} className="text-sm font-medium text-primary">{r.name}</Link><p className="mt-1 text-xs text-muted-foreground">{r.category} · {r.action}</p></div><StatusPill>{r.status}</StatusPill>
    </div>)}{!available.some(r => r.type === type) && <p className="text-xs text-muted-foreground">No {type === "System Rule" ? "system" : "client"} rules available.</p>}</div>)}
  </div>;
}