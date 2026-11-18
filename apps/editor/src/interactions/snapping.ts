/**
 * Pure geometry for freeform editing: no DOM, no React, no store.
 * Rectangles in, rectangles out — easy to test and reason about.
 */
import type { Rect } from "@msb/schema";

/** "move", or which edge/corner is being dragged (compass directions). */
export type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/** Lines (in section-local px) that edges/centers can snap to. */
export type SnapTargets = { x: number[]; y: number[] };
export type SnapGuide = { axis: "x" | "y"; pos: number };

const MIN_SIZE = 16;

function edgesOf(handle: Handle) {
  const moving = handle === "move"; // note: "move" contains the letter "e", so check this first!
  return {
    moving,
    left: !moving && handle.includes("w"),
    right: !moving && handle.includes("e"),
    top: !moving && handle.includes("n"),
    bottom: !moving && handle.includes("s"),
  };
}

/** Apply a pointer delta (dx, dy) to the starting rectangle, depending on the handle. */
export function applyHandle(handle: Handle, start: Rect, dx: number, dy: number): Rect {
  const e = edgesOf(handle);
  if (e.moving) return { ...start, x: start.x + dx, y: start.y + dy };

  let { x, y, w, h } = start;
  if (e.right) w = Math.max(MIN_SIZE, start.w + dx);
  if (e.bottom) h = Math.max(MIN_SIZE, start.h + dy);
  if (e.left) {
    w = Math.max(MIN_SIZE, start.w - dx);
    x = start.x + start.w - w; // the RIGHT edge stays put
  }
  if (e.top) {
    h = Math.max(MIN_SIZE, start.h - dy);
    y = start.y + start.h - h; // the BOTTOM edge stays put
  }
  return { x, y, w, h };
}

/** Of all (candidate, target) pairs within `threshold`, find the closest. */
function bestSnap(candidates: number[], targets: number[], threshold: number) {
  let best: { delta: number; pos: number } | null = null;
  for (const c of candidates) {
    for (const t of targets) {
      const delta = t - c;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, pos: t };
      }
    }
  }
  return best;
}

/**
 * Nudge the rectangle so its edges (or centers, when moving) line up with nearby targets.
 * Returns the adjusted rect and the guide lines to draw.
 */
export function snapRect(
  rect: Rect,
  handle: Handle,
  targets: SnapTargets,
  /** Per-axis, because in a scaled section one screen px ≠ one design px horizontally. */
  threshold: { x: number; y: number },
) {
  const e = edgesOf(handle);
  const r = { ...rect };
  const guides: SnapGuide[] = [];

  // Horizontal axis (x)
  if (e.moving) {
    const s = bestSnap([r.x, r.x + r.w / 2, r.x + r.w], targets.x, threshold.x);
    if (s) (r.x += s.delta), guides.push({ axis: "x", pos: s.pos });
  } else if (e.left) {
    const s = bestSnap([r.x], targets.x, threshold.x);
    if (s) (r.x += s.delta), (r.w -= s.delta), guides.push({ axis: "x", pos: s.pos });
  } else if (e.right) {
    const s = bestSnap([r.x + r.w], targets.x, threshold.x);
    if (s) (r.w += s.delta), guides.push({ axis: "x", pos: s.pos });
  }

  // Vertical axis (y)
  if (e.moving) {
    const s = bestSnap([r.y, r.y + r.h / 2, r.y + r.h], targets.y, threshold.y);
    if (s) (r.y += s.delta), guides.push({ axis: "y", pos: s.pos });
  } else if (e.top) {
    const s = bestSnap([r.y], targets.y, threshold.y);
    if (s) (r.y += s.delta), (r.h -= s.delta), guides.push({ axis: "y", pos: s.pos });
  } else if (e.bottom) {
    const s = bestSnap([r.y + r.h], targets.y, threshold.y);
    if (s) (r.h += s.delta), guides.push({ axis: "y", pos: s.pos });
  }

  return { rect: r, guides };
}
