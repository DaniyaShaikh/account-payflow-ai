import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Btn, Field, ToggleRow } from "./payflow-ui";
import { ComplianceResult } from "./compliance-common";
import { useRole } from "@/lib/role-context";
import { useCompliance } from "@/lib/compliance-context";
import { defaultEvaluation, emptyJurisdiction, type EvaluationResult } from "@/lib/compliance-data";

export function CommunicationCompliance({ clientId, channel, balance = 100, templateText = "" }: { clientId: string; channel: string; balance?: number; templateText?: string }) {
  const { allClients, isAdmin } = useRole(); const { evaluate } = useCompliance();
  const client = allClients.find(c => c.id === clientId);
  const [date, setDate] = useState("2026-11-09T15:00"); const [optedOut, setOptedOut] = useState(false); const [consent, setConsent] = useState(true);
  const [result, setResult] = useState<EvaluationResult | null>(null); const [outcome, setOutcome] = useState("");
  const check = () => {
    const input = { ...defaultEvaluation(clientId, client?.config.jurisdiction ?? emptyJurisdiction), channel, balance, at: date ? `${date}:00Z` : "", consent, optedOut, senderIdentified: !!client?.config.senderName, unsubscribeInstructions: /unsubscribe|STOP/i.test(templateText), templateApproved: true, messageText: templateText };
    return evaluate(input, true);
  };
  return <div className="space-y-3">
    <p className="text-xs text-muted-foreground">Illustrative recipient context · No real communication will be sent.</p>
    <Field label="Proposed Date and Time (UTC)"><input type="datetime-local" className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm" value={date} onChange={e => { setDate(e.target.value); setResult(null); setOutcome(""); }} /></Field>
    <ToggleRow label="Channel consent recorded" checked={consent} onChange={v => { setConsent(v); setResult(null); setOutcome(""); }} />
    <ToggleRow label="Customer opted out of this channel" checked={optedOut} onChange={v => { setOptedOut(v); setResult(null); setOutcome(""); }} />
    <div className="flex flex-wrap gap-2"><Btn onClick={() => { setResult(check()); setOutcome(""); }}>Check before execution</Btn>{isAdmin && <Btn variant="primary" onClick={() => {
      const value = check(); setResult(value);
      setOutcome(value.result === "Allowed" ? "Simulated communication approved for scheduling." : value.result === "Reschedule" && value.nextWindow ? "Held for the next eligible window; no send executed." : value.result === "Blocked" ? "Communication blocked; no send executed." : "Human review required; no send executed.");
    }}>Simulate scheduling</Btn>}</div>
    {result && <ComplianceResult value={result} />}{outcome && <p className="text-xs font-medium" role="status">{outcome}</p>}
    <Link to="/compliance" search={{ clientId }} className="inline-block text-xs font-semibold text-primary">View Effective Rules</Link>
  </div>;
}