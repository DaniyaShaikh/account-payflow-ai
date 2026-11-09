import { useState } from "react";
import { Btn, Field, TextInput, SelectInput, ToggleRow } from "./payflow-ui";
import { JurisdictionFields, ComplianceResult } from "./compliance-common";
import { defaultEvaluation, complianceChannels, type EvaluationInput, type EvaluationResult } from "@/lib/compliance-data";
import { useCompliance } from "@/lib/compliance-context";
import { useRole } from "@/lib/role-context";

export function ComplianceTesting({ clientId }: { clientId?: string | undefined }) {
  const { visibleClients } = useRole(); const { evaluate } = useCompliance();
  const first = visibleClients.find(c => c.id === clientId) ?? visibleClients[0];
  const [input, setInput] = useState<EvaluationInput>(() => defaultEvaluation(first?.id ?? "", first?.config.jurisdiction));
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const patch = (p: Partial<EvaluationInput>) => { setInput(i => ({ ...i, ...p })); setResult(null); };
  const [date, setDate] = useState("2026-11-09T15:00");
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Client"><select className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm" value={input.clientId} onChange={e => { const c = visibleClients.find(c => c.id === e.target.value); patch({ clientId: e.target.value, jurisdiction: c?.config.jurisdiction ?? input.jurisdiction }); }}>{visibleClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Communication Channel"><SelectInput value={input.channel} options={complianceChannels.filter(c => c !== "All Channels")} onChange={channel => patch({ channel })} /></Field></div>
    <JurisdictionFields value={input.jurisdiction} onChange={jurisdiction => patch({ jurisdiction })} />
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Communication Type"><SelectInput value={input.type} options={["Transactional", "Promotional", "Manual", "Automated"]} onChange={type => patch({ type })} /></Field><Field label="Proposed Date and Time (UTC)"><input type="datetime-local" className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm" value={date} onChange={e => { setDate(e.target.value); patch({ at: e.target.value ? `${e.target.value}:00Z` : "" }); }} /></Field>
      {([['attempts', 'Previous attempts in rolling period'], ['attemptsDaily', 'Previous attempts today'], ['attemptsMonthly', 'Previous attempts this month'], ['balance', 'Outstanding Balance'], ['daysPastDue', 'Days Past Due']] as const).map(([key, label]) => <Field key={key} label={label}><TextInput value={String(input[key])} onChange={v => patch({ [key]: Math.max(0, Number(v) || 0) })} /></Field>)}
      <Field label="Language"><SelectInput value={input.language} options={["English", "French", "Spanish"]} onChange={language => patch({ language })} /></Field>
    </div>
    <div className="grid gap-x-6 sm:grid-cols-2">{([['consent', 'Recorded channel consent'], ['optedOut', 'Customer opted out of this channel'], ['senderIdentified', 'Sender identified'], ['unsubscribeInstructions', 'Unsubscribe instructions included'], ['templateApproved', 'Template approved'], ['replyEnabled', 'Customer reply handling enabled']] as const).map(([key, label]) => <ToggleRow key={key} label={label} checked={input[key]} onChange={v => patch({ [key]: v })} />)}</div>
    <details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold">Restricted customer circumstances</summary><div className="mt-2 grid gap-x-6 sm:grid-cols-2">{["Do Not Contact", "Cease Communication", "Disputed Debt", "Legal Representation", "Bankruptcy", "Deceased", "Hardship", "Third-Party Contact"].map(flag => <ToggleRow key={flag} label={flag} checked={input.flags.includes(flag)} onChange={checked => patch({ flags: checked ? [...input.flags, flag] : input.flags.filter(f => f !== flag) })} />)}</div></details>
    <Btn variant="primary" onClick={() => setResult(evaluate(input, true))} disabled={!input.at || !input.jurisdiction.country}>Evaluate Rules</Btn>
    {result && <ComplianceResult value={result} />}
  </div>;
}