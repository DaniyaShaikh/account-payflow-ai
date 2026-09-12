import type { Client } from "./payflow-data";

/**
 * Source-system file intake (illustrative).
 *
 * PayFlow receives a fresh account file from each client's source system on a
 * recurring schedule. Every operational figure — account volume, active cases,
 * outstanding balance — reflects the most recently received and assigned file,
 * not a running lifetime total. Accounts can drop out of a file (paid or closed
 * on the client side) and new ones can arrive, so counts move between files.
 */
export interface FileIntake {
  /** Illustrative file name as delivered by the source system. */
  fileName: string;
  /** When the file was received from the source system. */
  receivedAt: string;
  /** When the file was assigned into PayFlow collections operations. */
  assignedAt: string;
  /** Source system that produced the file. */
  source: string;
  /** Accounts present in the current file — the basis of the client summary. */
  accountsInFile: number;
  /** Accounts present in the previous file. */
  previousAccounts: number;
  /** Accounts appearing for the first time in this file. */
  newAccounts: number;
  /** Accounts present previously but absent now (paid or closed at the client). */
  removedAccounts: number;
}

function seed(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

const receivedSlots = [
  { received: "12 Sep 2026, 06:15 ET", assigned: "12 Sep 2026, 07:02 ET" },
  { received: "12 Sep 2026, 05:40 ET", assigned: "12 Sep 2026, 06:25 ET" },
  { received: "11 Sep 2026, 22:10 ET", assigned: "12 Sep 2026, 05:55 ET" },
  { received: "11 Sep 2026, 18:30 ET", assigned: "11 Sep 2026, 19:05 ET" },
];

/** Illustrative intake record for a client's most recent source-system file. */
export function intakeForClient(client: Client): FileIntake {
  const s = seed(client.id);
  const slot = receivedSlots[s % receivedSlots.length]!;
  const newAccounts = 40 + (s % 160);
  const removedAccounts = 25 + ((s >> 3) % 190);
  return {
    fileName: `${(client.config.code || client.name.slice(0, 3)).toUpperCase()}_ACCOUNTS_20260912.csv`,
    receivedAt: slot.received,
    assignedAt: slot.assigned,
    source: client.config.dataSource || "Source System",
    accountsInFile: client.accounts,
    previousAccounts: client.accounts - newAccounts + removedAccounts,
    newAccounts,
    removedAccounts,
  };
}

/** Aggregated intake position across a set of clients in the current scope. */
export function intakeSummary(clients: Client[]) {
  const intakes = clients.map(intakeForClient);
  const newest = intakes.find((i) => i.receivedAt.startsWith("12 Sep")) ?? intakes[0];
  return {
    files: intakes.length,
    latestReceivedAt: newest?.receivedAt ?? "—",
    latestAssignedAt: newest?.assignedAt ?? "—",
    accountsInFiles: intakes.reduce((sum, i) => sum + i.accountsInFile, 0),
    newAccounts: intakes.reduce((sum, i) => sum + i.newAccounts, 0),
    removedAccounts: intakes.reduce((sum, i) => sum + i.removedAccounts, 0),
  };
}
