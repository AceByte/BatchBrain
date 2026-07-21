import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = "" }: PanelProps) {
  return <div className={`rounded-xl border border-border bg-card shadow-sm ${className}`.trim()}>{children}</div>;
}

type SectionHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, description, actions, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div> : null}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export function EmptyState({ title, description, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center ${className}`.trim()}>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning";
  className?: string;
};

export function StatCard({ label, value, hint, tone = "default", className = "" }: StatCardProps) {
  const toneClassName = tone === "warning" ? "border-amber-200 bg-amber-50" : "border-border bg-card";

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClassName} ${className}`.trim()}>
      <p className={`text-xs font-medium uppercase tracking-wider ${tone === "warning" ? "text-amber-800" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${tone === "warning" ? "text-amber-900" : "text-foreground"}`}>{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
