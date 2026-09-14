import logoAsset from "@/assets/payflow-logo-transparent.png.asset.json";
import markAsset from "@/assets/payflow-mark-transparent.png.asset.json";
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
  tagline: _tagline = false,
  invert = false,
}: {
  className?: string;
  tagline?: boolean;
  invert?: boolean;
}) {
  return (
    <img
      src={logoAsset.url}
      alt="PayFlow — Automate. Engage. Recover."
      className={cn(
        "h-11 w-auto max-w-full object-contain object-left",
        invert && "brightness-0 invert",
        className,
      )}
    />
  );
}
