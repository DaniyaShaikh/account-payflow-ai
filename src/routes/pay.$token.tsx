import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, CheckCircle2, AlertCircle, CalendarClock, Lock } from "lucide-react";
import { accountForPaymentToken, maskedReference, planIllustrativeNote } from "@/lib/payment-data";
import { brandingFor } from "@/lib/communication-data";
import { clientName, defaultPlanLimits, formatCurrency } from "@/lib/payflow-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pay/$token")({
  head: () => ({
    meta: [
      { title: "Make a payment — secure payment page" },
      {
        name: "description",
        content:
          "Securely review your outstanding balance and pay in full, make a partial payment, or set up a payment arrangement.",
      },
      { property: "og:title", content: "Make a payment — secure payment page" },
      {
        property: "og:description",
        content: "Review your balance and choose how you would like to pay.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ params }) => {
    if (!accountForPaymentToken(params.token)) throw notFound();
    return null;
  },
  component: CustomerPaymentExperience,
});

type Step =
  | "options"
  | "full"
  | "partial"
  | "plan"
  | "review"
  | "success"
  | "plan-success"
  | "failure";

type Mode = "full" | "partial" | "plan";
type Method = "Card" | "Bank Account";
type Frequency = "Weekly" | "Bi-Weekly" | "Monthly";

interface PlanChoice {
  frequency: Frequency;
  payments: number;
  installment: number;
  suggested: boolean;
}

function referenceCode(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 1000000;
  return `PMT-${String(hash).padStart(6, "0")}`;
}

const paymentDate = "12 Sep 2026";
/** Fixed demo "today" so dates render identically on server and client. */
const demoToday = "2026-09-12";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseISO(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
}

function formatDate(date: Date) {
  return `${String(date.getUTCDate()).padStart(2, "0")} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function addIntervals(date: Date, frequency: Frequency, count: number) {
  const next = new Date(date.getTime());
  if (frequency === "Weekly") next.setUTCDate(next.getUTCDate() + count * 7);
  else if (frequency === "Bi-Weekly") next.setUTCDate(next.getUTCDate() + count * 14);
  else next.setUTCMonth(next.getUTCMonth() + count);
  return next;
}

const frequencyMeta: Record<Frequency, { label: string; every: string; note: string }> = {
  Weekly: { label: "Weekly", every: "every week", note: "Sync with a weekly pay cycle" },
  "Bi-Weekly": { label: "Bi-Weekly", every: "every two weeks", note: "Matches a fortnightly pay cycle" },
  Monthly: { label: "Monthly", every: "every month", note: "One payment each month" },
};

const frequencies: Frequency[] = ["Weekly", "Bi-Weekly", "Monthly"];

function CustomerPaymentExperience() {
  const { token } = Route.useParams();
  const account = accountForPaymentToken(token)!;
  const brand = brandingFor(account.clientId);

  const [step, setStep] = useState<Step>("options");
  const [mode, setMode] = useState<Mode>("full");
  const [method, setMethod] = useState<Method>("Card");
  const [partialInput, setPartialInput] = useState("");
  const [planTotalInput, setPlanTotalInput] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanChoice | null>(null);
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  const outstanding = account.outstanding;
  const partialAmount = Math.min(Math.max(Number(partialInput) || 0, 0), outstanding);
  const remainingAfterPartial = Math.max(outstanding - partialAmount, 0);

  // One-page plan builder: amount first, then calculated plans per frequency.
  const planTotal = Math.min(
    Math.max(Number(planTotalInput) || outstanding, 0),
    outstanding,
  );
  const planTier =
    defaultPlanLimits.find(
      (r) => planTotal > r.minBalance && (r.maxBalance === null || planTotal <= r.maxBalance),
    ) ?? defaultPlanLimits[defaultPlanLimits.length - 1]!;
  const maxPaymentsFor: Record<Frequency, number> = {
    Weekly: planTier.maxTermMonths * 4,
    "Bi-Weekly": planTier.maxTermMonths * 2,
    Monthly: planTier.maxTermMonths,
  };
  const preferredPayments: Record<Frequency, number> = { Weekly: 12, "Bi-Weekly": 12, Monthly: 6 };

  function planFor(frequency: Frequency, suggested: boolean): PlanChoice {
    const cap = maxPaymentsFor[frequency];
    let payments = suggested ? cap : Math.min(preferredPayments[frequency], cap);
    let installment = Math.ceil(planTotal / payments);
    if (installment < 5) {
      payments = Math.max(1, Math.floor(planTotal / 5));
      installment = Math.ceil(planTotal / payments);
    }
    return { frequency, payments, installment, suggested };
  }

  // Best practice: spread the balance over the longest term the client's limits allow.
  const suggestedPlan = planFor("Monthly", true);
  const planCards: PlanChoice[] = [
    suggestedPlan,
    planFor("Bi-Weekly", false),
    planFor("Weekly", false),
  ];
  const activePlan = selectedPlan ?? suggestedPlan;

  const startDate = parseISO(demoToday);
  const firstPaymentDate = formatDate(startDate);
  const finalPaymentDate = formatDate(
    addIntervals(startDate, activePlan.frequency, activePlan.payments - 1),
  );
  const amountToPay = mode === "partial" ? partialAmount : outstanding;
  const firstName = account.customer.split(" ")[0];

  function startReview(nextMode: Mode) {
    setMode(nextMode);
    setStep("review");
  }

  function confirmPayment() {
    if (simulateDecline) {
      setStep("failure");
      return;
    }
    if (mode === "plan") {
      setStep("plan-success");
      return;
    }
    setPaidAmount(amountToPay);
    setStep("success");
  }

  const accentBtn = cn(
    "w-full rounded-lg px-4 py-3 text-[15px] font-semibold transition-opacity hover:opacity-90",
    brand.accentClass,
  );
  const outlineBtn =
    "w-full rounded-lg border border-border-strong bg-card px-4 py-3 text-[14px] font-medium text-foreground transition-colors hover:bg-surface";

  return (
    <div className="min-h-screen bg-surface">
      <header className={cn("px-5 py-5 shadow-subtle", brand.headerClass)}>
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <span className="text-[17px] font-bold tracking-tight">{brand.name}</span>
          <span className="inline-flex items-center gap-1.5 text-[12px] opacity-90">
            <Lock className="size-3.5" aria-hidden="true" /> Secure Payment
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 sm:py-8">
        {step === "options" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
                Payment Details
              </h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                Hello {firstName}, you currently have an outstanding balance associated with your
                account.
              </p>
            </div>

            <dl className="overflow-hidden rounded-xl border border-border bg-card shadow-subtle">
              <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                <dt className="text-[13px] text-muted-foreground">Account Reference</dt>
                <dd className="tabular text-[14px] font-medium text-foreground">
                  {maskedReference(account.reference)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                <dt className="text-[13px] text-muted-foreground">Outstanding Balance</dt>
                <dd className="tabular text-[14px] font-medium text-foreground">
                  {formatCurrency(outstanding)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-[13px] font-medium text-foreground">Amount Due</dt>
                <dd className="tabular text-[18px] font-semibold text-foreground">
                  {formatCurrency(outstanding)}
                </dd>
              </div>
            </dl>

            <div className="space-y-2.5">
              <button className={accentBtn} onClick={() => setStep("full")}>
                Pay in Full · {formatCurrency(outstanding)}
              </button>
              <button className={outlineBtn} onClick={() => setStep("partial")}>
                Make a Partial Payment
              </button>
              <button className={outlineBtn} onClick={() => setStep("plan")}>
                Set Up a Payment Plan
              </button>
            </div>

            <SecurityNote brandName={brand.name} />
          </section>
        )}

        {step === "full" && (
          <StepCard title="Pay in Full" onBack={() => setStep("options")}>
            <Row label="Amount to Pay" value={formatCurrency(outstanding)} emphasis />
            <MethodPicker method={method} setMethod={setMethod} />
            <button className={accentBtn} onClick={() => startReview("full")}>
              Continue to Payment
            </button>
          </StepCard>
        )}

        {step === "partial" && (
          <StepCard title="Make a Partial Payment" onBack={() => setStep("options")}>
            <Row label="Outstanding Balance" value={formatCurrency(outstanding)} />
            <div>
              <label
                htmlFor="partial-amount"
                className="mb-1.5 block text-[13px] font-medium text-foreground"
              >
                Payment Amount
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-card px-3 py-2.5">
                <span className="text-[15px] text-muted-foreground">$</span>
                <input
                  id="partial-amount"
                  inputMode="decimal"
                  value={partialInput}
                  onChange={(e) => setPartialInput(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  className="tabular w-full bg-transparent text-[15px] text-foreground outline-none"
                />
              </div>
            </div>
            <Row label="Remaining Balance after payment" value={formatCurrency(remainingAfterPartial)} />
            <MethodPicker method={method} setMethod={setMethod} />
            <button
              className={cn(accentBtn, partialAmount <= 0 && "pointer-events-none opacity-50")}
              aria-disabled={partialAmount <= 0}
              onClick={() => partialAmount > 0 && startReview("partial")}
            >
              Continue
            </button>
          </StepCard>
        )}

        {step === "plan" && (
          <StepCard title="Set up a payment plan" onBack={() => setStep("options")}>
            <Row label="Outstanding Balance" value={formatCurrency(outstanding)} />
            <div>
              <label
                htmlFor="plan-total"
                className="mb-1.5 block text-[13px] font-medium text-foreground"
              >
                Amount you would like to pay off
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-card px-3 py-2.5">
                <span className="text-[15px] text-muted-foreground">$</span>
                <input
                  id="plan-total"
                  inputMode="decimal"
                  value={planTotalInput}
                  onChange={(e) => {
                    setPlanTotalInput(e.target.value.replace(/[^0-9.]/g, ""));
                    setSelectedPlan(null);
                  }}
                  placeholder={String(outstanding)}
                  className="tabular w-full bg-transparent text-[15px] text-foreground outline-none"
                />
              </div>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                Plans are available for balances of {formatCurrency(100)} or more.
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-medium text-foreground">
                Choose a plan below — everything is calculated for you
              </p>
              <div className="space-y-2.5">
                {planCards.map((card) => {
                  const selected =
                    activePlan.frequency === card.frequency &&
                    activePlan.payments === card.payments;
                  const first = formatDate(startDate);
                  const final = formatDate(
                    addIntervals(startDate, card.frequency, card.payments - 1),
                  );
                  return (
                    <button
                      key={card.frequency}
                      onClick={() => setSelectedPlan(card)}
                      aria-pressed={selected}
                      className={cn(
                        "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                        selected
                          ? "border-foreground bg-card ring-1 ring-foreground/15"
                          : "border-border bg-card hover:bg-surface",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-semibold text-foreground">
                          {frequencyMeta[card.frequency].label}
                        </p>
                        {card.suggested && (
                          <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10.5px] font-semibold text-success">
                            Suggested plan
                          </span>
                        )}
                      </div>
                      <p className="tabular mt-1 text-[15px] font-semibold text-foreground">
                        {formatCurrency(card.installment)}{" "}
                        <span className="text-[13px] font-normal text-muted-foreground">
                          {frequencyMeta[card.frequency].every} · {card.payments} payments
                        </span>
                      </p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        First payment {first} · final payment {final} · completes in{" "}
                        {card.payments} {card.frequency === "Monthly" ? "months" : card.frequency === "Bi-Weekly" ? "fortnights" : "weeks"}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                Our suggested plan follows best practice: smaller monthly payments over the longest
                term available for this balance. You can pick any other plan instead.
              </p>
            </div>

            <button className={accentBtn} onClick={() => startReview("plan")}>
              Continue with the {frequencyMeta[activePlan.frequency].label} plan
            </button>
            <p className="text-[12px] leading-relaxed text-muted-foreground">{planIllustrativeNote}</p>
          </StepCard>
        )}


        {step === "review" && mode !== "plan" && (
          <StepCard
            title="Payment Summary"
            onBack={() => setStep(mode === "partial" ? "partial" : "full")}
          >
            <Row label="Amount" value={formatCurrency(amountToPay)} emphasis />
            <Row label="Account" value={maskedReference(account.reference)} />
            <Row label="Payment Method" value={method} />
            {mode === "partial" && (
              <Row label="Remaining Balance" value={formatCurrency(remainingAfterPartial)} />
            )}
            <DemoToggle checked={simulateDecline} onChange={setSimulateDecline} />
            <button className={accentBtn} onClick={confirmPayment}>
              Pay {formatCurrency(amountToPay)}
            </button>
            <SecurityNote brandName={brand.name} />
          </StepCard>
        )}

        {step === "review" && mode === "plan" && (
          <StepCard title="Payment Plan Review" onBack={() => setStep("plan")}>
            <Row label="Plan Total" value={formatCurrency(planTotal)} />
            <Row label="Frequency" value={frequencyMeta[activePlan.frequency].label} />
            <Row label="Instalment Amount" value={formatCurrency(activePlan.installment)} emphasis />
            <Row label="Number of Payments" value={String(activePlan.payments)} />
            <Row label="First Payment" value={firstPaymentDate} />
            <Row label="Final Payment" value={finalPaymentDate} />
            <MethodPicker method={method} setMethod={setMethod} />
            <DemoToggle checked={simulateDecline} onChange={setSimulateDecline} />
            <button className={accentBtn} onClick={confirmPayment}>
              Confirm Payment Plan
            </button>
            <p className="text-[12px] leading-relaxed text-muted-foreground">{planIllustrativeNote}</p>
          </StepCard>
        )}

        {step === "success" && (
          <section className="space-y-5 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
            <div>
              <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
                Payment Successful
              </h1>
              <p className="tabular mt-1 text-[26px] font-semibold text-foreground">
                {formatCurrency(paidAmount)}
              </p>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                Thank you. Your payment has been received.
              </p>
            </div>
            <dl className="overflow-hidden rounded-xl border border-border bg-card text-left">
              <RowPlain label="Payment Reference" value={referenceCode(`${token}-${paidAmount}`)} />
              <RowPlain label="Date" value={paymentDate} />
              <RowPlain label="Amount Paid" value={formatCurrency(paidAmount)} />
              {mode === "partial" && (
                <RowPlain label="Remaining Balance" value={formatCurrency(remainingAfterPartial)} />
              )}
              <RowPlain label="Payment Method" value={method} last />
            </dl>
            {mode === "partial" ? (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Your remaining balance is {formatCurrency(remainingAfterPartial)}. We will be in touch
                about the rest of your balance.
              </p>
            ) : (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Your balance is now cleared. No further payment is required.
              </p>
            )}
            <div className="space-y-2.5">
              <button className={outlineBtn} onClick={() => window.print()}>
                View Receipt
              </button>
              <button className={outlineBtn} onClick={() => setStep("options")}>
                Return
              </button>
            </div>
            <SecurityNote brandName={brand.name} />
          </section>
        )}

        {step === "plan-success" && (
          <section className="space-y-5 text-center">
            <CalendarClock className="mx-auto size-12 text-success" aria-hidden="true" />
            <div>
              <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
                Payment Plan Confirmed
              </h1>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                Thank you. Your payment arrangement has been set up.
              </p>
            </div>
            <dl className="overflow-hidden rounded-xl border border-border bg-card text-left">
              <RowPlain label="Plan Total" value={formatCurrency(planTotal)} />
              <RowPlain label="Frequency" value={frequencyMeta[activePlan.frequency].label} />
              <RowPlain label="Instalment Amount" value={formatCurrency(activePlan.installment)} />
              <RowPlain label="Number of Payments" value={String(activePlan.payments)} />
              <RowPlain label="First Payment" value={firstPaymentDate} />
              <RowPlain label="Final Payment" value={finalPaymentDate} />
              <RowPlain label="Payment Method" value={method} last />
            </dl>
            <p className="text-[12px] leading-relaxed text-muted-foreground">{planIllustrativeNote}</p>
            <button className={outlineBtn} onClick={() => setStep("options")}>
              Return
            </button>
            <SecurityNote brandName={brand.name} />
          </section>
        )}

        {step === "failure" && (
          <section className="space-y-5 text-center">
            <AlertCircle className="mx-auto size-12 text-warning" aria-hidden="true" />
            <div>
              <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
                Payment Could Not Be Completed
              </h1>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                Your payment was not processed. No amount has been taken.
              </p>
            </div>
            <div className="space-y-2.5">
              <button
                className={accentBtn}
                onClick={() => {
                  setSimulateDecline(false);
                  setStep("review");
                }}
              >
                Try Again
              </button>
              <button
                className={outlineBtn}
                onClick={() => {
                  setSimulateDecline(false);
                  setMethod(method === "Card" ? "Bank Account" : "Card");
                  setStep(mode === "plan" ? "plan" : mode === "partial" ? "partial" : "full");
                }}
              >
                Choose Another Payment Method
              </button>
            </div>
            <SecurityNote brandName={brand.name} />
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-lg px-4 pb-10 text-center">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Need help? Contact {clientName(account.clientId)} customer support at the number or email
          shown on your statement.
        </p>
      </footer>
    </div>
  );
}

function StepCard({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <button
        onClick={onBack}
        className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>
      <h1 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h1>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular font-semibold text-foreground",
          emphasis ? "text-[18px]" : "text-[14px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RowPlain({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3",
        !last && "border-b border-border",
      )}
    >
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="tabular text-[14px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

function MethodPicker({
  method,
  setMethod,
}: {
  method: Method;
  setMethod: (m: Method) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-foreground">Payment Method</legend>
      <div className="grid grid-cols-2 gap-2.5">
        {(["Card", "Bank Account"] as Method[]).map((option) => (
          <button
            key={option}
            onClick={() => setMethod(option)}
            aria-pressed={method === option}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-[14px] font-medium transition-colors",
              method === option
                ? "border-foreground bg-card text-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-surface",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function DemoToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface px-3 py-2.5 text-[12px] text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5"
      />
      Demonstration only: simulate a payment that cannot be completed
    </label>
  );
}

function SecurityNote({ brandName }: { brandName: string }) {
  return (
    <p className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      Secure payment on behalf of {brandName}
    </p>
  );
}
