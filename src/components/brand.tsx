import logoAsset from "@/assets/payflow-logo.png.asset.json";
import markAsset from "@/assets/payflow-mark.png.asset.json";
import { cn } from "@/lib/utils";

/** Full PayFlow lockup (mark + wordmark + tagline). Use where there is room. */
export function PayflowLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="PayFlow — Automate. Engage. Recover."
      className={cn("h-14 w-auto object-contain", className)}
    />
  );
}

/** Compact PayFlow symbol for sidebars, headers and dense surfaces. */
export function PayflowMark({ className }: { className?: string }) {
  return (
    <img
      src={markAsset.url}
      alt="PayFlow"
      className={cn("size-8 shrink-0 object-contain", className)}
    />
  );
}

/** Mark plus wordmark, sized for navigation chrome. */
export function PayflowWordmark({
  className,
  tagline = false,
  invert = false,
}: {
  className?: string;
  tagline?: boolean;
  invert?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <PayflowMark className="size-8" />
      <span className="leading-none">
        <span
          className={cn(
            "block text-[16px] font-extrabold tracking-tight",
            invert ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Pay<span className="text-primary">Flow</span>
        </span>
        {tagline && (
          <span
            className={cn(
              "mt-1 block text-[8.5px] font-semibold tracking-[0.16em] uppercase",
              invert ? "text-sidebar-muted" : "text-muted-foreground",
            )}
          >
            Automate. Engage. Recover.
          </span>
        )}
      </span>
    </span>
  );
}
