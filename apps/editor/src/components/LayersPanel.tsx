"use client";

import { useEffect, useRef, useState } from "react";
import { getPage, isAncestorOf, isLockedInTree } from "@msb/schema";
import { getDefinition } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { useDragStore } from "@/interactions/dragStore";
import { startDrag } from "@/interactions/dragDrop";
import { openMenu } from "@/commands/uiStore";

/** The document tree. Drag to reorder/reparent, double-click to rename, right-click for actions. */
export function LayersPanel() {
  const rootId = useEditor((s) => getPage(s.doc, s.pageId).rootNodeId);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Layers</h2>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4" onMouseLeave={() => useEditor.getState().hover(null)}>
        <LayerRow id={rootId} depth={0} />
      </div>
    </section>
  );
}

/** One row, which renders its children's rows — the same recursion as the renderer. */
function LayerRow({ id, depth }: { id: string; depth: number }) {
  // Each row subscribes only to ITS node, so editing one node re-renders one row.
  const node = useEditor((s) => s.doc.nodes[id]);
  const isSelected = useEditor((s) => s.selectedId === id);
  const isHovered = useEditor((s) => s.hoveredId === id);
  const selectedId = useEditor((s) => s.selectedId);
  const lockedByAncestor = useEditor((s) => {
    const n = s.doc.nodes[id];
    return !!n?.parentId && isLockedInTree(s.doc, n.parentId);
  });
  const hint = useDragStore((s) => (s.target?.layerHint?.id === id ? s.target.layerHint.position : null));
  const isDragged = useDragStore((s) => s.source?.kind === "move" && s.source.id === id);

  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const cancelRename = useRef(false);

  // Reveal the selection: if something inside this collapsed row gets selected, expand.
  useEffect(() => {
    if (!open && selectedId && isAncestorOf(useEditor.getState().doc, id, selectedId)) setOpen(true);
  }, [selectedId, open, id]);

  if (!node) return null;

  const { select, hover, toggleHidden, toggleLocked, renameNode } = useEditor.getState();
  const label = node.name ?? getDefinition(node.type)?.label ?? node.type;
  const indent = 4 + depth * 14;
  const locked = !!node.locked || lockedByAncestor;

  return (
    <>
      <div
        data-layer-id={id}
        onPointerDown={(e) => {
          if (e.button !== 0 || (e.target as HTMLElement).closest("button, input")) return;
          select(id);
          if (!node.parentId || locked) return; // the page root and locked layers can't be dragged
          e.currentTarget.setPointerCapture(e.pointerId);
          startDrag({ kind: "move", id, label }, { x: e.clientX, y: e.clientY });
        }}
        onDoubleClick={() => node.parentId && setEditing(true)}
        onContextMenu={(e) => {
          e.preventDefault();
          select(id);
          openMenu(e.clientX, e.clientY);
        }}
        onMouseEnter={() => hover(id)}
        style={{ paddingLeft: indent }}
        className={`group relative flex cursor-pointer select-none items-center gap-1 py-1 pr-2 text-xs ${
          isSelected ? "bg-indigo-600 text-white" : isHovered ? "bg-indigo-50" : ""
        } ${node.hidden || isDragged ? "opacity-50" : ""} ${hint === "inside" ? "ring-2 ring-inset ring-indigo-500" : ""}`}
      >
        {(hint === "before" || hint === "after") && (
          <div
            className="pointer-events-none absolute right-0 h-0.5 bg-indigo-500"
            style={{ left: indent + 14, [hint === "before" ? "top" : "bottom"]: -1 }}
          />
        )}

        {/* Collapse / expand */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`w-3 shrink-0 text-[9px] ${node.children.length ? "" : "invisible"} ${isSelected ? "text-indigo-200" : "text-neutral-400"}`}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? "▼" : "▶"}
        </button>

        {editing ? (
          <input
            autoFocus
            defaultValue={node.name ?? ""}
            placeholder={getDefinition(node.type)?.label ?? node.type}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancelRename.current = true;
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              if (!cancelRename.current) renameNode(id, e.target.value);
              cancelRename.current = false;
              setEditing(false);
            }}
            className="min-w-0 flex-1 rounded border border-indigo-400 bg-white px-1 text-xs text-neutral-900 outline-none"
          />
        ) : (
          <>
            <span className="truncate">{label}</span>
            {node.name && <span className={`shrink-0 ${isSelected ? "text-indigo-200" : "text-neutral-400"}`}>· {node.type}</span>}
          </>
        )}

        {node.parentId && !editing && (
          <span className="ml-auto flex shrink-0 gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => toggleLocked(id)}
              title={node.locked ? "Unlock" : lockedByAncestor ? "Locked by a parent" : "Lock"}
              className={node.locked ? "" : lockedByAncestor ? "opacity-60" : "invisible group-hover:visible"}
            >
              {node.locked ? "locked" : lockedByAncestor ? "·locked" : "lock"}
            </button>
            <button
              type="button"
              onClick={() => toggleHidden(id)}
              title={node.hidden ? "Show" : "Hide"}
              className={node.hidden ? "" : "invisible group-hover:visible"}
            >
              {node.hidden ? "show" : "hide"}
            </button>
          </span>
        )}
      </div>
      {open && node.children.map((childId) => <LayerRow key={childId} id={childId} depth={depth + 1} />)}
    </>
  );
}
