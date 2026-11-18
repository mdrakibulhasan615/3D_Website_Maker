/**
 * A pointer "session": everything between pointerdown and pointerup.
 *
 * Why this exists: a drag can start in the main page and move over the iframe
 * (or the reverse). Pointer events then arrive at whichever DOCUMENT is under the
 * pointer, so we listen to BOTH and convert iframe coordinates to page coordinates.
 * Every gesture (drag-to-insert, reorder, move, resize) is built on top of this.
 */
import { frameToParent, getFrameDoc, type Point } from "./frameBridge";

type SessionOptions = {
  /** Where the pointer went down, in main-page coordinates. */
  start: Point;
  /** Pixels the pointer must travel before it counts as a drag (so clicks stay clicks). */
  threshold: number;
  onStart?: () => void;
  onMove: (point: Point, event: PointerEvent) => void;
  onEnd: (result: { activated: boolean; cancelled: boolean }) => void;
};

/** Timestamp of the last gesture that actually dragged — see consumeRecentDrag(). */
let lastDragEndedAt = 0;

/**
 * Browsers fire a "click" right after pointerup, even at the end of a drag.
 * Click handlers call this to ignore that click.
 */
export function consumeRecentDrag(): boolean {
  const recent = Date.now() - lastDragEndedAt < 300;
  lastDragEndedAt = 0;
  return recent;
}

export function startPointerSession(options: SessionOptions) {
  const { start, threshold, onStart, onMove, onEnd } = options;
  const frameDoc = getFrameDoc();
  let activated = threshold === 0;
  if (activated) onStart?.();

  const handleMove = (point: Point, event: PointerEvent) => {
    if (!activated) {
      if (Math.hypot(point.x - start.x, point.y - start.y) < threshold) return;
      activated = true;
      onStart?.();
    }
    onMove(point, event);
  };

  const onWindowMove = (e: PointerEvent) => handleMove({ x: e.clientX, y: e.clientY }, e);
  const onFrameMove = (e: PointerEvent) => handleMove(frameToParent({ x: e.clientX, y: e.clientY }), e);
  const onUp = () => finish(false);
  const onCancel = () => finish(true);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") finish(true);
  };

  window.addEventListener("pointermove", onWindowMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("keydown", onKey);
  frameDoc?.addEventListener("pointermove", onFrameMove);
  frameDoc?.addEventListener("pointerup", onUp);
  frameDoc?.addEventListener("keydown", onKey);
  document.body.style.userSelect = "none"; // no accidental text highlighting while dragging

  function finish(cancelled: boolean) {
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("keydown", onKey);
    frameDoc?.removeEventListener("pointermove", onFrameMove);
    frameDoc?.removeEventListener("pointerup", onUp);
    frameDoc?.removeEventListener("keydown", onKey);
    document.body.style.userSelect = "";
    if (activated) lastDragEndedAt = Date.now();
    onEnd({ activated, cancelled });
  }
}
