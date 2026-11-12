import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, AlertCircle, MailX } from "lucide-react";
import { brandingFor } from "@/lib/communication-data";
import { clientName } from "@/lib/payflow-data";
import { cn } from "@/lib/utils";
import { communicationForToken, confirmUnsubscribe, customerEmail, maskEmail, recordForToken, unsubscribeReasons, unsubscribeToken, useUnsubscribes, type UnsubscribeReason } from "@/lib/unsubscribe-data";

export const Route = createFileRoute("/unsubscribe/$token")({
  head: () => ({ meta: [
    { title: "Unsubscribe from Emails" }, { name: "description", content: "Manage your email reminder preferences." },
    { property: "og:title", content: "Unsubscribe from Emails" }, { property: "og:description", content: "Manage your email reminder preferences." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: UnsubscribePage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-start justify-center bg-surface px-4 py-10 sm:items-center"><div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">{children}</div></main>;
}

function UnsubscribePage() {
  const { token } = Route.useParams();
  useUnsubscribes();
  const comm = communicationForToken(token);
  const [reason, setReason] = useState<UnsubscribeReason | null>(null);
  const [comments, setComments] = useState("");
  const [done, setDone] = useState(false);
  if (!comm) return <Shell><AlertCircle className="size-8 text-warning" /><h1 className="mt-3 text-xl font-semibold">This link is invalid or has expired</h1><p className="mt-2 text-sm text-muted-foreground">For your security, unsubscribe links are unique and can expire. Please use the link in your most recent email, or contact the company that sent it.</p></Shell>;
  const name = clientName(comm.clientId); const brand = brandingFor(comm.clientId);
  const existing = recordForToken(unsubscribeToken(comm.id));
  if (done || existing) return <Shell><CheckCircle2 className="size-8 text-success" /><h1 className="mt-3 text-xl font-semibold">{done ? `You've been unsubscribed from email reminders from ${name}.` : "You're already unsubscribed"}</h1><p className="mt-2 text-sm text-muted-foreground">{done ? "It may take a short time for this to take effect. You may still receive messages required by law, and other ways of contact are not affected." : `${maskEmail(customerEmail(comm))} no longer receives email reminders from ${name}.`}</p></Shell>;
  return <Shell>
    <div className={cn("-mx-6 -mt-6 mb-5 rounded-t-xl px-6 py-3", brand.headerClass)}><p className="text-sm font-semibold">{brand.name}</p></div>
    <MailX className="size-7 text-primary" />
    <h1 className="mt-2 text-xl font-semibold">Unsubscribe from Emails</h1>
    <p className="mt-1 text-sm font-medium">{name}</p>
    <p className="text-sm text-muted-foreground">{maskEmail(customerEmail(comm))}</p>
    <p className="mt-4 text-sm">You can unsubscribe from email reminders from {name}.</p>
    <fieldset className="mt-5"><legend className="text-sm font-semibold">Why would you like to unsubscribe? <span className="font-normal text-muted-foreground">(optional)</span></legend>
      <div className="mt-2 space-y-1.5">{unsubscribeReasons.map(r => <label key={r} className={cn("flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm", reason === r ? "border-primary bg-primary/5" : "border-border")}><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />{r}</label>)}</div>
    </fieldset>
    <label className="mt-4 block text-sm font-semibold">Comments <span className="font-normal text-muted-foreground">(optional)</span>
      <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} maxLength={500} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal" /></label>
    <button onClick={() => { confirmUnsubscribe(comm, reason, comments); setDone(true); }} className="mt-5 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Confirm Unsubscribe</button>
  </Shell>;
}
