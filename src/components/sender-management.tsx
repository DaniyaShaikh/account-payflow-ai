import { useState } from "react";
import { Copy, MoreHorizontal, Check } from "lucide-react";
import { Btn, Panel, DataTable, Field, StatusPill, Td, TextInput, Tr, type Tone } from "@/components/payflow-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ClientConfig } from "@/lib/payflow-data";
import { useRole } from "@/lib/role-context";
import {
  canRemoveEligible, dnsRecordsFor, domainOf, domainStatusOf, eligibleSenders, getEmailSetup, isEligible,
  isValidEmail, isVerified, primarySender, setPrimary, webhookUrlFor,
  accountEmailEligibility, accountSenderOverrides, resolveSender,
  type DomainStatus, type EmailSetup, type SenderAuditEntry, type SenderIdentity,
} from "@/lib/sender-data";

const now = () =>
  new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", "").replace(/, /, " · ");

export function domainTone(s: DomainStatus): Tone {
  return s === "Verified" ? "success" : s === "Verifying" ? "info" : s === "DNS Pending" ? "warning" : "danger";
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy"
      className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-primary"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function Notice({ tone, children }: { tone: "info" | "warning" | "danger" | "success"; children: React.ReactNode }) {
  const cls = {
    info: "border-info/20 bg-info/5 text-foreground",
    warning: "border-warning/30 bg-warning/10 text-foreground",
    danger: "border-destructive/25 bg-destructive/5 text-destructive",
    success: "border-success/25 bg-success/5 text-foreground",
  }[tone];
  return <p className={`rounded-md border px-3 py-2 text-[12px] leading-relaxed ${cls}`}>{children}</p>;
}

export function EmailSenderConfig({
  clientId, config, patchConfig,
}: { clientId: string; config: ClientConfig; patchConfig: (p: Partial<ClientConfig>) => void }) {
  const { isAdmin, userName: user } = useRole();
  const setup = getEmailSetup(clientId, config);
  const readOnly = !isAdmin;
  const emailOn = config.channels.email;

  const save = (next: EmailSetup, audit?: Omit<SenderAuditEntry, "at" | "user">) => {
    const withAudit = audit ? { ...next, audit: [{ at: now(), user, ...audit }, ...next.audit] } : next;
    const p = primarySender(withAudit);
    patchConfig({ emailSetup: withAudit, ...(p ? { emailFrom: p.email } : {}) });
  };

  const [apiKey, setApiKey] = useState("");
  const [hookKey, setHookKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger" | "warning" | "info"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<null | "rotate" | "disconnect" | { kind: "delete"; id: string }>(null);
  const [editing, setEditing] = useState<SenderIdentity | "new" | null>(null);
  const [dnsDomain, setDnsDomain] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const sg = setup.sendgrid;
  const configured = sg.status !== "Not Configured";

  const connect = () => {
    if (apiKey.trim().length < 10) return setMsg({ tone: "danger", text: "Enter a valid SendGrid API key (it usually starts with “SG.”)." });
    if (!hookKey.trim()) return setMsg({ tone: "danger", text: "Enter the Event Webhook verification key." });
    setBusy("connect");
    setTimeout(() => {
      const ok = apiKey.trim().startsWith("SG.");
      save(
        {
          ...setup,
          sendgrid: {
            status: ok ? "Connected" : "Connection Failed",
            apiKeyHint: `SG.••••••••••••${apiKey.trim().slice(-4)}`,
            webhookKeyHint: `••••••••••••${hookKey.trim().slice(-4)}`,
            webhookStatus: ok ? "Receiving Events" : "Not Receiving",
            lastCheck: now(),
            error: ok ? null : "401 Unauthorized — SendGrid rejected this API key. Check that it is active and has Mail Send access.",
          },
        },
        { action: rotating ? "Credentials rotated" : "SendGrid connected", next: ok ? "Connected" : "Connection Failed" },
      );
      setApiKey(""); setHookKey(""); setBusy(null); setRotating(false);
      setMsg(ok ? { tone: "success", text: "SendGrid connected. Credentials are stored securely and are no longer shown." } : { tone: "danger", text: "Connection failed. See the error details below." });
    }, 900);
  };

  const test = () => {
    setBusy("test");
    setTimeout(() => {
      const ok = sg.status === "Connected" || !!sg.apiKeyHint?.startsWith("SG.") && sg.status !== "Connection Failed";
      save({ ...setup, sendgrid: { ...sg, lastCheck: now(), status: ok ? "Connected" : "Connection Failed" } });
      setBusy(null);
      setMsg(ok ? { tone: "success", text: "Connection test passed. SendGrid accepted the credentials." } : { tone: "danger", text: "Connection test failed. Rotate the credentials with a valid API key." });
    }, 800);
  };

  const checkDomain = (domain: string) => {
    setBusy(`dns:${domain}`);
    save({ ...setup, domains: setup.domains.map((d) => (d.domain === domain ? { ...d, status: "Verifying" } : d)) });
    setTimeout(() => {
      // Mock: a domain verifies on the second check; provider failure blocks verification.
      const prev = setup.domains.find((d) => d.domain === domain);
      const status: DomainStatus = sg.status !== "Connected" ? "Provider Connection Failed" : prev?.lastCheck ? "Verified" : "DNS Pending";
      const stamp = now();
      save(
        {
          ...setup,
          domains: setup.domains.map((d) => (d.domain === domain ? { ...d, status, lastCheck: stamp } : d)),
          senders: setup.senders.map((s) => (domainOf(s.email) === domain && status === "Verified" ? { ...s, lastVerified: stamp.split(" · ")[0] ?? stamp } : s)),
        },
        { action: "Domain verification updated", previous: prev?.status, next: `${domain} · ${status}` },
      );
      setBusy(null);
    }, 1000);
  };

  const toggle = (s: SenderIdentity) => {
    if (s.enabled && !canRemoveEligible(setup, s.id, emailOn))
      return setMsg({ tone: "warning", text: "This is the last eligible sender. Add or enable another verified sender before disabling it." });
    if (!s.enabled && !isVerified(setup, s))
      return setMsg({ tone: "warning", text: "Unverified senders cannot be enabled. Complete DNS authentication first." });
    if (s.enabled && s.primary)
      return setMsg({ tone: "warning", text: "Set another eligible sender as Primary before disabling the Primary sender." });
    save({ ...setup, senders: setup.senders.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)) }, { action: s.enabled ? "Sender disabled" : "Sender enabled", next: s.email });
    setMsg(null);
  };

  const makePrimary = (s: SenderIdentity) => {
    if (!isVerified(setup, s) || !s.enabled) return setMsg({ tone: "warning", text: "Only verified and enabled senders can be Primary." });
    save(setPrimary(setup, s.id), { action: "Primary sender changed", previous: primarySender(setup)?.email, next: s.email });
    setMsg({ tone: "success", text: `${s.email} is now the Primary sender.` });
  };

  const move = (s: SenderIdentity, dir: -1 | 1) => {
    const sorted = [...setup.senders].sort((a, b) => a.priority - b.priority);
    const i = sorted.findIndex((x) => x.id === s.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const [a, b] = [sorted[i]!, sorted[j]!];
    save(
      { ...setup, senders: setup.senders.map((x) => (x.id === a.id ? { ...x, priority: b.priority } : x.id === b.id ? { ...x, priority: a.priority } : x)) },
      { action: "Failover priority changed", previous: `${a.email} · ${a.priority}`, next: `${a.email} · ${b.priority}` },
    );
  };

  const remove = (id: string) => {
    const s = setup.senders.find((x) => x.id === id);
    if (!s) return;
    const rest = setup.senders.filter((x) => x.id !== id);
    save(
      { ...setup, senders: rest, domains: setup.domains.filter((d) => rest.some((r) => domainOf(r.email) === d.domain)) },
      { action: "Sender removed", previous: s.email },
    );
  };

  const sorted = [...setup.senders].sort((a, b) => a.priority - b.priority);
  const eligible = eligibleSenders(setup);
  const verifiedCount = setup.senders.filter((s) => isVerified(setup, s)).length;
  const enabledCount = setup.senders.filter((s) => s.enabled).length;
  const sgTone: Tone = sg.status === "Connected" ? "success" : sg.status === "Connection Failed" ? "danger" : "neutral";

  return (
    <div className="space-y-4" id="email-senders">
      {/* A. SendGrid */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[13px] font-semibold text-foreground">SendGrid Integration</p>
            <p className="text-[11px] text-muted-foreground">One SendGrid account per client — shared by all sender emails.</p>
          </div>
          <StatusPill tone={sgTone} dot>{sg.status}</StatusPill>
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Provider</dt><dd className="font-medium">SendGrid</dd></div>
          <div><dt className="text-muted-foreground">Last Connection Check</dt><dd className="font-medium">{sg.lastCheck ?? "—"}</dd></div>
          {configured && !rotating && (
            <>
              <div><dt className="text-muted-foreground">API Key</dt><dd className="font-mono">{sg.apiKeyHint} · Configured</dd></div>
              <div><dt className="text-muted-foreground">Webhook Verification Key</dt><dd className="font-mono">{sg.webhookKeyHint} · Configured</dd></div>
              <div><dt className="text-muted-foreground">Webhook Status</dt><dd className="font-medium">{sg.webhookStatus}</dd></div>
            </>
          )}
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Event Webhook URL</dt>
            <dd className="flex min-w-0 items-center gap-1 font-mono text-[11px]"><span className="truncate">{webhookUrlFor(clientId)}</span><CopyBtn text={webhookUrlFor(clientId)} /></dd>
          </div>
        </dl>
        {sg.error && <div className="mt-3"><Notice tone="danger">{sg.error}</Notice></div>}

        {(!configured || rotating) && !readOnly && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="API Key"><input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="SG.xxxxxxxx" className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none focus:border-primary" /></Field>
              <Field label="Webhook Verification Key"><input type="password" autoComplete="off" value={hookKey} onChange={(e) => setHookKey(e.target.value)} placeholder="Signed Event Webhook public key" className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none focus:border-primary" /></Field>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              In SendGrid, create an API key under <b>Settings → API Keys</b> with Mail Send access. Under <b>Settings → Mail Settings → Event Webhook</b>, paste the Event Webhook URL above, enable Signed Event Webhook, and copy its verification key here.
            </p>
            <div className="flex gap-2">
              <Btn variant="primary" onClick={connect} disabled={busy === "connect"}>{busy === "connect" ? "Connecting…" : rotating ? "Save New Credentials" : "Connect SendGrid"}</Btn>
              {rotating && <Btn variant="ghost" onClick={() => setRotating(false)}>Cancel</Btn>}
            </div>
          </div>
        )}
        {configured && !rotating && !readOnly && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
            <Btn onClick={test} disabled={busy === "test"}>{busy === "test" ? "Testing…" : "Test Connection"}</Btn>
            <Btn onClick={() => setConfirm("rotate")}>Rotate Credentials</Btn>
            <Btn variant="danger" onClick={() => setConfirm("disconnect")}>Disconnect</Btn>
          </div>
        )}
      </div>

      {/* B. Senders */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Sender Email Addresses</p>
            <p className="text-[11px] text-muted-foreground">
              {setup.senders.length} total · {verifiedCount} verified · {enabledCount} enabled
            </p>
          </div>
          {!readOnly && (
            <Btn variant="primary" disabled={!configured} onClick={() => setEditing("new")}>Add Sender Email</Btn>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          PayFlow uses the Primary sender by default. Alternative verified and enabled senders may be selected when the Primary sender is unavailable and communication remains permitted.
        </p>
        {!configured && <div className="mt-3"><Notice tone="info">Connect SendGrid before adding sender emails.</Notice></div>}
        {emailOn && configured && eligible.length === 0 && (
          <div className="mt-3"><Notice tone="warning">No eligible sender is available. Email communications for this client will be blocked until a verified, enabled sender exists.</Notice></div>
        )}
        {msg && <div className="mt-3"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

        {setup.senders.length > 0 && (
          <div className="mt-3">
            <DataTable minWidth={900} head={["From Email", "Display Name", "Domain", "Verification", "Role", "Priority", "Enabled", "Last Verified", ""]}>
              {sorted.map((s, idx) => {
                const ds = domainStatusOf(setup, s.email);
                return (
                  <Tr key={s.id}>
                    <Td><span className="font-medium">{s.email}</span>{s.migrated && <span className="ml-1.5 text-[10px] text-muted-foreground">(migrated)</span>}</Td>
                    <Td>{s.displayName}</Td>
                    <Td className="text-muted-foreground">{domainOf(s.email)}</Td>
                    <Td><StatusPill tone={domainTone(ds)}>{ds}</StatusPill></Td>
                    <Td>{s.primary ? <StatusPill tone="info">Primary</StatusPill> : <span className="text-muted-foreground">Secondary</span>}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 tabular">
                        {s.priority}
                        {!readOnly && (
                          <>
                            <button type="button" aria-label="Move up" disabled={idx === 0} className="px-1 text-muted-foreground hover:text-primary disabled:opacity-30" onClick={() => move(s, -1)}>↑</button>
                            <button type="button" aria-label="Move down" disabled={idx === sorted.length - 1} className="px-1 text-muted-foreground hover:text-primary disabled:opacity-30" onClick={() => move(s, 1)}>↓</button>
                          </>
                        )}
                      </span>
                    </Td>
                    <Td>
                      <button type="button" disabled={readOnly} aria-pressed={s.enabled} aria-label={`Toggle ${s.email}`} onClick={() => toggle(s)}
                        className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${s.enabled ? "bg-primary" : "border border-border bg-secondary"}`}>
                        <span className={`absolute top-0.5 size-4 rounded-full bg-card shadow-sm transition-all ${s.enabled ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </Td>
                    <Td className="text-muted-foreground">{s.lastVerified ?? "—"}</Td>
                    <Td>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="rounded p-1 text-muted-foreground hover:bg-surface" aria-label={`Actions for ${s.email}`}><MoreHorizontal className="size-4" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDnsDomain(domainOf(s.email))}>View DNS Records</DropdownMenuItem>
                          {!readOnly && (
                            <>
                              <DropdownMenuItem onClick={() => checkDomain(domainOf(s.email))}>Check Verification Status</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditing(s)}>Edit Sender Details</DropdownMenuItem>
                              {!s.primary && <DropdownMenuItem onClick={() => makePrimary(s)}>Set as Primary</DropdownMenuItem>}
                              <DropdownMenuItem onClick={() => toggle(s)}>{s.enabled ? "Disable" : "Enable"}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => {
                                if (s.primary) return setMsg({ tone: "warning", text: "Set another eligible sender as Primary before deleting the Primary sender." });
                                if (!canRemoveEligible(setup, s.id, emailOn)) return setMsg({ tone: "warning", text: "This is the last eligible sender and cannot be deleted while Email is enabled." });
                                setConfirm({ kind: "delete", id: s.id });
                              }}>Delete Sender</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Td>
                  </Tr>
                );
              })}
            </DataTable>
          </div>
        )}
        {setup.audit.length > 0 && (
          <div className="mt-3">
            <button type="button" className="text-[12px] font-medium text-primary hover:underline" onClick={() => setShowAudit((v) => !v)}>
              {showAudit ? "Hide" : "Show"} sender change history ({setup.audit.length})
            </button>
            {showAudit && (
              <ul className="mt-2 divide-y divide-border rounded-md border border-border text-[12px]">
                {setup.audit.map((a, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                    <span><b>{a.action}</b>{a.previous && <> · <span className="text-muted-foreground line-through">{a.previous}</span></>}{a.next && <> → {a.next}</>}</span>
                    <span className="text-muted-foreground">{a.user} · {a.at}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {editing && (
        <SenderDialog
          setup={setup}
          sender={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(s, isNew) => {
            const domain = domainOf(s.email);
            const known = setup.domains.some((d) => d.domain === domain);
            let next: EmailSetup = {
              ...setup,
              senders: isNew ? [...setup.senders, s] : setup.senders.map((x) => (x.id === s.id ? s : x)),
              domains: known ? setup.domains : [...setup.domains, { domain, status: "DNS Pending", lastCheck: null }],
            };
            if (s.primary) next = setPrimary(next, s.id);
            save(next, isNew ? { action: "Sender added", next: s.email } : { action: "Sender details edited", next: `${s.email} · ${s.displayName}` });
            setEditing(null);
            const verified = domainStatusOf(next, s.email) === "Verified";
            setMsg(verified
              ? { tone: "success", text: `${s.email} uses the already-verified domain ${domain}, so it is ready to send.` }
              : { tone: "warning", text: `${domain} needs DNS authentication. ${s.email} stays unavailable for sending until it is verified.` });
            if (isNew && !verified && !known) setDnsDomain(domain);
          }}
        />
      )}

      {dnsDomain && (
        <DnsDialog
          clientId={clientId} setup={setup} domain={dnsDomain} readOnly={readOnly}
          checking={busy === `dns:${dnsDomain}`}
          onCheck={() => checkDomain(dnsDomain)} onClose={() => setDnsDomain(null)}
        />
      )}

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "rotate" ? "Rotate SendGrid credentials?" : confirm === "disconnect" ? "Disconnect SendGrid?" : "Delete this sender?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "rotate"
                ? "You will enter a new API key and webhook verification key. Emails queued while the new key is being saved may be delayed. Revoke the old key in SendGrid afterwards."
                : confirm === "disconnect"
                  ? "All email communications for this client will stop until SendGrid is reconnected. Scheduled and adaptive emails will be blocked; sender identities are kept."
                  : "The sender will no longer be used. Past communications keep the sender they were actually sent from."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm === "rotate") setRotating(true);
                else if (confirm === "disconnect") {
                  save({ ...setup, sendgrid: { status: "Not Configured", apiKeyHint: null, webhookKeyHint: null, webhookStatus: "Unknown", lastCheck: now(), error: null } }, { action: "SendGrid disconnected", previous: "Connected" });
                  setMsg({ tone: "warning", text: "SendGrid disconnected. Email sending is blocked for this client." });
                } else if (confirm) remove(confirm.id);
                setConfirm(null);
              }}
            >
              {confirm === "rotate" ? "Continue" : confirm === "disconnect" ? "Disconnect" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SenderDialog({ setup, sender, onClose, onSave }: {
  setup: EmailSetup; sender: SenderIdentity | null; onClose: () => void; onSave: (s: SenderIdentity, isNew: boolean) => void;
}) {
  const [email, setEmail] = useState(sender?.email ?? "");
  const [name, setName] = useState(sender?.displayName ?? "");
  const [priority, setPriority] = useState(String(sender?.priority ?? setup.senders.length + 1));
  const [primary, setPrimaryFlag] = useState(sender?.primary ?? false);
  const [err, setErr] = useState<string | null>(null);
  const domain = domainOf(email);
  const ds = domain ? domainStatusOf(setup, email) : null;
  const knownDomain = setup.domains.some((d) => d.domain === domain);
  const canPrimary = ds === "Verified";

  const submit = () => {
    const e = email.trim().toLowerCase();
    if (!isValidEmail(e)) return setErr("Enter a valid email address, e.g. collections@yourdomain.com.");
    if (setup.senders.some((s) => s.email.toLowerCase() === e && s.id !== sender?.id)) return setErr("This sender email already exists for this client.");
    if (!name.trim()) return setErr("Display name is required.");
    const p = Number(priority);
    if (!Number.isInteger(p) || p < 1) return setErr("Failover priority must be a whole number of 1 or more.");
    onSave({
      id: sender?.id ?? `snd-${Date.now()}`, email: e, displayName: name.trim(), priority: p,
      primary: primary && canPrimary, enabled: sender?.enabled ?? (ds === "Verified"), lastVerified: sender?.lastVerified ?? null,
      ...(sender?.migrated ? { migrated: true } : {}),
    }, !sender);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{sender ? "Edit Sender Email" : "Add Sender Email"}</DialogTitle>
          <DialogDescription>Sender emails use this client's SendGrid account. No separate credentials are needed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="From Email Address"><TextInput value={email} onChange={(v) => { setEmail(v); setErr(null); }} placeholder="payments@yourdomain.com" disabled={!!sender} /></Field>
          <Field label="Display Name"><TextInput value={name} onChange={setName} placeholder="Collections Team" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Domain"><TextInput value={domain} onChange={() => {}} disabled /></Field>
            <Field label="Failover Priority"><TextInput value={priority} onChange={setPriority} /></Field>
          </div>
          {domain && isValidEmail(email) && (
            knownDomain
              ? <Notice tone={ds === "Verified" ? "success" : "warning"}>{ds === "Verified" ? `${domain} is already authenticated — this sender reuses the existing verification.` : `${domain} is ${ds}. This sender stays unavailable until the domain is verified.`}</Notice>
              : <Notice tone="info">{domain} is a new domain. After saving, you'll see the DNS records to add at the client's domain host.</Notice>
          )}
          <label className={`flex items-center gap-2 text-[12px] ${canPrimary ? "" : "opacity-50"}`}>
            <input type="checkbox" checked={primary && canPrimary} disabled={!canPrimary} onChange={(e) => setPrimaryFlag(e.target.checked)} />
            Set as Primary {canPrimary ? "" : "(available once the domain is verified)"}
          </label>
          {err && <p className="text-[12px] text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={submit}>{sender ? "Save Changes" : "Add Sender"}</Btn>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DnsDialog({ clientId, setup, domain, readOnly, checking, onCheck, onClose }: {
  clientId: string; setup: EmailSetup; domain: string; readOnly: boolean; checking: boolean; onCheck: () => void; onClose: () => void;
}) {
  const d = setup.domains.find((x) => x.domain === domain);
  const status = d?.status ?? "DNS Pending";
  const records = dnsRecordsFor(domain, clientId);
  const senders = setup.senders.filter((s) => domainOf(s.email) === domain);
  const all = records.map((r) => `${r.type}\t${r.host}\t${r.value}`).join("\n");
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>DNS Authentication · {domain}</DialogTitle>
          <DialogDescription>One authentication covers every sender email on this domain.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-[12px]">
          <div className="grid gap-2 sm:grid-cols-3">
            <div><p className="text-muted-foreground">Verification Status</p><StatusPill tone={domainTone(checking ? "Verifying" : status)}>{checking ? "Verifying" : status}</StatusPill></div>
            <div><p className="text-muted-foreground">Last Verification Check</p><p className="font-medium">{d?.lastCheck ?? "Never"}</p></div>
            <div><p className="text-muted-foreground">Associated Senders</p><p className="font-medium">{senders.map((s) => s.email).join(", ") || "—"}</p></div>
          </div>
          {status === "Provider Connection Failed" && <Notice tone="danger">SendGrid could not be reached. Fix the SendGrid connection, then check again.</Notice>}
          {status === "Verification Failed" && <Notice tone="danger">SendGrid could not find the records. Check for typos and allow time for DNS propagation.</Notice>}
          <p className="leading-relaxed text-muted-foreground">
            Add these records at the client's domain hosting provider (e.g. GoDaddy, Cloudflare, Route 53). PayFlow does not change DNS records. Propagation can take up to 48 hours.
          </p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[560px] text-[12px]">
              <thead><tr className="bg-surface text-left text-muted-foreground"><th className="px-3 py-2">Type</th><th className="px-3 py-2">Host / Name</th><th className="px-3 py-2">Value / Target</th><th /></tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.host} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{r.type}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{r.host}</td>
                    <td className="px-3 py-2 font-mono text-[11px] break-all">{r.value}</td>
                    <td className="px-2"><CopyBtn text={`${r.host} ${r.value}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Btn onClick={() => void navigator.clipboard?.writeText(all)}>Copy All Records</Btn>
            {!readOnly && <Btn variant="primary" disabled={checking} onClick={onCheck}>{checking ? "Checking…" : "Check Verification Status"}</Btn>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { isEligible };


function useClientSetup(clientId: string) {
  const { allClients } = useRole();
  const client = allClients.find((c) => c.id === clientId);
  return client ? getEmailSetup(clientId, client.config) : null;
}

export function CaseSenderPanel({ accountId, clientId }: { accountId: string; clientId: string }) {
  const setup = useClientSetup(clientId);
  if (!setup) return null;
  const primary = primarySender(setup);
  const override = accountSenderOverrides[accountId];
  const resolved = resolveSender(setup);
  const eligibility = accountEmailEligibility[accountId] ?? "Eligible — no opt-out on record";
  const rows: [string, string][] = [
    ["Client Primary Sender", primary?.email ?? "Not set"],
    ["Current / Resolved Sender", override?.status === "Active" ? override.current : resolved.sender?.email ?? "No eligible sender"],
    ["Selection Type", override?.status === "Active" ? "Account-Level Override" : resolved.type === "None" ? "—" : "Primary"],
    ["Selection Reason", override?.status === "Active" ? override.reason : resolved.reason],
    ["Email Consent / Eligibility", eligibility],
    ["Last Updated", override?.effective ?? setup.sendgrid.lastCheck ?? "—"],
  ];
  return (
    <Panel title="Email Sender Information" description="Read-only. Sender changes here never alter the client's Primary sender or other customers.">
      <dl className="space-y-2 text-[12px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[150px_minmax(0,1fr)] gap-3">
            <dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-foreground break-words">{v}</dd>
          </div>
        ))}
      </dl>
      {override && (
        <div className="mt-3 rounded-md border border-border bg-surface p-3 text-[12px]">
          <p className="mb-1.5 font-semibold">Account-level sender override</p>
          <p><span className="text-muted-foreground">Previous:</span> {override.previous}</p>
          <p><span className="text-muted-foreground">Current:</span> {override.current}</p>
          <p><span className="text-muted-foreground">Effective:</span> {override.effective} · <StatusPill tone={override.status === "Active" ? "info" : "neutral"}>{override.status}</StatusPill></p>
        </div>
      )}
    </Panel>
  );
}

/** Expected sender for a proposed adaptive email — final selection happens at execution time. */
export function ExpectedSender({ accountId, clientId, channel }: { accountId: string; clientId: string; channel: string }) {
  const setup = useClientSetup(clientId);
  if (!setup || channel !== "Email") return null;
  const override = accountSenderOverrides[accountId];
  const r = resolveSender(setup);
  const email = override?.status === "Active" ? override.current : r.sender?.email;
  const type = override?.status === "Active" ? "Account-Level Override" : r.type === "Alternative" ? "Alternative sender" : r.type === "Primary" ? "Primary" : null;
  const eligibility = accountEmailEligibility[accountId] ?? "Eligible";
  return (
    <div className="rounded-md border border-border bg-surface p-2.5 text-[12px]">
      <p><span className="text-muted-foreground">Expected From Email:</span> {email ?? "No eligible sender"}{type && <> · {type}</>}</p>
      <p><span className="text-muted-foreground">Email Eligibility:</span> {eligibility}</p>
      {!email && <p className="mt-1 text-destructive">No eligible email sender — PayFlow will use an alternative permitted channel or escalate to Operations.</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">Final sender selection, consent and compliance are checked at execution time.</p>
    </div>
  );
}
