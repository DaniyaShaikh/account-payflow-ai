import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { DataTable, Td, Tr, StatusPill, SearchInput, FilterSelect, KpiCard, Panel, EmptyState, Btn } from "./payflow-ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { useRole } from "@/lib/role-context";
import { clientName } from "@/lib/payflow-data";
import { reviewReasons, unsubscribeReasons, unsubscribeStatuses, useUnsubscribes, type UnsubscribeRecord } from "@/lib/unsubscribe-data";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const ranges = ["All Dates", "Today", "Last 7 Days", "This Month"];

export function UnsubscribersPanel() {
  const all = useUnsubscribes();
  const { visibleClients, canSeeClient } = useRole();
  const rows = all.filter(r => canSeeClient(r.clientId));
  const [q, setQ] = useState(""); const [client, setClient] = useState("All Clients");
  const [range, setRange] = useState("All Dates"); const [reason, setReason] = useState("All Reasons"); const [status, setStatus] = useState("All Statuses");
  const [open, setOpen] = useState<UnsubscribeRecord | null>(null);
  const now = new Date();
  const filtered = useMemo(() => rows.filter(r => {
    const d = new Date(r.at);
    if (q && !`${r.customer} ${r.email} ${r.reference} ${r.subject}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (client !== "All Clients" && clientName(r.clientId) !== client) return false;
    if (reason !== "All Reasons" && (r.reason ?? "No reason given") !== reason) return false;
    if (status !== "All Statuses" && r.status !== status) return false;
    if (range === "Today" && !sameDay(d, now)) return false;
    if (range === "Last 7 Days" && now.getTime() - d.getTime() > 7 * 86400000) return false;
    if (range === "This Month" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
    return true;
  }), [rows, q, client, range, reason, status]);
  const active = rows.filter(r => r.status !== "Resubscribed");
  return <>
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <KpiCard label="Total Unsubscribers" value={String(active.length)} />
      <KpiCard label="Unsubscribed Today" value={String(active.filter(r => sameDay(new Date(r.at), now)).length)} tone="primary" />
      <KpiCard label="Unsubscribed This Month" value={String(active.filter(r => { const d = new Date(r.at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length)} />
    </div>
    <Panel title="Unsubscribers" description="Customers who unsubscribed from email reminders. Suppression applies to that Client's emails only; records are kept for audit.">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Customer, email or reference" className="w-64" />
        <FilterSelect label="Client" value={client} onChange={setClient} options={["All Clients", ...visibleClients.map(c => c.name)]} />
        <FilterSelect label="Date" value={range} onChange={setRange} options={ranges} />
        <FilterSelect label="Reason" value={reason} onChange={setReason} options={["All Reasons", ...unsubscribeReasons, "No reason given"]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={["All Statuses", ...unsubscribeStatuses]} />
      </div>
      {!filtered.length ? <EmptyState title="No unsubscribers match these filters" /> :
      <DataTable minWidth={1500} head={["Customer Name", "Email Address", "Client", "Sub-Client / Portfolio", "Account Reference", "Email Subject / Communication", "Sent From (Sender Address)", "Unsubscribe Reason", "Unsubscribed", "Status", ""]}>
        {filtered.map(r => <Tr key={r.id}>
          <Td className="font-medium">{r.customer}</Td><Td>{r.email}</Td><Td>{clientName(r.clientId)}</Td><Td>{r.subClient}</Td><Td>{r.reference}</Td>
          <Td className="max-w-[240px] whitespace-normal">{r.subject}<div className="text-[11px] text-muted-foreground">{r.communicationId.startsWith("seed") ? r.id : r.communicationId}</div></Td>
          <Td>{r.senderAddress}</Td>
          <Td className="max-w-[220px] whitespace-normal">{r.reason ?? <span className="text-muted-foreground">No reason given</span>}{r.reason && reviewReasons.includes(r.reason) && <div className="mt-1"><StatusPill tone="warning">Needs review</StatusPill></div>}</Td>
          <Td>{fmt(r.at)}</Td>
          <Td><StatusPill tone={r.status === "Under Review" ? "warning" : r.status === "Resubscribed" ? "neutral" : "danger"}>{r.status}</StatusPill></Td>
          <Td><Btn onClick={() => setOpen(r)}>View Details</Btn></Td>
        </Tr>)}
      </DataTable>}
    </Panel>
    <Sheet open={!!open} onOpenChange={o => !o && setOpen(null)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {open && <>
          <SheetHeader><SheetTitle>{open.customer}</SheetTitle><SheetDescription>{open.id} · {open.status}</SheetDescription></SheetHeader>
          {open.reason && reviewReasons.includes(open.reason) && <p className="mt-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[13px]">Review required: the customer said “{open.reason}”. Check payments or account ownership before any further contact.</p>}
          <dl className="mt-4 divide-y divide-border text-[13px]">
            {([["Email", open.email], ["Client", clientName(open.clientId)], ["Sub-Client / Portfolio", open.subClient], ["Account Reference", open.reference], ["Originating email", open.subject], ["Sent from", open.senderAddress], ["Reason", open.reason ?? "No reason given"], ["Comments", open.comments || "—"], ["Unsubscribed", fmt(open.at)], ["Suppression scope", `Email reminders from ${clientName(open.clientId)} only. SMS and other Clients are not affected.`]] as const).map(([k, v]) =>
              <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
          </dl>
          <h4 className="mt-5 text-sm font-semibold">History</h4>
          <ol className="mt-2 space-y-2 text-[13px]">{open.history.map((h, i) => <li key={i}><span className="font-medium">{h.label}</span><div className="text-xs text-muted-foreground">{fmt(h.at)}</div></li>)}</ol>
          <p className="mt-5 text-xs text-muted-foreground">Records are kept for audit. Resubscribing requires the customer's documented consent through an authorized process.</p>
          {!open.communicationId.startsWith("seed") && <Link to="/communications/$communicationId" params={{ communicationId: open.communicationId }} className="mt-3 inline-block text-[13px] font-medium text-primary">Open originating communication →</Link>}
        </>}
      </SheetContent>
    </Sheet>
  </>;
}
