import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DataTable,
  Td,
  Tr,
  StatusPill,
  PrimaryCell,
  SearchInput,
  FilterSelect,
  EmptyState,
} from "@/components/payflow-ui";
import { useReviews } from "@/lib/reviews-context";
import { useRole } from "@/lib/role-context";
import {
  formatWaiting,
  inWaitingBucket,
  priorityTone,
  proposedActions,
  reviewReasons,
  reviewStatusTone,
  reviewStatuses,
  waitingBuckets,
  type HumanReview,
} from "@/lib/review-data";
import { formatCurrency } from "@/lib/payflow-data";

interface Props {
  /** When set, the queue is locked to a single client (client detail usage). */
  clientId?: string;
  initialStatus?: string;
  initialPriority?: string;
}

export function ReviewQueue({ clientId, initialStatus, initialPriority }: Props) {
  const { visibleReviews } = useReviews();
  const { visibleClients } = useRole();

  const scoped = useMemo(
    () => (clientId ? visibleReviews.filter((r) => r.clientId === clientId) : visibleReviews),
    [visibleReviews, clientId],
  );

  const [search, setSearch] = useState("");
  const [client, setClient] = useState("All Clients");
  const [priority, setPriority] = useState(initialPriority ?? "All Priorities");
  const [reason, setReason] = useState("All Reasons");
  const [rule, setRule] = useState("All Rules");
  const [action, setAction] = useState("All Actions");
  const [status, setStatus] = useState(initialStatus ?? "All Statuses");
  const [age, setAge] = useState<string>("Any Age");

  const ruleOptions = useMemo(
    () => ["All Rules", ...Array.from(new Set(scoped.map((r) => r.ruleName))).sort()],
    [scoped],
  );

  const rows = useMemo(
    () =>
      scoped.filter((r) => {
        const q = search.trim().toLowerCase();
        if (q && !`${r.customer} ${r.reference} ${r.ruleName} ${r.reason}`.toLowerCase().includes(q))
          return false;
        if (client !== "All Clients" && clientName(visibleClients, r.clientId) !== client)
          return false;
        if (priority !== "All Priorities" && r.priority !== priority) return false;
        if (reason !== "All Reasons" && r.reason !== reason) return false;
        if (rule !== "All Rules" && r.ruleName !== rule) return false;
        if (action !== "All Actions" && r.proposedAction !== action) return false;
        if (status !== "All Statuses" && r.status !== status) return false;
        if (!inWaitingBucket(r.waitingMinutes, age)) return false;
        return true;
      }),
    [scoped, search, client, priority, reason, rule, action, status, age, visibleClients],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customer, reference or rule"
          className="w-64"
        />
        {!clientId && (
          <FilterSelect
            label="Client"
            value={client}
            onChange={setClient}
            options={["All Clients", ...visibleClients.map((c) => c.name)]}
          />
        )}
        <FilterSelect
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={["All Priorities", "High", "Medium", "Normal"]}
        />
        <FilterSelect
          label="Reason"
          value={reason}
          onChange={setReason}
          options={["All Reasons", ...reviewReasons]}
        />
        <FilterSelect label="Rule" value={rule} onChange={setRule} options={ruleOptions} />
        <FilterSelect
          label="Action"
          value={action}
          onChange={setAction}
          options={["All Actions", ...proposedActions]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...reviewStatuses]}
        />
        <FilterSelect label="Age" value={age} onChange={setAge} options={[...waitingBuckets]} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No reviews match these filters"
          description="Human review is an exception queue — an empty queue means automation is operating within governance."
        />
      ) : (
        <DataTable
          minWidth={1180}
          head={[
            "Priority",
            "Client",
            "Customer",
            "Outstanding",
            "Review Reason",
            "Triggered Rule",
            "Proposed Action",
            "Waiting",
            "Status",
          ]}
        >
          {rows.map((r) => (
            <ReviewRow key={r.id} review={r} clientLabel={clientName(visibleClients, r.clientId)} />
          ))}
        </DataTable>
      )}
    </div>
  );
}

function ReviewRow({ review, clientLabel }: { review: HumanReview; clientLabel: string }) {
  return (
    <Tr>
      <Td>
        <StatusPill tone={priorityTone(review.priority)}>{review.priority}</StatusPill>
      </Td>
      <Td className="text-muted-foreground">{clientLabel}</Td>
      <Td>
        <Link to="/human-review/$reviewId" params={{ reviewId: review.id }} className="hover:underline">
          <PrimaryCell title={review.customer} subtitle={review.reference} />
        </Link>
      </Td>
      <Td className="tabular font-medium">{formatCurrency(review.outstanding)}</Td>
      <Td>{review.reason}</Td>
      <Td>
        <Link
          to="/rules/$ruleId"
          params={{ ruleId: review.ruleId }}
          className="text-[13px] font-medium text-primary hover:underline"
        >
          {review.ruleName}
        </Link>
      </Td>
      <Td className="text-muted-foreground">{review.proposedAction}</Td>
      <Td className="tabular text-muted-foreground">{formatWaiting(review.waitingMinutes)}</Td>
      <Td>
        <StatusPill tone={reviewStatusTone(review.status)}>{review.status}</StatusPill>
      </Td>
    </Tr>
  );
}

function clientName(clients: { id: string; name: string }[], id: string) {
  return clients.find((c) => c.id === id)?.name ?? id;
}
