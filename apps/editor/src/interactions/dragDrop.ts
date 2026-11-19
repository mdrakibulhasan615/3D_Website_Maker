/** Drag-and-drop controller: insert new elements and move existing ones. */
import type { FreeLayout, Rect } from "@msb/schema";
import { defaultFreeSize, isFreeLayout } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { useDragStore, type DragSource, type DropTarget } from "./dragStore";
import { computeDropTarget } from "./dropTargets";
import { getNodeRect, type Point } from "./frameBridge";
import { startPointerSession } from "./pointerSession";
import { horizontalScale } from "./freeform";
import { insertTemplateAt } from "@/commands/templates";

const DRAG_THRESHOLD = 4;

/**
 * Begin a (potential) drag. If the pointer barely moves, it's a tap → `onTap` runs instead.
 */
export function startDrag(source: DragSource, start: Point, onTap?: () => void) {
  startPointerSession({
    start,
    threshold: DRAG_THRESHOLD,
    onStart: () => useDragStore.setState({ source, pointer: start, target: null }),
    onMove: (point) => useDragStore.setState({ pointer: point, target: computeDropTarget(point, source) }),
    onEnd: ({ activated, cancelled }) => {
      const { target } = useDragStore.getState();
      useDragStore.setState({ source: null, pointer: null, target: null });
      if (!activated) {
        if (!cancelled) onTap?.();
        return;
      }
      if (!cancelled && target) applyDrop(source, target);
    },
  });
}

/**
 * Center a box of `size` (design px) on the drop point (screen px, section-local).
 * `scale` converts horizontal screen px → design px for proportional sections.
 */
function placeAt(point: Point, size: { w: number; h: number }, scale: number): Rect {
  // Round sizes UP so measured text never ends up a fraction of a pixel too narrow (and wraps).
  const w = Math.ceil(size.w);
  const h = Math.ceil(size.h);
  return { x: Math.max(0, Math.round(point.x * scale - w / 2)), y: Math.max(0, Math.round(point.y - h / 2)), w, h };
}

function applyDrop(source: DragSource, target: DropTarget) {
  const state = useEditor.getState();
  const intoFree = isFreeLayout(state.doc.nodes[target.parentId]);
  const point = target.freePoint;
  const scale = intoFree ? horizontalScale(target.parentId) : 1;

  if (source.kind === "template") {
    // Same path as paste: the store gives it fresh ids and (in a free section) a position.
    insertTemplateAt(source.templateId, target.parentId, target.index);
    return;
  }

  if (source.kind === "new") {
    // No point (e.g. Mobile view of a stacked section)? The store picks a default spot.
    const layout: FreeLayout | undefined =
      intoFree && point ? { base: placeAt(point, defaultFreeSize(source.type), scale) } : undefined;
    state.insertNodeAt(source.type, target.parentId, target.index, layout);
    return;
  }

  const node = state.doc.nodes[source.id];
  if (!node) return;
  let layout: FreeLayout | null | undefined; // undefined = keep (or let the store default it)
  if (!intoFree) {
    layout = null; // leaving freeform → back to normal flow
  } else if (point) {
    // Dropped at a point: keep the element's current on-screen size (converted to design px).
    const r = getNodeRect(source.id);
    const size = r ? { w: r.width * scale, h: r.height } : defaultFreeSize(node.type);
    layout = { base: placeAt(point, size, scale) };
  }
  state.moveNode(source.id, target.parentId, target.index, layout);
}
