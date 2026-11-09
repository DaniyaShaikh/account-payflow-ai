import { Field, SelectInput, TextInput, StatusPill, type Tone } from "./payflow-ui";
import { emptyJurisdiction, countries, statesFor, type Jurisdiction, type EvaluationResult } from "@/lib/compliance-data";

export function ComplianceNotice() {
  return <p className="mb-5 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-warning-foreground">Sample configurations only · All example regulations, limits and calendars require legal validation before operational use.</p>;
}
export function JurisdictionFields({ value, onChange, disabled = false }: { value: Jurisdiction; onChange: (value: Jurisdiction) => void; disabled?: boolean }) {
  const patch = (p: Partial<Jurisdiction>) => onChange({ ...value, ...p });
  return <fieldset disabled={disabled} className="grid min-w-0 gap-3 sm:grid-cols-2">
    <Field label="Country"><SelectInput value={value.country} options={["", ...countries]} onChange={country => patch({ country, state: "", region: "", postal: "", timezone: country === "United States" ? "America/New_York" : "America/Toronto" })} /></Field>
    <Field label="State / Province"><SelectInput value={value.state} options={["", ...statesFor(value.country), ...value.state && !statesFor(value.country).includes(value.state) ? [value.state] : []]} onChange={state => patch({ state })} /></Field>
    <Field label="Region"><TextInput value={value.region} onChange={region => patch({ region })} placeholder="Any region" /></Field>
    <Field label="Postal Code / Range" hint="Prefix or range, e.g. M5 or 10001..10010"><TextInput value={value.postal} onChange={postal => patch({ postal })} /></Field>
    <Field label="Recipient local time zone"><SelectInput value={value.timezone || emptyJurisdiction.timezone} options={["America/Toronto", "America/Vancouver", "America/Edmonton", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Halifax", "America/St_Johns", "UTC"]} onChange={timezone => patch({ timezone })} /></Field>
  </fieldset>;
}
export const complianceTone = (status: string): Tone => status === "Active" || status === "Allowed" ? "success" : status === "Blocked" ? "danger" : status === "Pending Approval" || status === "Review Required" || status === "Reschedule" ? "warning" : "neutral";
export function ComplianceResult({ value }: { value: EvaluationResult }) {
  return <div className="space-y-3 border-t border-border pt-4" role="status">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Evaluation result</h3><StatusPill tone={complianceTone(value.result)}>{value.result}</StatusPill></div>
    <p className="text-xs text-muted-foreground">{value.evaluated.length} applicable compliance and operational rules evaluated</p>
    {value.matches.map(m => <div key={`${m.layer}-${m.id}`} className="border-l-2 border-warning pl-3 text-xs"><p className="font-semibold">{m.id} · {m.name}</p><p className="mt-1 text-muted-foreground">{m.reason}</p><p className="mt-1 text-muted-foreground">{m.layer} · {m.action}</p></div>)}
    {!value.matches.length && <p className="text-sm text-success">No restrictions triggered.</p>}
    {value.nextWindow && <p className="text-sm font-medium">Next eligible window: {new Date(value.nextWindow).toLocaleString()} <span className="text-xs text-muted-foreground">(your display time)</span></p>}
    {value.result === "Reschedule" && !value.nextWindow && <p className="text-xs text-warning-foreground">No eligible window found within 14 days. Human review required.</p>}
  </div>;
}