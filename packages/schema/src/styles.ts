import type { BreakpointId, FreeLayout, Rect, ResponsiveStyles, StyleObject } from "./document";

/** Smallest → largest. Mobile-first: later breakpoints override earlier ones. */
export const BREAKPOINT_ORDER: BreakpointId[] = ["base", "md", "lg"];

/**
 * The styles that actually apply at a breakpoint, after the cascade.
 * e.g. at "md": base styles, then md overrides on top (lg is ignored).
 */
export function resolveStyle(styles: ResponsiveStyles, breakpoint: BreakpointId): StyleObject {
  const out: StyleObject = {};
  for (const id of BREAKPOINT_ORDER) {
    Object.assign(out, styles[id]);
    if (id === breakpoint) break;
  }
  return out;
}

/** Same cascade idea for freeform rectangles: the closest defined breakpoint at or below wins. */
export function resolveRect(layout: FreeLayout, breakpoint: BreakpointId): Rect {
  let rect = layout.base;
  for (const id of BREAKPOINT_ORDER) {
    const r = layout[id];
    if (r) rect = r;
    if (id === breakpoint) break;
  }
  return rect;
}
