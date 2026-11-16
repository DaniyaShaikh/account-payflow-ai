import { useState } from "react";
import { Check, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Btn, Field, SelectInput, StatusPill, TextArea, TextInput } from "./payflow-ui";
import { TemplatePreview } from "./strategy-step-editor";
import { EmailPerformanceSuggestions } from "./email-performance-suggestions";
import { CommunicationCompliance } from "./communication-compliance";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  initialCommunicationVersions, mockRegenerateVersion, removeCommunicationVersion,
  replaceCommunicationVersion, saveCommunicationVersion, validateCommunicationVersion,
  versionLabel, type CommunicationVersion,
} from "@/lib/communication-versions";
import type { NodeConfig, Strategy, StrategyNode } from "@/lib/strategy-data";
import { defaultCommunicationSegments, segmentCriteria, segmentIsActive } from "@/lib/communication-segments";
import { applyCommunicationSegments } from "@/lib/communication-versions";
import { CommunicationSegmentManager } from "./communication-segment-manager";
import { useRole } from "@/lib/role-context";

export function CommunicationVersionEditor({ strategy, node, canEdit, onChange, onDirtyChange }: {
  strategy: Strategy; node: StrategyNode; canEdit: boolean;
  onChange: (patch: NodeConfig) => void; onDirtyChange?: ((dirty: boolean) => void) | undefined;
}) {
  const versions = node.config.communicationVersions ?? initialCommunicationVersions(node);
  const segments = node.config.communicationSegments ?? defaultCommunicationSegments();
  const { can } = useRole();
  const canManage = canEdit && can("Modify / Guide AI Recommendation", strategy.clientId);
  const [selected, setSelected] = useState("default");
  const [draft, setDraft] = useState<CommunicationVersion | null>(null);
  const [preview, setPreview] = useState("Email");
  const [notice, setNotice] = useState("");
  const [addSegment, setAddSegment] = useState("");
  const saved = versions.find((v) => v.id === selected) ?? versions[0];
  if (!saved) return null;
  const value = draft ?? saved;
  const dirty = draft !== null;
  const updateVersions = (next: CommunicationVersion[]) => onChange({ communicationVersions: next });
  const edit = (patch: Partial<CommunicationVersion>) => {
    setDraft({ ...value, ...patch });
    if (!dirty) {
      updateVersions(replaceCommunicationVersion(versions, { ...saved, hasUnsavedChanges: true, status: saved.status === "Reviewed" ? "Pending Review" : "Modified" }));
      onDirtyChange?.(true);
    }
    setNotice("");
  };
  const clearDraft = () => { setDraft(null); onDirtyChange?.(false); };
  const discard = () => {
    updateVersions(replaceCommunicationVersion(versions, { ...saved, hasUnsavedChanges: false }));
    clearDraft();
  };
  const switchVersion = (id: string) => {
    if (dirty && !window.confirm("You have unsaved changes. Discard them and switch versions?")) return;
    if (dirty) discard();
    setSelected(id); setNotice("");
  };
  const errors = validateCommunicationVersion({ ...value, hasUnsavedChanges: false });
  const rule = segments.rules.find((r) => r.id === saved.id);
  const active = segmentIsActive(segments, saved.id);
  const label = (id: string) => versionLabel(id, segments);
  const addable = segments.rules.filter((r) => segmentIsActive(segments, r.id) && !versions.some((v) => v.id === r.id));
  const contextValue = (pattern: RegExp) => strategy.aiContext.filter((c) => pattern.test(c.label)).map((c) => `${c.label}: ${c.value}`).join(" · ");
  const context = [
    { label: "Age group", value: rule?.kind === "Age group" ? segmentCriteria(rule) : "Not used for this version" },
    { label: "Country / Region", value: rule && rule.kind !== "Age group" ? segmentCriteria(rule) : contextValue(/country|region/i) || strategy.segment?.postalRegion || "Not available" },
    { label: "Outstanding balance", value: contextValue(/balance/i) || strategy.segment?.balanceBand || "Not available" },
    { label: "Reminder stage", value: node.config.reminderStage ?? node.config.purpose ?? "Payment Reminder" },
    { label: "Communication history & preferences", value: contextValue(/communication|channel|engagement|preference/i) || "Not available" },
    { label: "Payment arrangement status", value: contextValue(/arrangement|payment plan/i) || "Not available — no arrangement assumed" },
  ];
  return <div className="min-w-0 space-y-3 border-t border-border pt-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-xs font-semibold">Communication versions</h3>
      <StatusPill tone={saved.status === "Reviewed" && !dirty ? "success" : "warning"}>{dirty ? "Unsaved changes" : saved.status}</StatusPill>
      <CommunicationSegmentManager config={segments} availableIds={versions.map((v) => v.id)} canManage={canManage} blocked={dirty} onSave={(next) => {
        onChange({ communicationSegments: next, communicationVersions: applyCommunicationSegments(versions, segments, next) });
        setNotice("Segments saved. Changed or re-enabled versions require review.");
      }} />
    </div>
    <Field label="Selected version">
      <SelectInput value={`${label(saved.id)}${active ? "" : " · Disabled"}`} options={versions.map((v) => `${label(v.id)}${segmentIsActive(segments,v.id) ? "" : " · Disabled"}`)}
        onChange={(name) => { const version = versions.find((v) => `${label(v.id)}${segmentIsActive(segments,v.id) ? "" : " · Disabled"}` === name); if (version) switchVersion(version.id); }} />
    </Field>
    <p className="text-[11px] text-muted-foreground">{saved.id === "default" ? "Fallback when no available segment version matches." : rule ? segmentCriteria(rule) : "Segment criteria unavailable"}{!active && " · Disabled; excluded from approval requirements."}</p>
    {canEdit && addable.length > 0 && <div className="flex flex-wrap items-end gap-2">
      <Field label="Add communication variant" className="min-w-0 flex-1"><SelectInput value={addable.some((r) => r.id === addSegment) ? label(addSegment) : "Choose a segment"} options={["Choose a segment", ...addable.map((r) => r.name)]} disabled={dirty} onChange={(name) => setAddSegment(addable.find((r) => r.name === name)?.id ?? "")} /></Field>
      <Btn disabled={dirty || !addable.some((r) => r.id === addSegment)} onClick={() => {
        const base = versions.find((v) => v.id === "default");
        if (!base || !addable.some((r) => r.id === addSegment)) return;
        updateVersions([...versions, { ...mockRegenerateVersion({ ...base, id: addSegment }), explanation: `Simulated AI explanation: ${label(addSegment)} uses neutral, clear wording from the approved context. Shared disclosures, terms and collection pressure remain unchanged.` }]);
        setSelected(addSegment); setAddSegment(""); setNotice("Variant added. Review is required before approval.");
      }}><Plus className="size-3.5" />Add variant</Btn>
    </div>}
    <details className="border-t border-border pt-2">
      <summary className="cursor-pointer text-xs font-semibold">Personalization Context · simulated</summary>
      <dl className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">{context.map((c) => <div key={c.label} className="min-w-0"><dt className="font-medium">{c.label}</dt><dd className="break-words text-muted-foreground">{c.value}</dd></div>)}</dl>
      <p className="mt-2 text-[11px] text-muted-foreground">Available context informs mock wording, not separate combinations. Unavailable customer information is not inferred; disclosures, terms and pressure remain unchanged.</p>
    </details>
    <Field label="Email Subject"><TextInput value={value.subject} disabled={!canEdit} onChange={(subject) => edit({ subject })} /></Field>
    <Field label="Email Body"><TextArea value={value.emailBody} disabled={!canEdit} onChange={(emailBody) => edit({ emailBody })} /></Field>
    <Field label="SMS Content"><TextArea value={value.smsContent} disabled={!canEdit} onChange={(smsContent) => edit({ smsContent })} /></Field>
    <details className="rounded-lg border border-border p-2.5">
      <summary className="cursor-pointer text-xs font-semibold text-ai">AI Explanation · simulated</summary>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{value.explanation}</p>
    </details>
    {errors.length > 0 && <p role="alert" className="text-xs text-destructive">{errors.join(" ")}</p>}
    <div className="flex flex-wrap gap-2">
      <Btn disabled={!canEdit || !dirty || errors.length > 0} onClick={() => {
        updateVersions(replaceCommunicationVersion(versions, saveCommunicationVersion(saved, value)));
        clearDraft(); setNotice("Version saved. Review is required before approval.");
      }}><Save className="size-3.5" />Save version</Btn>
      {dirty && <Btn onClick={discard}>Discard changes</Btn>}
      <Btn disabled={!canEdit} onClick={() => {
        if (dirty && !window.confirm("Discard unsaved changes and regenerate only this version?")) return;
        updateVersions(replaceCommunicationVersion(versions, mockRegenerateVersion(saved)));
        clearDraft(); setNotice("This version was regenerated using mock content. Review is required.");
      }}><RotateCcw className="size-3.5" />Regenerate</Btn>
      <Btn disabled={!canEdit || !active || dirty || errors.length > 0 || saved.status === "Reviewed"} onClick={() => {
        updateVersions(replaceCommunicationVersion(versions, { ...saved, status: "Reviewed", hasUnsavedChanges: false }));
        setNotice("Version validated and marked Reviewed.");
      }}><Check className="size-3.5" />Mark Reviewed</Btn>
      {saved.id !== "default" && <Btn variant="danger" disabled={!canEdit} onClick={() => {
        if (!window.confirm(`Remove ${label(saved.id)}? Customers without a matching approved version use Main / Default.${dirty ? " Unsaved changes will be discarded." : ""}`)) return;
        updateVersions(removeCommunicationVersion(versions, saved.id)); clearDraft(); setSelected("default"); setNotice("Optional version removed.");
      }}><Trash2 className="size-3.5" />Remove version</Btn>}
    </div>
    {notice && <p role="status" className="text-xs text-primary">{notice}</p>}
    <Tabs value={preview} onValueChange={setPreview}>
      <TabsList><TabsTrigger value="Email">Email preview</TabsTrigger><TabsTrigger value="SMS">SMS preview</TabsTrigger></TabsList>
    </Tabs>
    <TemplatePreview node={node} content={{ name: `${label(saved.id)} · ${preview}`, channel: preview, subject: preview === "Email" ? value.subject : undefined, body: preview === "Email" ? value.emailBody : value.smsContent }} />
    <details className="border-t border-border pt-2">
      <summary className="cursor-pointer text-xs font-semibold text-primary">Compliance execution preview</summary>
      <div className="mt-3"><CommunicationCompliance clientId={strategy.clientId} channel={preview} templateText={preview === "Email" ? `${value.subject}\n${value.emailBody}` : value.smsContent} /></div>
    </details>
    <details className="border-t border-border pt-2">
      <summary className="cursor-pointer text-xs font-semibold">Performance insights</summary>
      <EmailPerformanceSuggestions clientId={strategy.clientId} workflowId={strategy.id} purpose={node.config.purpose ?? "Payment Reminder"} subject={value.subject} canEdit={canEdit} onSelect={(subject) => edit({ subject })} />
    </details>
    <div className="border-t border-border pt-3">
      <h4 className="mb-2 text-xs font-semibold">Version Review Summary</h4>
      <ul className="space-y-1.5">{versions.map((v) => <li key={v.id} className="flex items-center justify-between gap-2 text-xs">
        <span>{label(v.id)}</span><StatusPill tone={!segmentIsActive(segments,v.id) ? "neutral" : v.status === "Reviewed" && !v.hasUnsavedChanges ? "success" : "warning"}>{segmentIsActive(segments,v.id) ? v.status : "Disabled"}</StatusPill>
      </li>)}</ul>
    </div>
  </div>;
}