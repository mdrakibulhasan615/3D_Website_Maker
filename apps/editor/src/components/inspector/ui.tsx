"use client";

/** Small, dumb UI building blocks shared by every inspector panel. No store access here. */
import type { ReactNode } from "react";

export const INPUT =
  "w-full min-w-0 rounded border border-neutral-200 bg-white px-2 py-1 text-xs placeholder:text-neutral-400 focus:border-indigo-400 focus:outline-none";

/** A collapsible section. <details>/<summary> gives open/close + keyboard support for free. */
export function Group({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group/section border-b border-neutral-100">
      <summary className="flex cursor-pointer select-none list-none items-center justify-between px-3 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-neutral-400 transition-transform group-open/section:rotate-90">›</span>
      </summary>
      <div className="flex flex-col gap-1.5 px-3 pb-3">{children}</div>
    </details>
  );
}

/** Label on the left, control on the right. */
export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-2">
      {typeof label === "string" ? <span className="truncate text-[11px] text-neutral-500">{label}</span> : label}
      {children}
    </div>
  );
}

export type SegmentOption = { value: string; label: ReactNode; title?: string };

/** A row of toggle buttons ("segmented control"). `dim` = the shown value is inherited, not set here. */
export function Segmented({
  value,
  options,
  onChange,
  dim,
}: {
  value: string | undefined;
  options: SegmentOption[];
  onChange: (value: string) => void;
  dim?: boolean;
}) {
  return (
    <div className="flex rounded-md bg-neutral-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title ?? (typeof o.label === "string" ? o.label : o.value)}
          onClick={() => onChange(o.value)}
          className={`flex-1 truncate rounded px-1 py-0.5 text-[11px] ${
            value === o.value
              ? `bg-white shadow-sm ${dim ? "text-neutral-400" : "font-medium text-neutral-900"}`
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
