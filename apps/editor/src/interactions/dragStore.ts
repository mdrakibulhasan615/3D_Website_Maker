/**
 * Short-lived gesture state, kept SEPARATE from the document store:
 * it changes ~60×/second during a drag and must never be saved or undone.
 */
import { create } from "zustand";
import type { Box, Point } from "./frameBridge";

export type DragSource =
  | { kind: "new"; type: string; label: string } // from the Insert panel
  | { kind: "move"; id: string; label: string }; // an existing node

export type DropTarget = {
  parentId: string;
  index: number;
  /** Set when dropping into a free section: the drop point in section-local coordinates. */
  freePoint?: Point;
  /** What to draw on the canvas (iframe coordinates). */
  indicator: { kind: "line" | "box"; rect: Box } | null;
  /** What to draw in the Layers panel. */
  layerHint?: { id: string; position: "before" | "after" | "inside" };
};

type DragState = {
  source: DragSource | null;
  pointer: Point | null;
  target: DropTarget | null;
  /** Snap guide lines to draw (iframe coordinates). */
  guides: Box[];
};

export const useDragStore = create<DragState>()(() => ({
  source: null,
  pointer: null,
  target: null,
  guides: [],
}));
