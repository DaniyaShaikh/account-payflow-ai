import { Link } from "@tanstack/react-router";
import { Inbox, Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
}) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 && <span className="opacity-40">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="text-[21px] leading-tight font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
          <div>
            <h2 className="text-[13.5px] font-semibold tracking-tight text-foreground">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={cn(title ? "px-5 py-4" : "px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  trend?: { direction: "up" | "down" | "flat"; text: string };
  tone?: "neutral" | "primary";
}) {
  const trendColor =
    trend?.direction === "up"
      ? "text-success"
      : trend?.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card px-4 py-3.5 transition-all hover:border-border-strong hover:shadow-panel",
        tone === "primary" && "border-primary/25 bg-primary/[0.035]",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          tone === "primary" ? "bg-primary" : "bg-transparent",
        )}
      />
      <p className="text-eyebrow">{label}</p>
      <p
        className={cn(
          "tabular mt-2 text-[23px] leading-none font-bold tracking-tight",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
      {trend && (
        <p className={cn("mt-2 text-[11px] font-medium", trendColor)}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.text}
        </p>
      )}
      {hint && !trend && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const toneStyles = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  info: "bg-info/10 text-info border-info/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  ai: "bg-ai/10 text-ai border-ai/20",
} as const;

const toneDot = {
  neutral: "bg-muted-foreground/60",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  danger: "bg-destructive",
  ai: "bg-ai",
} as const;

export type Tone = keyof typeof toneStyles;

export function StatusPill({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap",
        toneStyles[tone],
      )}
    >
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", toneDot[tone])} />}
      {children}
    </span>
  );
}

/** Subtle loading placeholder used while a view settles. */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("skeleton block h-4 w-full", className)} />;
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "Active":
      return "info";
    case "Promise to Pay":
      return "warning";
    case "Payment Plan":
      return "neutral";
    case "Human Review":
      return "danger";
    case "Resolved":
      return "success";
    default:
      return "neutral";
  }
}

export function DataTable({
  head,
  children,
  minWidth = 720,
}: {
  head: ReactNode[];
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="panel max-h-[70vh] overflow-auto">
      <table className="w-full border-collapse text-[13px]" style={{ minWidth }}>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border">
            {head.map((h, i) => (
              <th
                key={i}
                className="text-eyebrow bg-card px-4 py-3 text-left font-semibold whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string | undefined;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border/70 transition-colors last:border-0 hover:bg-surface",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3.5 align-middle whitespace-nowrap", className)}>{children}</td>
  );
}

export function PrimaryCell({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="leading-tight">
      <span className="block text-[13px] font-semibold text-foreground">{title}</span>
      {subtitle && (
        <span className="tabular mt-0.5 block text-[11px] text-muted-foreground">{subtitle}</span>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface px-4 py-10 text-center">
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 transition-colors focus-within:border-primary",
        className,
      )}
    >
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 transition-colors hover:border-border-strong">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[13px] font-medium text-foreground outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  className?: string | undefined;
}) {
  return (
    <div className={cn("mb-5 flex gap-1 overflow-x-auto border-b border-border", className)}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
            active === t
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function PlaceholderSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <Panel title={title} description={description}>
      <div className="rounded-lg border border-dashed border-border-strong bg-surface px-4 py-10 text-center">
        <p className="text-[13px] font-medium text-foreground">Coming in a later step</p>
        {items && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {items.map((item) => (
              <StatusPill key={item}>{item}</StatusPill>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12px] font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const controlClass =
  "h-9 w-full rounded-md border border-border bg-card px-2.5 text-[13px] text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/15 disabled:opacity-60";

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(controlClass, className)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  rows?: number | undefined;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className="w-full rounded-md border border-border bg-card px-2.5 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/15 disabled:opacity-60"
    />
  );
}

export function SelectInput({
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(controlClass, className)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function ChoiceCard({
  title,
  description,
  selected,
  disabled,
  badge,
  onSelect,
}: {
  title: string;
  description: string;
  selected?: boolean;
  disabled?: boolean | undefined;
  badge?: string | undefined;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "rounded-lg border bg-card p-4 text-left transition-all",
        selected
          ? "border-primary bg-accent/40 ring-1 ring-primary/25"
          : "border-border hover:border-border-strong hover:shadow-subtle",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        {badge && <StatusPill>{badge}</StatusPill>}
        {selected && !badge && <StatusPill tone="info">Selected</StatusPill>}
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
    </button>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  disabled,
  badge,
  onChange,
}: {
  label: string;
  description?: string | undefined;
  checked: boolean;
  disabled?: boolean | undefined;
  badge?: string | undefined;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-foreground">{label}</p>
          {badge && <StatusPill>{badge}</StatusPill>}
        </div>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-secondary border border-border",
          disabled && "cursor-not-allowed opacity-50",
        )}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-card shadow-sm transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "secondary",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-all disabled:opacity-50",
        variant === "primary" &&
          "bg-primary text-primary-foreground shadow-subtle hover:bg-primary/90",
        variant === "secondary" && "border border-border bg-card text-foreground hover:bg-surface",
        variant === "ghost" && "text-muted-foreground hover:text-foreground",
        variant === "danger" &&
          "border border-destructive/30 text-destructive hover:bg-destructive/10",
        className,
      )}
    >
      {children}
    </button>
  );
}
