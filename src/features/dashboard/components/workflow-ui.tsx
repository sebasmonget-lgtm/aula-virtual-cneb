"use client";

import { useEffect, useRef, type ComponentProps, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Inbox, LoaderCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageIntro({ eyebrow, title, description, icon: Icon }: { eyebrow?: string; title: string; description?: string; icon?: LucideIcon }) {
  return <header className="ayni-page-intro">
    {Icon && <span className="ayni-page-icon"><Icon aria-hidden="true" className="size-5" /></span>}
    <div className="min-w-0">{eyebrow && <p className="ayni-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="ayni-page-description">{description}</p>}</div>
  </header>;
}

export type WorkflowTab<T extends string> = { id: T; label: string; shortLabel?: string; icon?: LucideIcon };
export function WorkflowTabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly WorkflowTab<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = scroller.current;
    const active = container?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!container || !active) return;
    container.scrollTo({ left: active.offsetLeft - container.offsetLeft - (container.clientWidth - active.clientWidth) / 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [value]);
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  }
  return <div className="ayni-tabs-scroll" ref={scroller}><div className="ayni-tabs" role="tablist" aria-label={label} style={{ "--tab-count": tabs.length } as CSSProperties}>
    {tabs.map((tab, index) => { const Icon = tab.icon; return <button key={tab.id} type="button" role="tab" aria-selected={value === tab.id} tabIndex={value === tab.id ? 0 : -1} onKeyDown={(event) => onKeyDown(event, index)} onClick={() => onChange(tab.id)} className="ayni-tab">
      {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}<span className="hidden sm:inline">{tab.label}</span><span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
    </button>; })}
  </div></div>;
}

export function AsyncButton({ busy, busyLabel, children, disabled, ...props }: ComponentProps<typeof Button> & { busy?: boolean; busyLabel: string }) {
  return <Button {...props} disabled={busy || disabled} aria-busy={busy || undefined}>{busy ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{busyLabel}</> : children}</Button>;
}

export function WorkflowFeedback({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "error" }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return <div className={`ayni-feedback ayni-feedback--${tone}`} role={tone === "error" ? "alert" : "status"}><Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{children}</span></div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="ayni-empty"><span className="ayni-empty-icon"><Inbox className="size-5" aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p>{action && <div className="mt-3">{action}</div>}</div></div>;
}

export function LoadingState({ label }: { label: string }) {
  return <div className="ayni-loading" role="status"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{label}</div>;
}

export function ReadOnlyField({ label, value }: { label: string; value: string | string[] | null | undefined }) {
  const text = Array.isArray(value) ? value.join("\n") : value;
  return <div className="ayni-readonly-field"><h4>{label}</h4><p>{text?.trim() || "Sin información registrada."}</p></div>;
}

export function ScreenSkeleton() {
  return <div className="mx-auto max-w-4xl space-y-5 p-1" role="status" aria-label="Cargando aula"><div className="ayni-skeleton h-24 rounded-3xl" /><div className="ayni-skeleton h-12 max-w-2xl rounded-xl" /><div className="ayni-skeleton h-64 rounded-2xl" /></div>;
}
