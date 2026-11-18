/**
 * Hit-testing: "if the user let go RIGHT NOW, where would the element land?"
 *
 * Answers with { parentId, index } (a position in the tree) plus an indicator to draw.
 * Works over two surfaces: rows in the Layers panel, and elements inside the canvas iframe.
 */
import { getPage, isAncestorOf, type Node, type SiteDocument } from "@msb/schema";
import { getDefinition, isFreeLayout, isPositionedAt } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { getFlowDirection, getFrameDoc, getNodeRect, parentToFrame, type Box, type Point } from "./frameBridge";
import type { DragSource, DropTarget } from "./dragStore";

/** Within this many px of a container's edge, drop NEXT TO it instead of inside it. */
const EDGE_ZONE = 8;
const LINE = 2;

type Direction = "row" | "column";

export function computeDropTarget(point: Point, source: DragSource): DropTarget | null {
  const { doc, pageId } = useEditor.getState();

  // 1) Over a Layers row?
  const row = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>("[data-layer-id]");
  if (row) return layerTarget(doc, row, point, source);

  // 2) Over the canvas?
  const framePoint = parentToFrame(point);
  if (framePoint) return canvasTarget(doc, getPage(doc, pageId).rootNodeId, framePoint, source);

  return null;
}

/** You can't drop an element inside itself or its own descendants (that would create a loop). */
function isInsideSource(doc: SiteDocument, id: string, source: DragSource): boolean {
  return source.kind === "move" && (id === source.id || isAncestorOf(doc, source.id, id));
}

// ─── Canvas ──────────────────────────────────────────────────────────────────

function canvasTarget(doc: SiteDocument, rootId: string, p: Point, source: DragSource): DropTarget | null {
  const hit = getFrameDoc()?.elementFromPoint(p.x, p.y)?.closest("[data-node-id]");
  let id = hit?.getAttribute("data-node-id") ?? rootId;
  // Pointer is over the dragged element → climb up until we're outside it.
  while (id !== rootId && isInsideSource(doc, id, source)) id = doc.nodes[id]!.parentId!;

  const node = doc.nodes[id];
  const rect = getNodeRect(id);
  if (!node || !rect) return null;
  const parent = node.parentId ? doc.nodes[node.parentId] : undefined;

  if (getDefinition(node.type)?.acceptsChildren) {
    if (isFreeLayout(node)) return freeTarget(node, rect, p);
    if (parent && !isFreeLayout(parent)) {
      const dir = getFlowDirection(parent.id);
      const edge = nearEdge(rect, p, dir);
      if (edge) return siblingTarget(doc, node, edge, rect, dir);
    }
    return childTarget(node, rect, p);
  }

  // A leaf (Text, Image...): drop before or after it.
  if (!parent) return null;
  if (isFreeLayout(parent)) {
    const parentRect = getNodeRect(parent.id);
    return parentRect ? freeTarget(parent, parentRect, p) : null;
  }
  const dir = getFlowDirection(parent.id);
  const before = dir === "row" ? p.x < rect.left + rect.width / 2 : p.y < rect.top + rect.height / 2;
  return siblingTarget(doc, node, before ? "before" : "after", rect, dir);
}

function nearEdge(rect: Box, p: Point, dir: Direction): "before" | "after" | null {
  const [start, size, pos] = dir === "row" ? [rect.left, rect.width, p.x] : [rect.top, rect.height, p.y];
  const zone = Math.min(EDGE_ZONE, size / 4);
  if (pos - start < zone) return "before";
  if (start + size - pos < zone) return "after";
  return null;
}

/** A thin line at `edge`, spanning the reference box (horizontal for columns, vertical for rows). */
function lineAt(edge: number, ref: Box, dir: Direction): Box {
  return dir === "row"
    ? { left: edge - LINE / 2, top: ref.top, width: LINE, height: ref.height }
    : { left: ref.left, top: edge - LINE / 2, width: ref.width, height: LINE };
}

function siblingTarget(doc: SiteDocument, node: Node, position: "before" | "after", rect: Box, dir: Direction): DropTarget {
  const parent = doc.nodes[node.parentId!]!;
  const index = parent.children.indexOf(node.id) + (position === "after" ? 1 : 0);
  const start = dir === "row" ? rect.left : rect.top;
  const end = dir === "row" ? rect.left + rect.width : rect.top + rect.height;
  return { parentId: parent.id, index, indicator: { kind: "line", rect: lineAt(position === "before" ? start : end, rect, dir) } };
}

/** Inside a flow container: find the gap between children closest to the pointer. */
function childTarget(container: Node, rect: Box, p: Point): DropTarget {
  const dir = getFlowDirection(container.id);
  const kids = container.children
    .map((id) => ({ id, r: getNodeRect(id) }))
    .filter((k): k is { id: string; r: Box } => k.r !== null);

  if (kids.length === 0) {
    return { parentId: container.id, index: container.children.length, indicator: { kind: "box", rect } };
  }

  const pos = dir === "row" ? p.x : p.y;
  for (const kid of kids) {
    const mid = dir === "row" ? kid.r.left + kid.r.width / 2 : kid.r.top + kid.r.height / 2;
    if (pos < mid) {
      return {
        parentId: container.id,
        index: container.children.indexOf(kid.id),
        indicator: { kind: "line", rect: lineAt(dir === "row" ? kid.r.left : kid.r.top, kid.r, dir) },
      };
    }
  }
  const last = kids[kids.length - 1]!.r;
  const end = dir === "row" ? last.left + last.width : last.top + last.height;
  return { parentId: container.id, index: container.children.length, indicator: { kind: "line", rect: lineAt(end, last, dir) } };
}

/**
 * Free section: order doesn't matter visually — what matters is the drop POINT.
 * In Mobile view a stacking section has no positions to drop at, so we leave the point
 * out and the store places the element below everything else.
 */
function freeTarget(section: Node, rect: Box, p: Point): DropTarget {
  const positioned = isPositionedAt(section, useEditor.getState().breakpoint);
  return {
    parentId: section.id,
    index: section.children.length,
    freePoint: positioned ? { x: p.x - rect.left, y: p.y - rect.top } : undefined,
    indicator: { kind: "box", rect },
  };
}

// ─── Layers panel ────────────────────────────────────────────────────────────

/** Top quarter of a row = before, bottom quarter = after, middle = inside (containers only). */
function layerTarget(doc: SiteDocument, row: HTMLElement, p: Point, source: DragSource): DropTarget | null {
  const id = row.dataset.layerId!;
  const node = doc.nodes[id];
  if (!node || isInsideSource(doc, id, source)) return null;

  const r = row.getBoundingClientRect();
  const rel = (p.y - r.top) / r.height;
  const accepts = !!getDefinition(node.type)?.acceptsChildren;

  if (!node.parentId || (accepts && rel > 0.25 && rel < 0.75)) {
    if (!accepts) return null;
    return { parentId: id, index: node.children.length, indicator: null, layerHint: { id, position: "inside" } };
  }
  const parent = doc.nodes[node.parentId]!;
  const position = rel < 0.5 ? "before" : "after";
  return {
    parentId: parent.id,
    index: parent.children.indexOf(id) + (position === "after" ? 1 : 0),
    indicator: null,
    layerHint: { id, position },
  };
}
