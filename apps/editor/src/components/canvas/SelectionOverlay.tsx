"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { isLockedInTree } from "@msb/schema";
import { getDefinition, isPositionedAt } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { useDragStore } from "@/interactions/dragStore";
import { getNodeRect, type Box } from "@/interactions/frameBridge";
import { startTransform } from "@/interactions/freeform";
import type { Handle } from "@/interactions/snapping";

const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/** The 8 resize handles: position as % of the selection box, plus a matching cursor. */
const HANDLES: { handle: Handle; style: CSSProperties }[] = [
  { handle: "nw", style: { left: "0%", top: "0%", cursor: "nwse-resize" } },
  { handle: "n", style: { left: "50%", top: "0%", cursor: "ns-resize" } },
  { handle: "ne", style: { left: "100%", top: "0%", cursor: "nesw-resize" } },
  { handle: "e", style: { left: "100%", top: "50%", cursor: "ew-resize" } },
  { handle: "se", style: { left: "100%", top: "100%", cursor: "nwse-resize" } },
  { handle: "s", style: { left: "50%", top: "100%", cursor: "ns-resize" } },
  { handle: "sw", style: { left: "0%", top: "100%", cursor: "nesw-resize" } },
  { handle: "w", style: { left: "0%", top: "50%", cursor: "ew-resize" } },
];

/**
 * Everything drawn ON TOP of the iframe: hover/selection outlines, resize handles,
 * drop indicators and snap guides. It lives outside the user's DOM, so it can never
 * be covered by (or leak into) their content.
 *
 * Elements move for many reasons (scrolling, edits, images loading, resizing), so we
 * re-measure once per animation frame and only update state when a box actually moved.
 */
export function SelectionOverlay({ frameDoc }: { frameDoc: Document }) {
  const selectedId = useEditor((s) => s.selectedId);
  const hoveredId = useEditor((s) => s.hoveredId);
  const label = useEditor((s) => {
    const node = s.selectedId ? s.doc.nodes[s.selectedId] : undefined;
    return node ? (node.name ?? getDefinition(node.type)?.label ?? node.type) : "";
  });
  const showHandles = useEditor((s) => {
    const node = s.selectedId ? s.doc.nodes[s.selectedId] : undefined;
    return (
      !!node?.layout &&
      s.editingTextId !== node.id && // no resize handles while typing in it
      !isLockedInTree(s.doc, node.id) &&
      isPositionedAt(node.parentId ? s.doc.nodes[node.parentId] : undefined, s.breakpoint)
    );
  });
  const dragging = useDragStore((s) => s.source !== null);
  const indicator = useDragStore((s) => s.target?.indicator ?? null);
  const guides = useDragStore((s) => s.guides);

  const [boxes, setBoxes] = useState<{ sel: Box | null; hov: Box | null }>({ sel: null, hov: null });

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const sel = selectedId ? getNodeRect(selectedId) : null;
      const hov = hoveredId && hoveredId !== selectedId ? getNodeRect(hoveredId) : null;
      setBoxes((prev) => (sameBox(prev.sel, sel) && sameBox(prev.hov, hov) ? prev : { sel, hov }));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [frameDoc, selectedId, hoveredId]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {boxes.hov && !dragging && <div className="absolute outline outline-1 outline-indigo-400" style={boxes.hov} />}

      {boxes.sel && (
        <div className="absolute outline outline-2 outline-indigo-600" style={boxes.sel}>
          <span
            className={`absolute left-[-2px] whitespace-nowrap bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white ${
              boxes.sel.top < 18 ? "top-0 rounded-br" : "-top-[18px] rounded-t"
            }`}
          >
            {label}
          </span>
          {showHandles &&
            selectedId &&
            HANDLES.map(({ handle, style }) => (
              <div
                key={handle}
                style={style}
                className="pointer-events-auto absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-indigo-600 bg-white"
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  e.stopPropagation();
                  // Keep receiving pointer events even if the pointer leaves this tiny square.
                  e.currentTarget.setPointerCapture(e.pointerId);
                  startTransform(selectedId, handle, { x: e.clientX, y: e.clientY });
                }}
              />
            ))}
        </div>
      )}

      {indicator && (
        <div
          className={
            indicator.kind === "line"
              ? "absolute rounded-full bg-indigo-500"
              : "absolute bg-indigo-500/10 outline-2 outline-dashed outline-indigo-500"
          }
          style={indicator.rect}
        />
      )}

      {guides.map((g, i) => (
        <div key={i} className="absolute bg-pink-500" style={g} />
      ))}
    </div>
  );
}
