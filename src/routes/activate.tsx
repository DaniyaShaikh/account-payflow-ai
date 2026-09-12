import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import loginVisual from "@/assets/login-visual.jpg";
import { PayflowWordmark } from "@/components/brand";
import { Btn, Field } from "@/components/payflow-ui";

type ActivateSearch = {
  token: string | undefined;
  email: string | undefined;
};

export const Route = createFileRoute("/activate")({
  validateSearch: (search: Record<string, unknown>): ActivateSearch => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
    email: typeof search["email"] === "string" ? search["email"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Set Up Your Account — PayFlow" },
      {
        name: "description",
        content:
          "Activate your PayFlow account by creating a password from your invitation link.",
      },
      { property: "og:title", content: "Set Up Your Account — PayFlow" },
      {
        property: "og:description",
        content: "Create a password to activate your PayFlow account.",
      },
    ],
  }),
  component: ActivatePage,
});

/**
 * Prototype invitation link states. The illustrative token decides which state
 * the screen shows — no authentication or token verification is performed.
 *   ?token=expired   → invalid / expired invitation
 *   ?token=activated → account already activated
 *   anything else     → password setup
 */
function linkState(token: string | undefined) {
  if (token === "expired" || token === "invalid") return "invalid" as const;
  if (token === "activated" || token === "used") return "activated" as const;
  return "setup" as const;
}

const requirements = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
];

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-border bg-card px-2.5 pr-14 text-[13px] text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/15"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-2 my-auto h-6 rounded px-1 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <img
          src={loginVisual}
          alt=""
          width={1024}
          height={1536}
          className="absolute inset-0 size-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/20" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <PayflowWordmark tagline invert />
          <div className="max-w-md">
            <h2 className="text-[30px] leading-tight font-bold tracking-tight text-white">
              Welcome to the collections operations workspace.
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/70">
              Your access has been set up by your Operations Admin. Create a password to activate
              your account.
            </p>
            <ul className="mt-6 space-y-2 text-[12.5px] text-white/60">
              <li>· Client portfolios and customer accounts</li>
              <li>· Collection cases and adaptive workflows</li>
              <li>· Governed AI decisions with human review</li>
            </ul>
          </div>
          <p className="text-[11px] text-white/40">Prototype environment · illustrative data</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden">
            <PayflowWordmark tagline />
          </div>
          <div className="mt-8 lg:mt-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ActivatePage() {
  const navigate = useNavigate();
  const { token, email } = Route.useSearch();
  const state = linkState(token);
  const invitedEmail = email ?? "zeeshan@payflow.ai";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [requested, setRequested] = useState(false);

  const goToSignIn = () => navigate({ to: "/login" });

  if (state === "invalid") {
    return (
      <AuthLayout>
        <h1 className="text-[24px] font-bold tracking-tight text-foreground">
          This invitation link is no longer valid.
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Invitation links expire for security. Request a new invitation and your Operations Admin
          will send a fresh activation link to your work email.
        </p>
        {requested && (
          <p className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-[12.5px] text-foreground">
            A new invitation has been requested. Your Operations Admin will be notified.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <Btn
            variant="primary"
            className="w-full justify-center"
            onClick={() => setRequested(true)}
          >
            Request New Invitation
          </Btn>
          <Btn className="w-full justify-center" onClick={goToSignIn}>
            Back To Sign In
          </Btn>
        </div>
      </AuthLayout>
    );
  }

  if (state === "activated") {
    return (
      <AuthLayout>
        <h1 className="text-[24px] font-bold tracking-tight text-foreground">
          This account is already active
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {invitedEmail} has already completed account setup. Sign in with your existing password to
          continue.
        </p>
        <div className="mt-6">
          <Btn variant="primary" className="w-full justify-center" onClick={goToSignIn}>
            Continue to Sign In
          </Btn>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout>
        <h1 className="text-[24px] font-bold tracking-tight text-foreground">
          Your account is ready
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Your password has been set successfully. You can now sign in to PayFlow.
        </p>
        <div className="mt-6">
          <Btn variant="primary" className="w-full justify-center" onClick={goToSignIn}>
            Continue to Sign In
          </Btn>
        </div>
      </AuthLayout>
    );
  }

  const submit = () => {
    const unmet = requirements.filter((r) => !r.test(password));
    if (unmet.length > 0) {
      setError("Your password doesn't meet the requirements below.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setDone(true);
  };

  return (
    <AuthLayout>
      <h1 className="text-[24px] font-bold tracking-tight text-foreground">Set up your account</h1>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        Create a password to activate your PayFlow account.
      </p>

      <div className="mt-6 space-y-4">
        <Field label="Work Email">
          <div className="flex h-9 items-center justify-between rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground">
            <span>{invitedEmail}</span>
            <span className="text-[11px] font-medium text-muted-foreground">Invited</span>
          </div>
        </Field>

        <div>
          <Field label="New Password">
            <PasswordInput
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              placeholder="Create a password"
            />
          </Field>
          <ul className="mt-2 space-y-1">
            {requirements.map((r) => {
              const met = r.test(password);
              return (
                <li
                  key={r.label}
                  className={`flex items-center gap-1.5 text-[11.5px] ${
                    met ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  <span aria-hidden>{met ? "✓" : "·"}</span>
                  {r.label}
                </li>
              );
            })}
          </ul>
        </div>

        <Field label="Confirm Password">
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            placeholder="Re-enter your password"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6">
        <Btn variant="primary" className="w-full justify-center" onClick={submit}>
          Set Password &amp; Continue
        </Btn>
      </div>

    </AuthLayout>
  );
}
