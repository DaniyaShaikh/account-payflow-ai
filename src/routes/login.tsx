import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import loginVisual from "@/assets/login-visual.jpg";
import { PayflowWordmark } from "@/components/brand";
import { Btn, Field, TextInput } from "@/components/payflow-ui";
import { markSignedIn } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — PayFlow Collections Operations" },
      {
        name: "description",
        content:
          "Sign in to PayFlow to manage client portfolios, customer accounts, collection cases and AI collections operations.",
      },
      { property: "og:title", content: "Sign In — PayFlow Collections Operations" },
      {
        property: "og:description",
        content: "Access the PayFlow collections operations workspace.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("daniya@payflow.ai");
  const [password, setPassword] = useState("demo-preview");
  const [mode, setMode] = useState<"signIn" | "forgot">("signIn");
  const [sent, setSent] = useState(false);

  const signIn = () => {
    markSignedIn();
    // The platform product selector is always the first screen after sign-in.
    navigate({ to: "/products" });
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
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
              Collections operations, orchestrated end to end.
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/70">
              Client portfolios, customer accounts, collection cases, adaptive workflows and
              governed AI decisions — in one operational workspace.
            </p>
            <ul className="mt-6 space-y-2 text-[12.5px] text-white/60">
              <li>· Adaptive collection workflows with human review</li>
              <li>· Governance rules applied before every action</li>
              <li>· Customer payment experience and outcomes</li>
            </ul>
          </div>
          <p className="text-[11px] text-white/40">Prototype environment · illustrative data</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden">
            <PayflowWordmark tagline />
          </div>

          {mode === "signIn" ? (
            <div className="mt-8 lg:mt-0">
              <h1 className="text-[24px] font-bold tracking-tight text-foreground">Sign in</h1>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Continue to your collections operations workspace.
              </p>

              <div className="mt-6 space-y-4">
                <Field label="Work Email">
                  <TextInput value={email} onChange={setEmail} placeholder="you@company.com" />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-ring"
                  />
                </Field>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <input type="checkbox" defaultChecked className="size-3.5 accent-primary" />
                  Keep me signed in
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setSent(false);
                  }}
                  className="text-[12px] font-medium text-primary underline-offset-2 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="mt-6">
                <Btn variant="primary" className="w-full justify-center" onClick={signIn}>
                  Sign In
                </Btn>
              </div>

            </div>
          ) : (
<div className="mt-8 lg:mt-0">
              <h1 className="text-[24px] font-bold tracking-tight text-foreground">
                Reset password
              </h1>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Enter your work email and we'll send reset instructions.
              </p>

              <div className="mt-6">
                <Field label="Work Email">
                  <TextInput value={email} onChange={setEmail} placeholder="you@company.com" />
                </Field>
              </div>

              {sent && (
                <p className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-[12.5px] text-foreground">
                  If this email is registered, reset instructions are on the way.
                </p>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <Btn
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => setSent(true)}
                >
                  Send Reset Link
                </Btn>
                <Btn className="w-full justify-center" onClick={() => setMode("signIn")}>
                  Back To Sign In
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
