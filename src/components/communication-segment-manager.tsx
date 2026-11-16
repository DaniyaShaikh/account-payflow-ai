import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Settings2 } from "lucide-react";
import { Btn, Field, SelectInput, TextInput } from "./payflow-ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { demonstrateVariantMatch, matchingCommunicationSegments, segmentCountries, segmentCriteria, segmentRegions, validateCommunicationSegments, type CommunicationSegment, type CommunicationSegments, type SegmentKind } from "@/lib/communication-segments";

export function CommunicationSegmentManager({ config, availableIds, canManage, blocked, onSave }: {
  config: CommunicationSegments; availableIds: string[]; canManage: boolean; blocked: boolean;
  onSave: (config: CommunicationSegments) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(config);
  const [age, setAge] = useState("22");
  const [country, setCountry] = useState("Canada");
  const [region, setRegion] = useState("Ontario");
  const [language, setLanguage] = useState("English");
  const errors = validateCommunicationSegments(draft);
  const patch = (id: string, update: Partial<CommunicationSegment>) => setDraft((prev) => ({ ...prev, rules: prev.rules.map((r) => r.id === id ? { ...r, ...update } : r) }));
  const move = (index: number, direction: number) => {
    const rules = [...draft.rules];
    const current = rules[index]; const adjacent = rules[index + direction];
    if (!current || !adjacent) return;
    rules[index] = adjacent; rules[index + direction] = current;
    setDraft({ ...draft, rules });
  };
  const example = { ...(age.trim() ? { age: Number(age) } : {}), country, region, language };
  const matches = matchingCommunicationSegments(draft, example);
  const selected = demonstrateVariantMatch(draft, availableIds, example);
  const selectedRule = draft.rules.find((r) => r.id === selected);
  return <>
    <Btn disabled title="Coming soon" onClick={() => { setDraft(structuredClone(config)); setOpen(true); }}><Settings2 className="size-3.5" />Manage Segments · Coming soon</Btn>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Manage Segments</DialogTitle><DialogDescription>Communication wording only · highest priority first. Main / Default always remains the fallback.</DialogDescription></DialogHeader>
        {!canManage && <p className="text-xs text-muted-foreground">Read-only: segment changes require permission to modify AI recommendations.</p>}
        <div className="flex flex-wrap gap-4">{(["Age group", "Country", "Region"] as SegmentKind[]).map((kind) => <label key={kind} className="flex items-center gap-2 text-xs font-medium"><Switch aria-label={`Enable ${kind} segmentation`} disabled={!canManage} checked={draft.enabled[kind]} onCheckedChange={(enabled) => setDraft({ ...draft, enabled: { ...draft.enabled, [kind]: enabled } })} />{kind}</label>)}</div>
        <label className="flex items-center gap-2 text-xs font-medium"><Switch aria-label="Enable language personalization" disabled={!canManage} checked={draft.languageEnabled !== false} onCheckedChange={(languageEnabled) => setDraft({ ...draft, languageEnabled })} />Language preference</label>
        <div className="divide-y divide-border">{draft.rules.map((rule,index) => <div key={rule.id} className="space-y-2 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-5 shrink-0 text-xs text-muted-foreground">{index+1}.</span>
            <Switch aria-label={`Enable ${rule.name}`} checked={rule.enabled} disabled={!canManage || !draft.enabled[rule.kind]} onCheckedChange={(enabled) => patch(rule.id, { enabled })} />
            <span className="min-w-0 flex-1 text-xs font-semibold">{rule.name} <span className="font-normal text-muted-foreground">· {rule.kind}</span></span>
            <Btn variant="ghost" disabled={!canManage || index === 0} onClick={() => move(index,-1)}><ArrowUp className="size-3.5" /><span className="sr-only">Raise priority for {rule.name}</span></Btn>
            <Btn variant="ghost" disabled={!canManage || index === draft.rules.length-1} onClick={() => move(index,1)}><ArrowDown className="size-3.5" /><span className="sr-only">Lower priority for {rule.name}</span></Btn>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label={`Segment name (${index+1})`}><TextInput value={rule.name} disabled={!canManage} onChange={(name) => patch(rule.id, { name })} /></Field>
            {rule.combined ? <p className="text-xs text-muted-foreground sm:col-span-2">{segmentCriteria(rule)} · From existing mock customers; configure base criteria below.</p> : rule.kind === "Age group" ? <>
              <Field label={`Minimum age (${rule.name})`}><TextInput value={Number.isNaN(rule.minAge) ? "" : String(rule.minAge)} disabled={!canManage} onChange={(v) => patch(rule.id, { minAge: v.trim() ? Number(v) : NaN })} /></Field>
              <Field label={`Maximum age (${rule.name})`} hint="Empty = no upper limit"><TextInput value={rule.maxAge === null ? "" : String(rule.maxAge)} disabled={!canManage} onChange={(v) => patch(rule.id, { maxAge: v.trim() ? Number(v) : null })} /></Field>
            </> : <>
              <Field label={`Country (${rule.name})`}><SelectInput options={segmentCountries} value={rule.country} disabled={!canManage} onChange={(c) => patch(rule.id, { country: c, region: segmentRegions[c]?.[0] ?? "" })} /></Field>
              {rule.kind === "Region" && <Field label={`Region (${rule.name})`}><SelectInput options={segmentRegions[rule.country] ?? []} value={rule.region} disabled={!canManage} onChange={(r) => patch(rule.id, { region: r })} /></Field>}
            </>}
          </div>
        </div>)}</div>
        {canManage && <div className="flex flex-wrap gap-2">{(["Age group", "Country", "Region"] as SegmentKind[]).map((kind) => <Btn key={kind} onClick={() => setDraft({ ...draft, rules: [...draft.rules, { id: `segment-${crypto.randomUUID()}`, name: `New ${kind.toLowerCase()}`, kind, enabled: false, minAge: 18, maxAge: 24, country: "Canada", region: "Ontario" }] })}><Plus className="size-3.5" />Add {kind.toLowerCase()}</Btn>)}</div>}
        <section className="space-y-2 border-t border-border pt-3">
          <h4 className="text-xs font-semibold">Matching example · configuration preview</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label="Example age"><TextInput value={age} onChange={setAge} /></Field>
            <Field label="Example country"><SelectInput value={country} options={segmentCountries} onChange={(c) => { setCountry(c); setRegion(segmentRegions[c]?.[0] ?? ""); }} /></Field>
            <Field label="Example region"><SelectInput value={region} options={segmentRegions[country] ?? []} onChange={setRegion} /></Field>
            <Field label="Example language"><SelectInput value={language} options={["English", "French", "Arabic", "Unknown"]} onChange={setLanguage} /></Field>
          </div>
          <p className="text-xs text-muted-foreground">Matches: {matches.map((r) => r.name).join(" → ") || "None"}.</p>
          <p className="text-xs">Expected variant: <strong>{draft.rules.find((r) => r.id === selected)?.name ?? "Main / Default"}</strong>. Highest-priority matching available variant; rules without a version are skipped. Saved messages are finalized together when the workflow is approved.</p>
          <p className="text-xs text-muted-foreground">{selectedRule ? segmentCriteria(selectedRule) : "No available segment version matches."} No changes to workflow execution.</p>
        </section>
        {errors.length > 0 && <ul role="alert" className="space-y-1 text-xs text-destructive">{errors.map((e,i) => <li key={i}>{e}</li>)}</ul>}
        <p className="text-xs text-muted-foreground">Saving generates missing combined versions only for existing mock customer combinations. Unknown ages use Main / Default. Messages are finalized with workflow approval. Legal disclosures, payment terms and collection pressure stay identical.</p>
        <div className="flex flex-wrap justify-end gap-2"><Btn onClick={() => setOpen(false)}>Cancel</Btn><Btn variant="primary" disabled={!canManage || errors.length > 0} onClick={() => { onSave(draft); setOpen(false); }}>Save segments</Btn></div>
      </DialogContent>
    </Dialog>
  </>;
}