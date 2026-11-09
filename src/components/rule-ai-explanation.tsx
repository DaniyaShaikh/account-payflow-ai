import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { explainRule } from "@/lib/rule-explain.functions";
import type { ComplianceRule } from "@/lib/compliance-data";
import { Btn } from "./payflow-ui";

const cache = new Map<string, string>();

export function RuleAiExplanation({ rule }: { rule: ComplianceRule }) {
  const cacheKey = `${rule.id}-${rule.version}`;
  const run = useServerFn(explainRule);
  const [text, setText] = useState(cache.get(cacheKey) ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true); setError("");
    const { id, version, ...rest } = rule; void id; void version;
    const res = await run({ data: { rule: JSON.stringify(rest) } }).catch(() => ({ error: "Could not generate an explanation right now." }));
    setLoading(false);
    if ("text" in res && res.text) { cache.set(cacheKey, res.text); setText(res.text); } else setError(("error" in res && res.error) || "No explanation returned.");
  };
  return <aside className="rounded-xl border border-primary/30 bg-primary/5 p-4">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold">✦ AI explanation</h3>
      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">AI generated</span>
    </div>
    <p className="mb-3 text-xs text-muted-foreground">A plain-language summary of this rule. It may be imperfect and is not legal advice — the rule settings are the source of truth.</p>
    {text ? <div className="space-y-2 text-sm">{text.split("\n").filter(Boolean).map((l, i) => /^(What it is|When it applies|What happens)/i.test(l.trim()) ? <h4 key={i} className="pt-1 text-xs font-semibold text-primary">{l.replace(/[:#*]/g, "").trim()}</h4> : <p key={i} className="text-foreground/90">{l}</p>)}</div>
      : !error && <p className="text-sm text-muted-foreground">{loading ? "Writing explanation…" : "No explanation yet."}</p>}
    {error && <p className="text-sm text-destructive">{error}</p>}
    <Btn className="mt-3" onClick={generate} disabled={loading}>{loading ? "Generating…" : text ? "Regenerate" : "Explain this rule"}</Btn>
  </aside>;
}
