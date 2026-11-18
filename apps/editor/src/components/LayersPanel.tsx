"use client";

import { getPage } from "@msb/schema";
import { getDefinition } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { useDragStore } from "@/interactions/dragStore";
import { startDrag } from "@/interactions/dragDrop";

/** The document tree as an indented list. Drag rows to reorder or reparent. */
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
  const hint = useDragStore((s) => (s.target?.layerHint?.id === id ? s.target.layerHint.position : null));
  const isDragged = useDragStore((s) => s.source?.kind === "move" && s.source.id === id);
  if (!node) return null;

  const { select, hover, toggleHidden } = useEditor.getState();
  const label = node.name ?? getDefinition(node.type)?.label ?? node.type;
  const indent = 12 + depth * 14;

  return (
    <>
      <div
        data-layer-id={id}
        onPointerDown={(e) => {
          if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
          select(id);
          if (!node.parentId) return; // the page root can't be moved
          e.currentTarget.setPointerCapture(e.pointerId);
          startDrag({ kind: "move", id, label }, { x: e.clientX, y: e.clientY });
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
            style={{ left: indent, [hint === "before" ? "top" : "bottom"]: -1 }}
          />
        )}
        <span className="truncate">{label}</span>
        {node.name && <span className={isSelected ? "text-indigo-200" : "text-neutral-400"}>· {node.type}</span>}
        {node.parentId && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // don't also trigger the row's select
              toggleHidden(id);
            }}
            className={`ml-auto text-[10px] ${node.hidden ? "" : "invisible group-hover:visible"}`}
            title={node.hidden ? "Show" : "Hide"}
          >
            {node.hidden ? "show" : "hide"}
          </button>
        )}
      </div>
      {node.children.map((childId) => (
        <LayerRow key={childId} id={childId} depth={depth + 1} />
      ))}
    </>
  );
}
