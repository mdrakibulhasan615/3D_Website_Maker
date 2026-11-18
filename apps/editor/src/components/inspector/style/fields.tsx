"use client";

/**
 * Reusable style controls. Each "…Row" component takes (node, prop) and wires itself
 * up through useStyleField, so sections stay short and every control behaves the same:
 * blue dot = set on this breakpoint (click to reset), grey dot = inherited.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Node, StyleValue } from "@msb/schema";
import { parseTokenRef, tokenRef } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { INPUT, Segmented, type SegmentOption } from "../ui";
import { BP_LABEL, scrubHandler, useStyleField, type ScrubOptions, type StyleField } from "./useStyleField";
import { parseStyleInput, toHex } from "./values";

// ─── Labels ──────────────────────────────────────────────────────────────────

export function FieldLabel({ label, field, scrub }: { label: string; field: StyleField; scrub?: ScrubOptions }) {
  const isOwn = field.own !== undefined;
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span
        onPointerDown={scrub ? scrubHandler(field, scrub) : undefined}
        title={scrub ? "Drag left/right to adjust (Shift = ×10)" : undefined}
        className={`truncate text-[11px] ${scrub ? "cursor-ew-resize select-none" : ""} ${
          isOwn ? "font-medium text-indigo-700" : "text-neutral-500"
        }`}
      >
        {label}
      </span>
      {isOwn ? (
        <button
          type="button"
          onClick={field.reset}
          title={`Set on ${BP_LABEL[field.breakpoint]} — click to reset`}
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 hover:ring-2 hover:ring-indigo-200"
        />
      ) : field.inheritedFrom ? (
        <span title={`Inherited from ${BP_LABEL[field.inheritedFrom]}`} className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
      ) : null}
    </span>
  );
}

export function StyleRow({ label, field, scrub, children }: { label: string; field: StyleField; scrub?: ScrubOptions; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-2">
      <FieldLabel label={label} field={field} scrub={scrub} />
      {children}
    </div>
  );
}

// ─── Inputs bound to a field ─────────────────────────────────────────────────

export function TextInput({ field, placeholder }: { field: StyleField; placeholder?: string }) {
  return (
    <input
      value={field.own === undefined ? "" : String(field.own)}
      placeholder={field.inherited !== undefined ? String(field.inherited) : placeholder}
      onChange={(e) => field.set(parseStyleInput(e.target.value))}
      className={INPUT}
    />
  );
}

export type Option = string | { value: string; label: string };

export function SelectInput({ field, options }: { field: StyleField; options: Option[] }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const inheritedLabel =
    field.inherited !== undefined
      ? (opts.find((o) => o.value === String(field.inherited))?.label ?? String(field.inherited))
      : undefined;
  return (
    <select
      value={field.own === undefined ? "" : String(field.own)}
      onChange={(e) => field.set(e.target.value || undefined)}
      className={`${INPUT} ${field.own === undefined ? "text-neutral-400" : ""}`}
    >
      <option value="">{inheritedLabel ? `${inheritedLabel} (inherited)` : "—"}</option>
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {/* Keep an unknown current value selectable instead of silently showing "—". */}
      {field.own !== undefined && !opts.some((o) => o.value === String(field.own)) && (
        <option value={String(field.own)}>{String(field.own)}</option>
      )}
    </select>
  );
}

/** Clicking the active segment again removes the override (back to inherited). */
export function SegmentedInput({ field, options }: { field: StyleField; options: SegmentOption[] }) {
  return (
    <Segmented
      value={field.value === undefined ? undefined : String(field.value)}
      dim={field.own === undefined}
      options={options}
      onChange={(v) => (v === String(field.own) ? field.reset() : field.set(v))}
    />
  );
}

// ─── Color ───────────────────────────────────────────────────────────────────

/** What a color value looks like on screen (resolving token references). */
function useResolvedColor(value: StyleValue | undefined): string {
  const colors = useEditor((s) => s.doc.tokens.colors);
  const token = parseTokenRef(value);
  if (token?.kind === "colors") return colors[token.name] ?? token.fallback ?? "transparent";
  return value === undefined ? "" : String(value);
}

/**
 * A color control with a popover: token swatches, a native picker, and a text field.
 * Not tied to a style field, so gradients can reuse it for their color stops.
 */
export function ColorInput({
  value,
  onChange,
  onReset,
  dim,
}: {
  value: StyleValue | undefined;
  onChange: (value: StyleValue | undefined) => void;
  onReset?: () => void;
  dim?: boolean;
}) {
  const colors = useEditor((s) => s.doc.tokens.colors);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const token = parseTokenRef(value);
  const preview = useResolvedColor(value);

  // Close when clicking anywhere outside the popover.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as globalThis.Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={`${INPUT} flex items-center gap-2 text-left`}>
        <span
          className="h-4 w-4 shrink-0 rounded border border-black/10"
          style={{ background: preview || "repeating-conic-gradient(#e5e5e5 0 25%, #fff 0 50%) 0 0/8px 8px" }}
        />
        <span className={`truncate ${dim ? "text-neutral-400" : ""}`}>
          {token ? `◆ ${token.name}` : value !== undefined ? String(value) : "None"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-neutral-200 bg-white p-2 shadow-xl">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Color tokens</div>
          <div className="mb-2 flex flex-wrap gap-1">
            {Object.entries(colors).map(([name, color]) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => onChange(tokenRef("colors", name))}
                className={`h-6 w-6 rounded border ${
                  token?.name === name ? "ring-2 ring-indigo-500 ring-offset-1" : "border-neutral-200"
                }`}
                style={{ background: color }}
              />
            ))}
            {Object.keys(colors).length === 0 && <span className="text-[11px] text-neutral-400">None yet — add some in Site.</span>}
          </div>
          <div className="flex gap-1">
            <input
              type="color"
              value={toHex(preview)}
              onChange={(e) => onChange(e.target.value)}
              className="h-7 w-8 shrink-0 cursor-pointer rounded border border-neutral-200 bg-white p-0.5"
            />
            <input
              value={token || value === undefined ? "" : String(value)}
              placeholder={token ? `◆ ${token.name}` : "#hex, rgb(), …"}
              onChange={(e) => onChange(parseStyleInput(e.target.value))}
              className={INPUT}
            />
          </div>
          {onReset && (
            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="mt-2 text-[11px] text-neutral-500 hover:text-neutral-800"
            >
              Reset to inherited
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ColorFieldInput({ field }: { field: StyleField }) {
  return (
    <ColorInput
      value={field.value}
      dim={field.own === undefined}
      onChange={field.set}
      onReset={field.own !== undefined ? field.reset : undefined}
    />
  );
}

// ─── One-line rows: (node, prop) → label + control ───────────────────────────

type RowProps = { node: Node; prop: string; label: string };

export function TextRow({ node, prop, label, scrub, placeholder }: RowProps & { scrub?: ScrubOptions; placeholder?: string }) {
  const field = useStyleField(node, prop);
  return (
    <StyleRow label={label} field={field} scrub={scrub}>
      <TextInput field={field} placeholder={placeholder} />
    </StyleRow>
  );
}

export function SelectRow({ node, prop, label, options }: RowProps & { options: Option[] }) {
  const field = useStyleField(node, prop);
  return (
    <StyleRow label={label} field={field}>
      <SelectInput field={field} options={options} />
    </StyleRow>
  );
}

export function SegmentedRow({ node, prop, label, options }: RowProps & { options: SegmentOption[] }) {
  const field = useStyleField(node, prop);
  return (
    <StyleRow label={label} field={field}>
      <SegmentedInput field={field} options={options} />
    </StyleRow>
  );
}

export function ColorRow({ node, prop, label }: RowProps) {
  const field = useStyleField(node, prop);
  return (
    <StyleRow label={label} field={field}>
      <ColorFieldInput field={field} />
    </StyleRow>
  );
}

/** Label-above-input, for 2-column grids (Size section). */
export function MiniField({ node, prop, label, placeholder = "auto" }: RowProps & { placeholder?: string }) {
  const field = useStyleField(node, prop);
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <FieldLabel label={label} field={field} scrub={{ min: 0 }} />
      <TextInput field={field} placeholder={placeholder} />
    </div>
  );
}
