import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,122,61,0.06),0_8px_24px_-16px_rgba(15,122,61,0.25)] ${className}`}>{children}</div>;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  full?: boolean;
  loading?: boolean;
}

export function Button({ variant = "primary", full, loading, className = "", children, disabled, ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";
  const variants: Record<string, string> = {
    primary: "bg-brand-500 text-white shadow-sm hover:bg-brand-600",
    secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
    ghost: "bg-transparent text-ink-700 hover:bg-black/5",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}

export function TopBar({ title, right, subtitle }: { title: ReactNode; right?: ReactNode; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-5 pb-3">
      <div>
        <h1 className="text-lg font-bold text-ink-900">{title}</h1>
        {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-5 w-5 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin ${className}`} />;
}

export function CenterLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner />
    </div>
  );
}

export function EmptyState({ icon = "🌱", title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-ink-700 font-medium">{title}</p>
      {subtitle && <p className="text-ink-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
      داده نمونه
    </span>
  );
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    REQUESTED: "bg-slate-100 text-slate-600",
    SEARCHING_COLLECTOR: "bg-amber-100 text-amber-700",
    ASSIGNED: "bg-amber-100 text-amber-700",
    ACCEPTED: "bg-sky-100 text-sky-700",
    ON_THE_WAY: "bg-sky-100 text-sky-700",
    ARRIVED: "bg-sky-100 text-sky-700",
    COLLECTED: "bg-violet-100 text-violet-700",
    WEIGHING: "bg-violet-100 text-violet-700",
    COMPLETED: "bg-brand-100 text-brand-700",
    CANCELLED: "bg-red-100 text-red-600",
  };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${styles[status] || "bg-slate-100 text-slate-600"}`}>{label}</span>;
}

export function Screen({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`max-w-md mx-auto pb-28 ${className}`}>{children}</div>;
}
