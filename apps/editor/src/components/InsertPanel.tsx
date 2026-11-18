"use client";

import { componentList, type ComponentCategory } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { startDrag } from "@/interactions/dragDrop";

const CATEGORIES: ComponentCategory[] = ["Structure", "Basic", "Sections"];

/** Lists every insertable component from the registry. Drag onto the canvas/Layers, or click. */
export function InsertPanel() {
  const insertNode = useEditor((s) => s.insertNode);

  return (
    <section className="border-b border-neutral-200 p-3">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Insert</h2>
      <p className="mb-2 text-[11px] leading-snug text-neutral-400">
        Drag onto the canvas or Layers — or click to add next to the selection.
      </p>
      {CATEGORIES.map((category) => {
        const items = componentList.filter((def) => def.insertable && def.category === category);
        if (items.length === 0) return null;
        return (
          <div key={category} className="mb-2">
            <div className="mb-1 text-[11px] text-neutral-400">{category}</div>
            <div className="grid grid-cols-2 gap-1">
              {items.map((def) => (
                <button
                  key={def.type}
                  title={def.description}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    // Capture: keep getting events here even when the pointer is over the iframe.
                    e.currentTarget.setPointerCapture(e.pointerId);
                    startDrag({ kind: "new", type: def.type, label: def.label }, { x: e.clientX, y: e.clientY }, () =>
                      insertNode(def.type),
                    );
                  }}
                  // detail === 0 means keyboard (Enter/Space), not mouse — keeps it accessible.
                  onClick={(e) => e.detail === 0 && insertNode(def.type)}
                  className="cursor-grab rounded border border-neutral-200 px-2 py-1.5 text-left text-xs hover:border-indigo-400 hover:bg-indigo-50 active:cursor-grabbing"
                >
                  {def.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
