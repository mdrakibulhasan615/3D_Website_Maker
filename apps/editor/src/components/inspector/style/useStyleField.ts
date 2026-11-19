/**
 * The one hook every style control uses. It answers, for one CSS property:
 *   - own:        the value set on THIS breakpoint (or undefined)
 *   - inherited:  the value coming from a SMALLER breakpoint (mobile-first cascade)
 *   - value:      what actually applies here (own ?? inherited)
 * ...and gives `set` / `reset` functions that write to the current breakpoint.
 */
import type { PointerEvent as ReactPointerEvent } from "react";
import { BREAKPOINT_ORDER, type BreakpointId, type Node, type StyleValue } from "@msb/schema";
import { useEditor } from "@/store/editorStore";
import { formatLength, parseLength } from "./values";

export const BP_LABEL: Record<BreakpointId, string> = { base: "Mobile", md: "Tablet", lg: "Desktop" };

export type StyleField = {
  prop: string;
  own: StyleValue | undefined;
  inherited: StyleValue | undefined;
  inheritedFrom: BreakpointId | null;
  value: StyleValue | undefined;
  breakpoint: BreakpointId;
  set: (value: StyleValue | undefined) => void;
  reset: () => void;
};

export function useStyleField(node: Node, prop: string): StyleField {
  const breakpoint = useEditor((s) => s.breakpoint);
  const own = node.styles[breakpoint]?.[prop];

  let inherited: StyleValue | undefined;
  let inheritedFrom: BreakpointId | null = null;
  for (const bp of BREAKPOINT_ORDER) {
    if (bp === breakpoint) break;
    const v = node.styles[bp]?.[prop];
    if (v !== undefined) {
      inherited = v;
      inheritedFrom = bp;
    }
  }

  const set = (value: StyleValue | undefined) => useEditor.getState().setStyle(node.id, prop, value);
  return { prop, own, inherited, inheritedFrom, value: own ?? inherited, breakpoint, set, reset: () => set(undefined) };
}

export type ScrubOptions = { step?: number; min?: number; max?: number; unit?: string };

/**
 * "Scrubbing": press on a label and drag left/right to change a number (Shift = ×10).
 * Pointer capture keeps events coming even when the pointer leaves the label.
 */
export function scrubHandler(field: StyleField, options: ScrubOptions = {}) {
  return (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const start = parseLength(field.value) ?? { num: 0, unit: options.unit ?? "" };
    const startX = event.clientX;
    const el = event.currentTarget;
    el.setPointerCapture(event.pointerId);

    const onMove = (e: PointerEvent) => {
      const steps = Math.round((e.clientX - startX) / 2); // 2px of movement = 1 step
      let next = start.num + steps * (options.step ?? 1) * (e.shiftKey ? 10 : 1);
      if (options.min !== undefined) next = Math.max(options.min, next);
      if (options.max !== undefined) next = Math.min(options.max, next);
      field.set(formatLength(next, start.unit));
    };
    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
  };
}
