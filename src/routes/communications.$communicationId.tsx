import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatusPill, Btn } from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { accounts, clientName, formatCurrency } from "@/lib/payflow-data";
import { journeyById } from "@/lib/journey-data";
import {
  brandingFor,
  commStatusTone,
  communicationById,
  engagementLabel,
} from "@/lib/communication-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/communications/$communicationId")({
  head: () => ({
    meta: [
      { title: "Communication detail — PayFlow Collections" },
      {
        name: "description",
        content:
          "Communication detail with the customer-facing message, delivery and engagement events, and the business reason for the message, channel and timing.",
      },
      { property: "og:title", content: "Communication detail — PayFlow Collections" },
      {
        property: "og:description",
        content: "The message a customer received, its delivery events and why it was sent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ params }) => {
    if (!communicationById(params.communicationId)) throw notFound();
    return null;
  },
  component: CommunicationDetail,
});

function Expandable({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border py-2.5 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-[13px] font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}

function CommunicationDetail() {
  const { communicationId } = Route.useParams();
  const { canSeeClient } = useRole();
  const comm = communicationById(communicationId)!;

  if (!canSeeClient(comm.clientId)) {
    return (
      <Panel title="No access to this communication">
        <p className="text-sm text-muted-foreground">
          This communication belongs to a client that is not assigned to your supervisor account.
        </p>
        <Link to="/communications" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to communications
        </Link>
      </Panel>
    );
  }

  const account = accounts.find((a) => a.id === comm.accountId);
  const journey = journeyById(comm.journeyId);
  const brand = brandingFor(comm.clientId);

  const facts = [
    { label: "Client", value: clientName(comm.clientId) },
    { label: "Customer", value: comm.customer },
    { label: "Account Reference", value: comm.reference },
    { label: "Collection Case", value: account ? account.status : "—" },
    { label: "Channel", value: comm.channel },
    { label: "Purpose", value: comm.purpose },
    { label: "Workflow", value: journey?.name ?? "—" },
    { label: "Workflow Stage", value: comm.journeyStage },
    { label: "Status", value: comm.status },
    { label: "Created", value: comm.createdAt },
    { label: "Sent", value: comm.sentAt ?? "Not sent" },
    { label: "Engagement", value: engagementLabel(comm) },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Communications", to: "/communications" },
          { label: comm.customer },
          { label: comm.id },
        ]}
        title={`${comm.channel} · ${comm.purpose}`}
        description={`${comm.customer} · ${comm.reference} · ${comm.dateLabel} ${comm.time}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={commStatusTone(comm.status)}>{comm.status}</StatusPill>
            <StatusPill>{comm.id}</StatusPill>
          </div>
        }
      />

      {comm.reviewId && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-[13px] text-foreground">
            Governance requires a supervisor decision before this communication can be sent.
          </p>
          <Link to="/human-review/$reviewId" params={{ reviewId: comm.reviewId }}>
            <Btn variant="primary">Open Human Review</Btn>
          </Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <Panel title="Communication Summary" bodyClassName="p-0">
            <dl className="divide-y divide-border">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                  <dd className="tabular text-[13px] font-medium text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Why this communication" bodyClassName="px-5 py-1">
            <Expandable title="Why this message?">{comm.whyMessage}</Expandable>
            <Expandable title={`Why ${comm.channel}?`}>{comm.whyChannel}</Expandable>
            <Expandable title="Why now?">{comm.whyTiming}</Expandable>
          </Panel>

          <Panel title="Linked records" bodyClassName="p-0">
            <ul className="divide-y divide-border text-[13px]">
              <li className="px-4 py-2.5">
                <Link
                  to="/accounts/$accountId"
                  params={{ accountId: comm.accountId }}
                  className="font-medium text-primary hover:underline"
                >
                  Open collection case · {comm.reference}
                </Link>
              </li>
              {journey && (
                <li className="px-4 py-2.5">
                  <Link
                    to="/journeys/$journeyId"
                    params={{ journeyId: journey.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    View collection workflow · {journey.name}
                  </Link>
                </li>
              )}
              <li className="px-4 py-2.5">
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: comm.clientId }}
                  className="font-medium text-primary hover:underline"
                >
                  View client · {clientName(comm.clientId)}
                </Link>
              </li>
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Message Preview" description="The communication as the customer sees it">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className={cn("px-4 py-3", brand.headerClass)}>
                <p className="text-[13px] font-semibold">{brand.name}</p>
                {comm.subject && <p className="mt-0.5 text-[11px] opacity-90">{comm.subject}</p>}
              </div>
              <div className="space-y-3 bg-card px-4 py-4">
                {comm.bodyLines.map((line, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-foreground">
                    {line}
                  </p>
                ))}
                <div className="rounded-md border border-border bg-surface px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Outstanding Balance</p>
                  <p className="tabular text-[16px] font-semibold text-foreground">
                    {formatCurrency(comm.balance)}
                  </p>
                </div>
                {comm.paymentLink && (
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-3.5 py-2 text-[13px] font-semibold",
                        brand.accentClass,
                      )}
                    >
                      Pay Now
                    </span>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Unique secure payment link · opens the {brand.name}-branded payment experience
                      (built in a later step)
                    </p>
                  </div>
                )}
                <p className="text-[12px] text-muted-foreground">{brand.signature}</p>
              </div>
            </div>
          </Panel>

          <Panel title="Delivery & Engagement Events">
            <ol className="relative space-y-3.5 pl-5">
              <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-border" />
              {comm.events.map((e, i) => (
                <li key={`${e.label}-${i}`} className="relative">
                  <span className="absolute top-1 -left-5 size-[11px] rounded-full border-2 border-card bg-primary/70" />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-medium text-foreground">{e.label}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{e.at}</span>
                  </div>
                  {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                </li>
              ))}
            </ol>
            {comm.engagement === null && (
              <p className="mt-3 rounded-md border border-dashed border-border-strong bg-surface px-3 py-2 text-xs text-muted-foreground">
                Open / read tracking is not available for this send, so engagement is reported as not
                trackable rather than assumed.
              </p>
            )}
            {comm.outcomeNote && (
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {comm.outcomeNote}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
