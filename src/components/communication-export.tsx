import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Btn, StatusPill } from "@/components/payflow-ui";
import { clientName } from "@/lib/payflow-data";
import { subClientNameFor } from "@/lib/portfolio-data";
import {
  commSentDate,
  commStatusTone,
  fromEmailOf,
  recipientEmailOf,
  type Communication,
} from "@/lib/communication-data";

export interface ExportFilterSummary {
  client: string;
  subClients: string[];
  email: string;
  from: string;
  to: string;
}

function fmtDateTime(d: Date): string {
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${d.toTimeString().slice(0, 5)}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function reportHtml(rows: Communication[], f: ExportFilterSummary, generatedOn: string): string {
  const emails = rows
    .map((c) => {
      const sent = commSentDate(c);
      return `
      <div class="email">
        <div class="email-head">${escapeHtml(c.subject ?? c.purpose)} <span class="status">${escapeHtml(c.status)}</span></div>
        <table class="meta">
          <tr><td>Sent</td><td>${fmtDateTime(sent)}</td></tr>
          <tr><td>From</td><td>${escapeHtml(fromEmailOf(c))}</td></tr>
          <tr><td>To</td><td>${escapeHtml(recipientEmailOf(c))}</td></tr>
          <tr><td>Subject</td><td>${escapeHtml(c.subject ?? c.purpose)}</td></tr>
          <tr><td>Delivery status</td><td>${escapeHtml(c.status)}</td></tr>
        </table>
        <div class="body">${c.bodyLines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}</div>
      </div>`;
    })
    .join("");
  return `<!doctype html><html><head><title>Email Communication History</title><style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #17203a; margin: 32px; font-size: 13px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .summary { margin: 12px 0 24px; border: 1px solid #d8deea; border-radius: 8px; padding: 12px 16px; }
    .summary div { margin: 2px 0; }
    .summary span { color: #5a6480; }
    .email { border-top: 2px solid #17203a; padding: 14px 0 18px; page-break-inside: avoid; }
    .email-head { font-weight: 700; font-size: 14px; margin-bottom: 8px; }
    .status { font-weight: 500; font-size: 11px; color: #5a6480; margin-left: 8px; }
    table.meta { border-collapse: collapse; margin-bottom: 10px; }
    table.meta td { padding: 1px 12px 1px 0; font-size: 12px; }
    table.meta td:first-child { color: #5a6480; width: 110px; }
    .body { background: #f5f7fb; border-radius: 6px; padding: 10px 14px; }
    .body p { margin: 4px 0; }
  </style></head><body>
    <h1>Email Communication History</h1>
    <div class="summary">
      <div><span>Client:</span> ${escapeHtml(f.client)}</div>
      <div><span>Sub-Clients / Portfolios:</span> ${escapeHtml(f.subClients.length ? f.subClients.join(", ") : "All Sub-Clients / Portfolios")}</div>
      ${f.email ? `<div><span>Recipient:</span> ${escapeHtml(f.email)}</div>` : ""}
      <div><span>Date range:</span> ${escapeHtml(f.from || "Any")} – ${escapeHtml(f.to || "Any")}</div>
      <div><span>Total emails:</span> ${rows.length}</div>
      <div><span>Report generated on:</span> ${escapeHtml(generatedOn)}</div>
    </div>
    ${emails}
  </body></html>`;
}

export function CommunicationExport({
  open,
  onClose,
  rows,
  filters,
}: {
  open: boolean;
  onClose: () => void;
  rows: Communication[];
  filters: ExportFilterSummary;
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => commSentDate(a).getTime() - commSentDate(b).getTime()),
    [rows],
  );
  const generatedOn = fmtDateTime(new Date());

  const downloadPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(reportHtml(sorted, filters, generatedOn));
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Email Communication History</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-[12px]">
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <div><span className="text-muted-foreground">Client:</span> {filters.client}</div>
            <div>
              <span className="text-muted-foreground">Sub-Clients / Portfolios:</span>{" "}
              {filters.subClients.length ? filters.subClients.join(", ") : "All Sub-Clients / Portfolios"}
            </div>
            {filters.email && (
              <div><span className="text-muted-foreground">Recipient:</span> {filters.email}</div>
            )}
            <div>
              <span className="text-muted-foreground">Date range:</span>{" "}
              {filters.from || "Any"} – {filters.to || "Any"}
            </div>
            <div><span className="text-muted-foreground">Total emails:</span> {sorted.length}</div>
            <div><span className="text-muted-foreground">Report generated on:</span> {generatedOn}</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              No retained communications match the selected filters.
            </p>
          ) : (
            sorted.map((c) => (
              <div key={c.id} className="border-t-2 border-foreground/70 py-4 first:border-t-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-foreground">
                    {c.subject ?? c.purpose}
                  </span>
                  <StatusPill tone={commStatusTone(c.status)}>{c.status}</StatusPill>
                </div>
                <div className="mb-2 grid gap-x-6 gap-y-0.5 text-[12px] sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Sent:</span> {fmtDateTime(commSentDate(c))}
                  </div>
                  <div>
                    <span className="text-muted-foreground">From:</span> {fromEmailOf(c)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">To:</span> {recipientEmailOf(c)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account:</span> {c.reference} ·{" "}
                    {clientName(c.clientId)}
                    {subClientNameFor(c.clientId, c.accountId) !== "—" &&
                      ` · ${subClientNameFor(c.clientId, c.accountId)}`}
                  </div>
                </div>
                <div className="rounded-md bg-surface px-3 py-2 text-[12px] leading-relaxed text-foreground">
                  {c.bodyLines.map((l, i) => (
                    <p key={i} className="my-1">{l}</p>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Btn variant="secondary" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={downloadPdf} disabled={sorted.length === 0}>
            Download PDF
          </Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}
