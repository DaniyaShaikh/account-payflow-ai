import { useState } from 'react';
import { Btn, FilterSelect, StatusPill } from './payflow-ui';
import { historicalExamples, percentage, reminderTypes } from '@/lib/email-subject-data';
export function EmailPerformanceSuggestions({ clientId, workflowId, purpose, subject, onSelect, canEdit=true, defaultStage='First reminder' }: { clientId:string; workflowId:string; purpose:string; subject?:string; onSelect:(subject:string)=>void; canEdit?:boolean; defaultStage?:string }) {
  const [stage,setStage]=useState(defaultStage);
  const [expanded,setExpanded]=useState(false);
  const history=historicalExamples(clientId,workflowId,stage,purpose);
  return <section className="mt-3 min-w-0 border-t border-border pt-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-semibold">Performance Insights</h3><StatusPill tone="ai">AI · Simulated</StatusPill></div>
    <div className="mt-2"><FilterSelect label="Reminder Stage" value={stage} options={reminderTypes} onChange={v=>{setStage(v);setExpanded(false);}}/></div>
    <p className="mt-2 text-[11px] text-muted-foreground">{history.scope} · {purpose}</p>
    <Btn className="mt-2" onClick={()=>setExpanded(v=>!v)}>{expanded?'Hide suggested subjects':'View suggested subjects'}</Btn>
    {expanded && <div className="mt-2 divide-y divide-border">{history.rows.length?history.rows.map((row,i)=>{
      const suggested=i===0?row.subject:`${row.subject} — review your options`;
      return <div key={row.subject} className="py-3"><p className="break-words text-xs font-semibold">{suggested}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{i===0?'Reuses a historically successful subject in this reminder context.':'A clearer payment-options variation of a historical example; this exact variation has not been measured.'}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{i===0?'Historical metrics':'Source subject metrics'}: {row.delivered} delivered · {percentage(row.openRate)} estimated opens · {percentage(row.clickRate)} clicks · {row.completed} completed payments · {percentage(row.conversion)} conversion.</p><Btn className="mt-2" disabled={!canEdit||subject===suggested} variant={subject===suggested?'primary':'secondary'} onClick={()=>onSelect(suggested)}>{subject===suggested?'Selected for draft':'Use this subject'}</Btn></div>;
    }):<p className="py-3 text-xs text-muted-foreground">No relevant historical data for this client, stage and purpose. No performance-backed suggestion is available.</p>}</div>}
    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Open rates are estimates. Outcomes also depend on body content and account context. All subject suggestions remain draft-only and require existing compliance checks, client policies and human approval.</p>
  </section>;
}
