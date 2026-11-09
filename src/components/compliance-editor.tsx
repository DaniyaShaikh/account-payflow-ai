import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Btn, Field, TextInput, SelectInput, ToggleRow, SectionHeading } from "./payflow-ui";
import { JurisdictionFields } from "./compliance-common";
import { complianceCategories, complianceChannels, conditionFields, conditionOperators, type ComplianceRule, type ComplianceCondition } from "@/lib/compliance-data";
import { useCompliance } from "@/lib/compliance-context";
import { useRole } from "@/lib/role-context";
import { Plus, Trash2 } from "lucide-react";

export function ComplianceEditor({ initial, onSaved }: { initial: ComplianceRule; onSaved?: (id: string) => void }) {
  const [draft, setDraft] = useState(initial);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const { saveRule } = useCompliance(); const { isAdmin, allClients } = useRole(); const navigate = useNavigate();
  const patch = (p: Partial<ComplianceRule>) => setDraft(d => ({ ...d, ...p }));
  const settings = (p: Partial<ComplianceRule["settings"]>) => patch({ settings: { ...draft.settings, ...p } });
  const condition = (id: string, p: Partial<ComplianceCondition>) => patch({ conditions: draft.conditions.map(c => c.id === id ? { ...c, ...p } : c) });
  const save = () => {
    if (!draft.name.trim() || !draft.jurisdiction.country || !reason.trim() || !draft.conditions.length || draft.conditions.some(c => !c.value.trim())) { setError("Enter a name, country, condition values and reason for change."); return; }
    if (draft.until && draft.until < draft.from) { setError("Effective until must follow effective from."); return; }
    if (draft.settings.start >= draft.settings.end || draft.settings.weekendStart >= draft.settings.weekendEnd) { setError("The end of each contact window must follow its start."); return; }
    if (draft.conditions.some(c => c.field === "Contact Attempts" && (!Number.isFinite(Number(c.value)) || Number(c.value) < 0 || c.period <= 0))) { setError("Contact limits must be non-negative numbers with a positive rolling period."); return; }
    if (draft.clientId && draft.action === "Allow") { setError("Client-specific rules may only add restrictions, not bypass inherited requirements."); return; }
    const id = saveRule(draft, reason); if (id) { if (onSaved) onSaved(id); else navigate({ to: "/compliance/$ruleId", params: { ruleId: id } }); }
  };
  return <fieldset disabled={!isAdmin} className="space-y-7">
    <div><SectionHeading title="Rule identification" /><div className="grid gap-3 sm:grid-cols-2">
      <Field label="Rule Name"><TextInput value={draft.name} onChange={name => patch({ name })} /></Field>
      <Field label="Rule ID"><TextInput value={draft.id || "Assigned when saved"} onChange={() => {}} disabled /></Field>
      <Field label="Category"><SelectInput value={draft.category} options={[...complianceCategories]} onChange={category => patch({ category: category as ComplianceRule["category"] })} /></Field>
      <Field label="Client scope"><SelectInput value={draft.clientId ?? "Global"} options={["Global", ...allClients.map(c => c.id)]} onChange={clientId => { if (!initial.id) patch({ clientId: clientId === "Global" ? null : clientId }); }} /></Field>
      <Field label="Description"><TextInput value={draft.description} onChange={description => patch({ description })} /></Field>
      <Field label="Regulatory Reference"><TextInput value={draft.reference} onChange={reference => patch({ reference })} /></Field>
      <Field label="Regulatory Source / URL"><TextInput value={draft.source} onChange={source => patch({ source })} placeholder="Source requiring legal validation" /></Field>
    </div></div>
    <div><SectionHeading title="Jurisdiction" /><JurisdictionFields value={draft.jurisdiction} onChange={jurisdiction => patch({ jurisdiction })} /><div className="mt-3 sm:max-w-xs"><Field label="Communication Channel"><SelectInput value={draft.channel} options={complianceChannels} onChange={channel => patch({ channel })} /></Field></div></div>
    <div><SectionHeading title="Rule conditions" action={<Btn onClick={() => patch({ conditions: [...draft.conditions, { id: crypto.randomUUID(), field: "Consent", operator: "Equals", value: "No", period: 7 }] })}><Plus className="size-4" /> Add condition</Btn>} />
      <div className="mb-3 max-w-xs"><Field label="Match conditions"><SelectInput value={draft.logic} options={["AND", "OR"]} onChange={logic => patch({ logic: logic as "AND" | "OR" })} /></Field></div>
      <div className="space-y-3">{draft.conditions.map(c => <div key={c.id} className="grid items-end gap-2 border-b border-border pb-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_80px_36px]">
        <Field label="Condition Type"><SelectInput value={c.field} options={conditionFields} onChange={field => condition(c.id, { field })} /></Field>
        <Field label="Operator"><SelectInput value={c.operator} options={conditionOperators} onChange={operator => condition(c.id, { operator })} /></Field>
        <Field label="Value"><TextInput value={c.value} onChange={value => condition(c.id, { value })} /></Field>
        <Field label="Days"><TextInput value={String(c.period)} onChange={v => condition(c.id, { period: Math.max(1, Number(v) || 1) })} /></Field>
        <Btn variant="ghost" onClick={() => patch({ conditions: draft.conditions.filter(x => x.id !== c.id) })} disabled={draft.conditions.length < 2}><Trash2 className="size-4" /><span className="sr-only">Remove condition</span></Btn>
      </div>)}</div>
      <p className="mt-3 rounded-md bg-surface p-3 text-xs leading-relaxed">If recipient is in {[draft.jurisdiction.country, draft.jurisdiction.state, draft.jurisdiction.region, draft.jurisdiction.postal].filter(Boolean).join(" / ")} AND {draft.conditions.map(c => `${c.field} ${c.operator.toLowerCase()} ${c.value}`).join(` ${draft.logic} `)}, then {draft.action.toLowerCase()} the communication.</p>
    </div>
    {draft.category === "Permitted Hours" && <div><SectionHeading title="Recipient-local sending windows" /><div className="grid gap-3 sm:grid-cols-2">{([['start', 'Weekday start'], ['end', 'Weekday end'], ['weekendStart', 'Weekend start'], ['weekendEnd', 'Weekend end']] as const).map(([key, label]) => <Field key={key} label={label}><input type="time" className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm" value={draft.settings[key]} onChange={e => settings({ [key]: e.target.value })} /></Field>)}</div><div className="mt-3 flex flex-wrap gap-4">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, index) => <label key={d} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.settings.days.includes(index)} onChange={e => settings({ days: e.target.checked ? [...draft.settings.days, index] : draft.settings.days.filter(x => x !== index) })} />{d}</label>)}</div><p className="mt-3 text-xs text-muted-foreground">Recipient time zone and daylight saving changes apply to every sending window.</p></div>}
    {draft.category === "Frequency" && <div><SectionHeading title="Contact frequency limits" /><div className="grid gap-3 sm:grid-cols-2">{([['daily', 'Maximum per day'], ['weekly', 'Maximum per week'], ['monthly', 'Maximum per month'], ['intervalHours', 'Minimum interval (hours)']] as const).map(([key, label]) => <Field key={key} label={label} hint="0 means no additional limit"><TextInput value={String(draft.settings[key])} onChange={v => settings({ [key]: Math.max(0, Number(v) || 0) })} /></Field>)}</div><ToggleRow label="Combine attempts across channels" checked={draft.settings.combined} onChange={combined => settings({ combined })} /></div>}
    {draft.category === "Consent & Opt-Out" && <div><SectionHeading title="Consent and preferences" /><div className="grid gap-3 sm:grid-cols-2"><Field label="Consent capture method"><TextInput value={draft.settings.consentMethod} onChange={consentMethod => settings({ consentMethod })} /></Field><Field label="Consent expiry (days)" hint="0 = no configured expiry"><TextInput value={String(draft.settings.consentExpiryDays)} onChange={v => settings({ consentExpiryDays: Math.max(0, Number(v) || 0) })} /></Field></div><ToggleRow label="Re-subscription eligible" checked={draft.settings.resubscribe} onChange={resubscribe => settings({ resubscribe })} /><ToggleRow label="Promotional communications only" checked={draft.settings.promotionalOnly} onChange={promotionalOnly => settings({ promotionalOnly })} /></div>}
    {draft.category === "Reply Handling" && <div><SectionHeading title="Reply and inbound handling" /><div className="grid gap-3 sm:grid-cols-2"><Field label="Communication capability"><SelectInput value={draft.settings.reply} options={["One-way", "Two-way", "Two-way + Human Escalation", "Two-way + Automatic Acknowledgment"]} onChange={reply => settings({ reply })} /></Field><Field label="Unsubscribe / help keywords"><TextInput value={draft.settings.keywords} onChange={keywords => settings({ keywords })} /></Field></div></div>}
    {draft.category === "Content" && <Field label="Required disclosure / opt-out language"><TextInput value={draft.settings.requiredText} onChange={requiredText => settings({ requiredText })} /></Field>}
    {draft.category === "Additional Controls" && <Field label="Record retention period (days)"><TextInput value={String(draft.settings.retentionDays)} onChange={v => settings({ retentionDays: Math.max(0, Number(v) || 0) })} /></Field>}
    <div><SectionHeading title="Enforcement & lifecycle" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Enforcement"><SelectInput value={draft.enforcement} options={["Mandatory", "Client Configurable", "Advisory"]} onChange={enforcement => patch({ enforcement: enforcement as ComplianceRule["enforcement"] })} /></Field>
      <Field label="Action"><SelectInput value={draft.action} options={["Allow", "Block", "Reschedule", "Suppress", "Require Approval", "Flag for Review"].filter(a => !draft.clientId || a !== "Allow")} onChange={action => patch({ action: action as ComplianceRule["action"] })} /></Field>
      <Field label="Priority"><TextInput value={String(draft.priority)} onChange={v => patch({ priority: Math.max(0, Number(v) || 0) })} /></Field>
      <Field label="Effective From"><input type="date" className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm" value={draft.from} onChange={e => patch({ from: e.target.value })} /></Field>
      <Field label="Effective Until"><input type="date" className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm" value={draft.until} onChange={e => patch({ until: e.target.value })} /></Field>
      <Field label="Status"><SelectInput value={draft.status} options={["Draft", "Pending Approval", "Active", "Inactive", "Archived"]} onChange={status => patch({ status: status as ComplianceRule["status"] })} /></Field>
    </div></div>
    <Field label="Reason for change"><TextInput value={reason} onChange={setReason} /></Field>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {isAdmin && <Btn variant="primary" onClick={save}>Save Compliance Rule</Btn>}
  </fieldset>;
}