import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Btn, Skeleton, StatusPill } from "./payflow-ui";
import { percentage, subjectInsight, type SubjectMetrics } from "@/lib/email-subject-data";

export function SubjectInsightButton({
  row,
  label,
  context,
  onDetails,
}: {
  row: SubjectMetrics | undefined;
  label: string;
  context: string;
  onDetails: (row: SubjectMetrics) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!open || ready) return;
    const timer = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(timer);
  }, [open, ready]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-ai"
                aria-label={`Generate AI insights for ${label}`}
              >
                <Sparkles className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Generate AI insights</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-32px)]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">AI insight</h3>
          <StatusPill tone="ai">Simulated</StatusPill>
        </div>
        {!ready ? (
          <div role="status" className="mt-3 space-y-2">
            <Skeleton />
            <Skeleton />
            <p className="text-xs text-muted-foreground">Generating insight…</p>
          </div>
        ) : row ? (
          <>
            <p className="mt-3 text-xs font-semibold leading-relaxed">{row.subject}</p>
            <p className="mt-2 text-xs leading-relaxed">{subjectInsight(row)}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {context} · {row.delivered.toLocaleString()} delivered · {percentage(row.openRate)}{" "}
              estimated opens · {percentage(row.clickRate)} clicks · {row.completed} completed
              payments · {percentage(row.conversion)} conversion.
            </p>
            <Btn
              className="mt-3"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                onDetails(row);
              }}
            >
              View Details
            </Btn>
          </>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Not enough qualifying data in this selection.
          </p>
        )}
        <p className="mt-3 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
          Mock insight, not live AI. Results also depend on timing, email body and account context;
          suggestions still require compliance checks and human approval.
        </p>
      </PopoverContent>
    </Popover>
  );
}
