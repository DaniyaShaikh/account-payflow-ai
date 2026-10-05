import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, FileText, UploadCloud, Loader2 } from "lucide-react";
import {
  Btn,
  DataTable,
  KpiCard,
  Panel,
  PrimaryCell,
  StatusPill,
  Td,
  Tr,
} from "@/components/payflow-ui";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/payflow-data";
import { seedPortfolios } from "@/lib/portfolio-data";
import { useRole } from "@/lib/role-context";
import {
  acceptedTypes,
  accountImportRecords,
  accountImportSummary,
  actionTone,
  addImport,
  clientImportRecords,
  clientImportSummary,
  formatFileSize,
  importStatusTone,
  lastImport,
  lastSuccessfulImport,
  sampleAccountErrors,
  sampleClientErrors,
  type ImportError,
  type ImportKind,
  type ImportRecord,
  type ImportRun,
  type ImportStatus,
} from "@/lib/import-data";

type Stage = "upload" | "uploading" | "validating" | "preview" | "processing" | "done";

/* ------------------------------ Dropzone ------------------------------ */

export function FileDropzone({
  file,
  onFile,
  error,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  error?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const pick = () => inputRef.current?.click();

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={pick}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            onFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors sm:py-12",
            over ? "border-primary bg-primary/5" : "border-border-strong/60 bg-muted/30 hover:border-primary/50",
          )}
        >
          <UploadCloud className="mb-3 size-8 text-primary" />
          <p className="text-[14px] font-semibold text-foreground">Drag & drop your file here</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            or <span className="font-semibold text-primary">browse to select a file</span>
          </p>
          <p className="mt-3 text-[11.5px] text-muted-foreground">Supported: CSV or XLSX · up to 50 MB</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-foreground">{file.name}</p>
            <p className="text-[11.5px] text-muted-foreground">{formatFileSize(file.size)} · Ready to validate</p>
          </div>
          <div className="flex gap-2">
            <Btn onClick={pick}>Replace</Btn>
            <Btn variant="ghost" onClick={() => onFile(null)}>
              Remove
            </Btn>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-[12.5px] font-medium text-destructive">{error}</p>}
    </div>
  );
}

/* ---------------------------- Progress state --------------------------- */

function ProgressPanel({ title, done, total, unit }: { title: string; done: number; total: number; unit: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <Panel>
      <div className="flex flex-col items-center px-2 py-10 text-center">
        <Loader2 className="mb-3 size-8 animate-spin text-primary" />
        <h2 className="font-display text-[18px] font-semibold text-foreground">{title}</h2>
        <p className="tabular mt-1 text-[13px] text-muted-foreground">
          {total ? `${formatNumber(done)} of ${formatNumber(total)} ${unit} processed` : "Please keep this page open."}
        </p>
        <div className="mt-5 h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${total ? pct : 40}%` }} />
        </div>
        {total > 0 && <p className="tabular mt-2 text-[11.5px] text-muted-foreground">{pct}%</p>}
      </div>
    </Panel>
  );
}

const stageLabels = ["Upload", "Validate & Preview", "Process", "Results"];
function stageIndex(stage: Stage) {
  if (stage === "upload" || stage === "uploading") return 0;
  if (stage === "validating" || stage === "preview") return 1;
  if (stage === "processing") return 2;
  return 3;
}
function StageBar({ stage }: { stage: Stage }) {
  const idx = stageIndex(stage);
  return (
    <ol className="mb-6 flex flex-wrap gap-2">
      {stageLabels.map((l, i) => (
        <li
          key={l}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium",
            i < idx && "border-success/30 bg-success/10 text-success",
            i === idx && "border-primary/40 bg-primary/10 text-primary",
            i > idx && "border-border text-muted-foreground",
          )}
        >
          <span className="tabular">{i + 1}</span> {l}
        </li>
      ))}
    </ol>
  );
}

/* ----------------------------- Error table ----------------------------- */

export function ImportErrorTable({ errors }: { errors: ImportError[] }) {
  if (errors.length === 0)
    return <p className="text-[13px] text-muted-foreground">No errors were found in this import.</p>;
  return (
    <DataTable minWidth={860} head={["Record", "Client", "Sub-Client", "Field", "What needs fixing", "Status"]}>
      {errors.map((e, i) => (
        <Tr key={i}>
          <Td className="tabular font-medium">{e.recordId}</Td>
          <Td>{e.client}</Td>
          <Td className="text-muted-foreground">{e.subClient}</Td>
          <Td>{e.field}</Td>
          <Td className="min-w-[280px] whitespace-normal">{e.error}</Td>
          <Td>
            <StatusPill tone={e.status === "Rejected" ? "danger" : "warning"}>{e.status}</StatusPill>
          </Td>
        </Tr>
      ))}
    </DataTable>
  );
}

/* ----------------------------- Result view ----------------------------- */

export function ImportResult({ run, returnTo }: { run: ImportRun; returnTo: ReactNode }) {
  const [showErrors, setShowErrors] = useState(false);
  const Icon = run.status === "Completed" ? CheckCircle2 : run.status === "Failed" ? XCircle : AlertTriangle;
  const iconTone =
    run.status === "Completed" ? "text-success" : run.status === "Failed" ? "text-destructive" : "text-warning";
  const heading =
    run.status === "Failed"
      ? "Import Failed"
      : run.kind === "account"
        ? run.status === "Completed"
          ? "Daily Import Completed"
          : "Daily Import Completed with Errors"
        : run.status === "Completed"
          ? "Import Completed"
          : "Import Completed with Errors";
  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-start gap-4 py-2">
          <Icon className={cn("size-9 shrink-0", iconTone)} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[19px] font-semibold text-foreground">{heading}</h2>
            <p className="mt-1 text-[13px] break-all text-muted-foreground">
              {run.fileName} · {run.dateTime}
            </p>
            {run.status === "Failed" && (
              <p className="mt-2 text-[13px] text-foreground">
                No records were changed. Review the issue below, correct the file and upload it again.
              </p>
            )}
          </div>
          <StatusPill tone={importStatusTone(run.status)}>{run.status}</StatusPill>
        </div>
      </Panel>
      {run.status !== "Failed" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Total Records" value={formatNumber(run.counts.total)} tone="primary" />
          <KpiCard label="Created" value={formatNumber(run.counts.created)} />
          <KpiCard label="Updated" value={formatNumber(run.counts.updated)} />
          <KpiCard label="Unchanged" value={formatNumber(run.counts.unchanged)} />
          <KpiCard label="Failed" value={formatNumber(run.counts.failed)} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {run.errors.length > 0 && (
          <Btn onClick={() => setShowErrors((s) => !s)}>{showErrors ? "Hide Errors" : "View Errors"}</Btn>
        )}
        <Link to="/imports/$importId" params={{ importId: run.id }}>
          <Btn>View Import Details</Btn>
        </Link>
        {returnTo}
      </div>
      {showErrors && <ImportErrorTable errors={run.errors} />}
    </div>
  );
}

/* ---------------------------- Preview tables --------------------------- */

function ClientPreviewTable({ records }: { records: ImportRecord[] }) {
  const groups = records.reduce<Record<string, ImportRecord[]>>((acc, r) => {
    (acc[r.clientName] ??= []).push(r);
    return acc;
  }, {});
  return (
    <DataTable minWidth={760} head={["Client / Sub-Client", "Client ID", "Sub-Client ID", "Action", "Status"]}>
      {Object.entries(groups).map(([name, rows]) => (
        <Fragment key={name}>
          <tr className="bg-muted/40">
            <Td>
              <span className="font-semibold text-foreground">{name}</span>
              <span className="ml-2 text-[11.5px] text-muted-foreground">{rows.length} sub-clients</span>
            </Td>
            <Td className="tabular text-muted-foreground">{rows.find((r) => r.clientId)?.clientId || "—"}</Td>
            <Td>{null}</Td>
            <Td>{null}</Td>
            <Td>{null}</Td>
          </tr>
          {rows.map((r, i) => (
            <Tr key={r.id}>
              <Td>
                <span className="pl-3 text-muted-foreground">{i === rows.length - 1 ? "└" : "├"}─ </span>
                {r.subClientName}
              </Td>
              <Td className="tabular text-muted-foreground">{r.clientId || "Missing"}</Td>
              <Td className="tabular">{r.subClientId}</Td>
              <Td>
                <StatusPill tone={actionTone(r.action)}>{r.action}</StatusPill>
              </Td>
              <Td className="text-[12.5px] text-muted-foreground">
                {r.action === "Error" ? <span className="text-destructive">{r.note}</span> : "Valid"}
              </Td>
            </Tr>
          ))}
        </Fragment>
      ))}
    </DataTable>
  );
}

function AccountPreviewTable({ records }: { records: ImportRecord[] }) {
  return (
    <DataTable
      minWidth={880}
      head={["Account ID", "Client → Sub-Client", "Current Balance", "Incoming Balance", "Action", "Status"]}
    >
      {records.map((r) => (
        <Tr key={r.id}>
          <Td className="tabular font-medium">{r.note}</Td>
          <Td>
            <PrimaryCell title={r.subClientName} subtitle={r.clientName} />
          </Td>
          <Td className="tabular text-muted-foreground">
            {r.currentBalance == null ? "New account" : formatCurrency(r.currentBalance)}
          </Td>
          <Td className="tabular font-medium">
            {formatCurrency(r.incomingBalance ?? 0)}
            {r.currentBalance != null && r.incomingBalance !== r.currentBalance && (
              <span className="ml-1.5 text-[11px] text-muted-foreground">
                ({(r.incomingBalance ?? 0) < r.currentBalance ? "↓" : "↑"})
              </span>
            )}
          </Td>
          <Td>
            <StatusPill tone={actionTone(r.action)}>{r.action}</StatusPill>
          </Td>
          <Td className="text-[12.5px]">
            {r.action === "Error" ? (
              <span className="text-destructive">Needs correction</span>
            ) : (
              <span className="text-muted-foreground">Valid</span>
            )}
          </Td>
        </Tr>
      ))}
    </DataTable>
  );
}

/* ------------------------------ Main flow ------------------------------ */

const formatInfo: Record<ImportKind, { required: string[]; note: string }> = {
  client: {
    required: ["Client ID", "Client Name", "Sub-Client ID", "Sub-Client Name"],
    note: "One row per Sub-Client/Portfolio. Rows sharing a Client ID are grouped under the same Client.",
  },
  account: {
    required: ["Account ID", "Client ID", "Sub-Client ID", "Customer Name", "Outstanding Balance", "Account Status", "Due Date"],
    note: "Uses the agreed CRM daily layout. Existing accounts are refreshed; new accounts are created.",
  },
};

function nowStamp() {
  const d = new Date();
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ImportFlow({ kind }: { kind: ImportKind }) {
  const navigate = useNavigate();
  const { allClients, addClient, userName } = useRole();
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState<ImportRun | null>(null);

  const isClient = kind === "client";
  const total = isClient ? clientImportSummary.total : accountImportSummary.total;
  const backTo = isClient ? "/clients" : "/accounts";
  const fails = !!file && /fail/i.test(file.name);

  const onFile = (f: File | null) => {
    setFileError(null);
    if (f && !/\.(csv|xlsx)$/i.test(f.name)) {
      setFile(null);
      setFileError("This file type isn't supported. Please upload a CSV or XLSX file.");
      return;
    }
    setFile(f);
  };

  // Simulated timed stages
  useEffect(() => {
    if (stage === "uploading") {
      const t = setTimeout(() => setStage("validating"), 900);
      return () => clearTimeout(t);
    }
    if (stage === "validating") {
      const t = setTimeout(() => {
        if (fails) finish("Failed");
        else setStage("preview");
      }, 1200);
      return () => clearTimeout(t);
    }
    if (stage === "processing") {
      setProgress(0);
      const step = Math.ceil(total / 25);
      const id = setInterval(() => {
        setProgress((p) => {
          const next = Math.min(total, p + step);
          if (next >= total) {
            clearInterval(id);
            setTimeout(() => finish("Completed with Errors"), 300);
          }
          return next;
        });
      }, 120);
      return () => clearInterval(id);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function finish(status: ImportStatus) {
    const errors = status === "Failed"
      ? [{ recordId: "File", client: "—", subClient: "—", field: "File structure", error: "The file does not match the agreed CRM layout, so no records were processed.", status: "Rejected" as const }]
      : isClient ? sampleClientErrors : sampleAccountErrors;
    const counts =
      status === "Failed"
        ? { total: 0, created: 0, updated: 0, unchanged: 0, failed: 0 }
        : isClient
          ? { total: 1000, created: 120, updated: 850, unchanged: 20, failed: 10 }
          : { total: 12000, created: 640, updated: 10920, unchanged: 382, failed: 58 };
    const r: ImportRun = {
      id: `imp-${Date.now().toString(36)}`,
      kind,
      fileName: file?.name ?? "upload.csv",
      dateTime: nowStamp(),
      uploadedBy: userName,
      status,
      counts,
      errors,
    };
    addImport(r);
    if (isClient && status !== "Failed") applyClientImport();
    setRun(r);
    setStage("done");
  }

  function applyClientImport() {
    const template = allClients[0];
    if (!template) return;
    const created = clientImportRecords.filter((r) => r.action === "Create");
    const existing = new Set(allClients.map((c) => c.name));
    const byClient = new Map<string, ImportRecord[]>();
    created.forEach((r) => byClient.set(r.clientName, [...(byClient.get(r.clientName) ?? []), r]));
    byClient.forEach((rows, name) => {
      let clientId = allClients.find((c) => c.name === name)?.id;
      if (!existing.has(name)) {
        clientId = `imp-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        addClient({
          ...template,
          id: clientId,
          name,
          industry: "Imported from CRM",
          accounts: 0,
          activeCases: 0,
          outstanding: 0,
          recovered: 0,
          reviewsPending: 0,
          supervisors: [],
          status: "Onboarding",
          config: { ...template.config, code: rows[0]!.clientId },
        });
      }
      rows.forEach((r, i) => {
        if (seedPortfolios.some((p) => p.name === r.subClientName)) return;
        seedPortfolios.push({
          id: `imp-${r.subClientId.toLowerCase()}`,
          clientId: clientId!,
          name: r.subClientName,
          code: r.subClientId,
          status: "Onboarding",
          description: "Imported from CRM file.",
          accounts: 0,
          cases: 0,
          outstanding: 0,
          activeStrategyId: null,
          lastFileReceived: nowStamp().slice(0, 11),
        });
        void i;
      });
    });
  }

  const reset = () => {
    setStage("upload");
    setFile(null);
    setRun(null);
  };

  const returnBtn = (
    <Link to={backTo}>
      <Btn variant="primary">Return to {isClient ? "Clients" : "Accounts"}</Btn>
    </Link>
  );

  return (
    <>
      <StageBar stage={stage} />

      {(stage === "upload" || stage === "uploading") && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {!isClient ? (
            <div className="space-y-5">
              <PreviousImportPanel />
              <Panel title="Current Upload">
                <FileDropzone file={file} onFile={onFile} error={fileError} />
              </Panel>
            </div>
          ) : (
            <Panel title="Upload File" description="Select the CRM client file you received.">
              <FileDropzone file={file} onFile={onFile} error={fileError} />
            </Panel>
          )}
          <Panel title="Required Data / File Format">
            <p className="text-[12.5px] text-muted-foreground">{formatInfo[kind].note}</p>
            <ul className="mt-3 space-y-1.5">
              {formatInfo[kind].required.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12.5px] text-foreground">
                  <CheckCircle2 className="size-3.5 text-success" /> {f}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] text-muted-foreground">CSV or XLSX · first row contains column headers.</p>
          </Panel>
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Btn variant="primary" disabled={!file || stage === "uploading"} onClick={() => setStage("uploading")}>
              {stage === "uploading" ? "Uploading…" : isClient ? "Continue / Validate File" : "Validate File"}
            </Btn>
            <Btn variant="ghost" onClick={() => navigate({ to: backTo })}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {stage === "validating" && <ProgressPanel title="Validating file" done={0} total={0} unit="" />}

      {stage === "preview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {isClient ? (
              <>
                <KpiCard label="Total Records" value={formatNumber(clientImportSummary.total)} tone="primary" />
                <KpiCard label="New Clients" value={formatNumber(clientImportSummary.newClients)} />
                <KpiCard label="Existing Clients" value={formatNumber(clientImportSummary.existingClients)} />
                <KpiCard label="New Sub-Clients" value={formatNumber(clientImportSummary.newSubClients)} />
                <KpiCard label="Existing Sub-Clients" value={formatNumber(clientImportSummary.existingSubClients)} />
                <KpiCard label="Errors" value={formatNumber(clientImportSummary.errors)} />
              </>
            ) : (
              <>
                <KpiCard label="Total Accounts" value={formatNumber(accountImportSummary.total)} tone="primary" />
                <KpiCard label="New Accounts" value={formatNumber(accountImportSummary.newAccounts)} />
                <KpiCard label="Accounts to Update" value={formatNumber(accountImportSummary.toUpdate)} />
                <KpiCard label="Unchanged" value={formatNumber(accountImportSummary.unchanged)} />
                <KpiCard label="Errors" value={formatNumber(accountImportSummary.errors)} />
              </>
            )}
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Showing a sample of {isClient ? clientImportRecords.length : accountImportRecords.length} of{" "}
            {formatNumber(total)} records from <span className="font-medium text-foreground">{file?.name}</span>.
            Records with errors will be skipped; all others will be processed.
          </p>
          {isClient ? (
            <ClientPreviewTable records={clientImportRecords} />
          ) : (
            <AccountPreviewTable records={accountImportRecords} />
          )}
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" onClick={() => setStage("processing")}>
              {isClient ? "Process Import" : "Process Daily File"}
            </Btn>
            <Btn onClick={reset}>Go Back</Btn>
            <Btn variant="ghost" onClick={() => navigate({ to: backTo })}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {stage === "processing" && (
        <ProgressPanel
          title={isClient ? "Processing Client Import" : "Processing Daily CRM Data"}
          done={progress}
          total={total}
          unit={isClient ? "records" : "accounts"}
        />
      )}

      {stage === "done" && run && (
        <ImportResult
          run={run}
          returnTo={
            <>
              {run.status === "Failed" && <Btn onClick={reset}>Upload Again</Btn>}
              {returnBtn}
            </>
          }
        />
      )}
    </>
  );
}

function PreviousImportPanel() {
  const last = lastImport("account");
  const ok = lastSuccessfulImport("account");
  return (
    <Panel
      title="Previous Import"
      action={
        <Link to="/imports" search={{ type: "account" }} className="text-[12.5px] font-semibold text-primary hover:underline">
          Import History
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-eyebrow">Last Successful Upload</p>
          <p className="mt-1 text-[13px] font-semibold break-all text-foreground">{ok?.fileName ?? "—"}</p>
        </div>
        <div>
          <p className="text-eyebrow">Last Upload Date / Time</p>
          <p className="mt-1 text-[13px] font-semibold text-foreground">{last?.dateTime ?? "—"}</p>
        </div>
        <div>
          <p className="text-eyebrow">Last Status</p>
          <div className="mt-1">
            {last ? <StatusPill tone={importStatusTone(last.status)}>{last.status}</StatusPill> : "—"}
          </div>
        </div>
      </div>
    </Panel>
  );
}
