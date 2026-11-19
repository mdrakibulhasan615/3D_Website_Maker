/** Freeform editing: move/resize elements inside a free section, with snapping. */
import { createId, isLockedInTree, resolveRect, type Rect } from "@msb/schema";
import { designWidthOf, isPositionedAt, type LayoutMode } from "@msb/components";
import { GESTURE_PREFIX, useEditor } from "@/store/editorStore";
import { useDragStore } from "./dragStore";
import { getNodeRect, type Box, type Point } from "./frameBridge";
import { startPointerSession } from "./pointerSession";
import { applyHandle, snapRect, type Handle, type SnapTargets } from "./snapping";

const SNAP_THRESHOLD = 6; // screen px

const roundRect = (r: Rect): Rect => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });

/**
 * How many DESIGN px one SCREEN px is worth, horizontally, in this section.
 * Fixed-pixel sections: 1. Proportional section designed at 1280 shown at 768: 1280/768 ≈ 1.67.
 * (Vertical is never scaled, so y/h always convert 1:1.)
 */
export function horizontalScale(sectionId: string): number {
  const section = useEditor.getState().doc.nodes[sectionId];
  const designWidth = designWidthOf(section);
  const rect = getNodeRect(sectionId);
  return designWidth && rect && rect.width > 0 ? designWidth / rect.width : 1;
}

/**
 * Can this node be moved/resized freely right now? It must be absolutely positioned at
 * the CURRENT breakpoint (a stacking free section's children aren't, in Mobile view)
 * and not locked.
 */
export function isFreeChild(id: string | null): boolean {
  if (!id) return false;
  const { doc, breakpoint } = useEditor.getState();
  const node = doc.nodes[id];
  return (
    !!node?.layout &&
    !isLockedInTree(doc, id) &&
    isPositionedAt(node.parentId ? doc.nodes[node.parentId] : undefined, breakpoint)
  );
}

/** Start moving (handle = "move") or resizing (handle = an edge/corner) a free child. */
export function startTransform(id: string, handle: Handle, start: Point) {
  const { doc, breakpoint } = useEditor.getState();
  const node = doc.nodes[id];
  const parent = node?.parentId ? doc.nodes[node.parentId] : undefined;
  if (!node?.layout || !parent || !isPositionedAt(parent, breakpoint) || isLockedInTree(doc, id)) return;
  const section = getNodeRect(parent.id);
  if (!section) return;

  const scale = horizontalScale(parent.id);
  const startRect = resolveRect(node.layout, breakpoint); // design px
  const designW = section.width * scale; // the section's width in design px

  // Snap targets (design px): the section's edges + center, and every sibling's edges + center.
  const targets: SnapTargets = {
    x: [0, designW / 2, designW],
    y: [0, section.height / 2, section.height],
  };
  for (const siblingId of parent.children) {
    const sibling = doc.nodes[siblingId];
    if (siblingId === id || !sibling?.layout || sibling.hidden) continue;
    const r = resolveRect(sibling.layout, breakpoint);
    targets.x.push(r.x, r.x + r.w / 2, r.x + r.w);
    targets.y.push(r.y, r.y + r.h / 2, r.y + r.h);
  }

  // One unique key for this whole gesture → one undo step.
  const gestureKey = `${GESTURE_PREFIX}${createId("g")}`;

  startPointerSession({
    start,
    threshold: handle === "move" ? 3 : 0,
    onMove: (p, event) => {
      // Pointer moved in SCREEN px; convert the horizontal part to design px.
      let rect = applyHandle(handle, startRect, (p.x - start.x) * scale, p.y - start.y);
      let guides: Box[] = [];
      if (!event.altKey) {
        // Hold Alt to place freely without snapping.
        const snapped = snapRect(rect, handle, targets, { x: SNAP_THRESHOLD * scale, y: SNAP_THRESHOLD });
        rect = snapped.rect;
        // Guides are in design px; convert back to iframe (screen) coordinates for drawing.
        guides = snapped.guides.map((g) =>
          g.axis === "x"
            ? { left: section.left + g.pos / scale, top: section.top, width: 1, height: section.height }
            : { left: section.left, top: section.top + g.pos, width: section.width, height: 1 },
        );
      }
      useEditor.getState().setFreeRect(id, roundRect(rect), gestureKey);
      useDragStore.setState({ guides });
    },
    onEnd: () => useDragStore.setState({ guides: [] }),
  });
}

/**
 * Switch a section between flow and freeform. When going freeform we MEASURE where
 * each child currently is on screen, so nothing visually jumps. The section's current
 * width becomes its design width (so this view is pixel-exact and other widths scale).
 */
export function switchLayoutMode(id: string, mode: LayoutMode) {
  const state = useEditor.getState();
  const node = state.doc.nodes[id];
  if (!node) return;
  if (mode === "flow") return state.setLayoutMode(id, "flow");

  const section = getNodeRect(id);
  const childRects: Record<string, Rect> = {};
  for (const childId of node.children) {
    const r = getNodeRect(childId);
    if (r && section) {
      // Sizes are rounded UP: a box 0.4px narrower than its text makes the text wrap.
      childRects[childId] = {
        x: Math.round(r.left - section.left),
        y: Math.round(r.top - section.top),
        w: Math.ceil(r.width),
        h: Math.ceil(r.height),
      };
    }
  }
  state.setLayoutMode(id, "free", {
    childRects,
    height: Math.round(section?.height ?? 480),
    width: Math.round(section?.width ?? 1280),
  });
}

/**
 * Turn "Scale with width" on/off. Turning it on for a section that has no design width
 * yet uses the CURRENT view: what you see now stays exact, other widths scale from it.
 */
export function setProportional(id: string, on: boolean) {
  const width = getNodeRect(id)?.width;
  useEditor.getState().setProportional(id, on, width ? Math.round(width) : undefined);
}
