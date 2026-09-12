import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, CheckCircle2, AlertCircle, CalendarClock, Lock } from "lucide-react";
import { accountForPaymentToken, maskedReference, planOptions, planIllustrativeNote } from "@/lib/payment-data";
import { brandingFor } from "@/lib/communication-data";
import { clientName, formatCurrency } from "@/lib/payflow-data";
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
  component: CustomerPaymentExperience;
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

function referenceCode(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 1000000;
  return `PMT-${String(hash).padStart(6, "0")}`;
}

const firstPaymentDate = "20 Sep 2026";
const paymentDate = "12 Sep 2026";

function CustomerPaymentExperience() {
  const { token } = Route.useParams();
  const account = accountForPaymentToken(token)!;
  const brand = brandingFor(account.clientId);

  const [step, setStep] = useState<Step>("options");
  const [mode, setMode] = useState<Mode>("full");
  const [method, setMethod] = useState<Method>("Card");
  const [partialInput, setPartialInput] = useState("");
  const [planPayments, setPlanPayments] = useState(planOptions[0]!.payments);
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  const outstanding = account.outstanding;
  const partialAmount = Math.min(Math.max(Number(partialInput) || 0, 0), outstanding);
  const remainingAfterPartial = Math.max(outstanding - partialAmount, 0);
  const installment = outstanding / planPayments;
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
      <header className={cn("px-5 py-5", brand.headerClass)}>
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

            <dl className="overflow-hidden rounded-xl border border-border bg-card">
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
          <StepCard title="Set Up a Payment Plan" onBack={() => setStep("options")}>
            <Row label="Outstanding Balance" value={formatCurrency(outstanding)} />
            <p className="text-[13px] text-muted-foreground">Select your preferred payment arrangement.</p>
            <div className="space-y-2.5">
              {planOptions.map((option) => {
                const selected = planPayments === option.payments;
                return (
                  <button
                    key={option.id}
                    onClick={() => setPlanPayments(option.payments)}
                    className={cn(
                      "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                      selected
                        ? "border-foreground bg-card"
                        : "border-border bg-card hover:bg-surface",
                    )}
                  >
                    <p className="text-[14px] font-semibold text-foreground">
                      {option.label} · {option.payments} payments
                    </p>
                    <p className="tabular mt-0.5 text-[13px] text-muted-foreground">
                      Approximately {formatCurrency(outstanding / option.payments)} each · {option.note}
                    </p>
                  </button>
                );
              })}
            </div>
            <button className={accentBtn} onClick={() => startReview("plan")}>
              Continue
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
            <Row label="Outstanding Balance" value={formatCurrency(outstanding)} />
            <Row label="Number of Payments" value={String(planPayments)} />
            <Row label="Estimated Payment" value={formatCurrency(installment)} emphasis />
            <Row label="First Payment" value={firstPaymentDate} />
            <Row label="Payment Method" value={method} />
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
              <RowPlain label="Plan Amount" value={formatCurrency(outstanding)} />
              <RowPlain label="Number of Payments" value={String(planPayments)} />
              <RowPlain label="Estimated Payment" value={formatCurrency(installment)} />
              <RowPlain label="Next Payment" value={firstPaymentDate} />
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
