"use client";

import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { SECTION_TEMPLATES, componentList, type ComponentCategory } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { startDrag } from "@/interactions/dragDrop";
import type { DragSource } from "@/interactions/dragStore";
import { insertTemplate } from "@/commands/templates";
import { SectionThumb } from "./SectionThumb";

const CATEGORIES: ComponentCategory[] = ["Structure", "Basic", "Sections"];

/**
 * Pointer down on an item: drag it onto the canvas/Layers — or, if the pointer
 * barely moves, treat it as a click (`onTap`).
 */
function dragOrTap(source: DragSource, onTap: () => void) {
  return (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    // Capture: keep getting events here even when the pointer is over the iframe.
    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(source, { x: e.clientX, y: e.clientY }, onTap);
  };
}

export function InsertPanel() {
  const [tab, setTab] = useState<"elements" | "sections">("elements");

  return (
    <section className="flex max-h-[55%] min-h-0 flex-col border-b border-neutral-200">
      <div className="flex items-center gap-3 px-3 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Insert</h2>
        <div className="ml-auto flex rounded-md bg-neutral-100 p-0.5">
          {(["elements", "sections"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-2 py-0.5 text-[11px] capitalize ${tab === t ? "bg-white font-medium shadow-sm" : "text-neutral-500"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 overflow-y-auto px-3 pb-3 pt-2">{tab === "elements" ? <ElementsList /> : <SectionsList />}</div>
    </section>
  );
}

function ElementsList() {
  const insertNode = useEditor((s) => s.insertNode);
  return (
    <>
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
                  onPointerDown={dragOrTap({ kind: "new", type: def.type, label: def.label }, () => insertNode(def.type))}
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
    </>
  );
}

function SectionsList() {
  return (
    <>
      <p className="mb-2 text-[11px] leading-snug text-neutral-400">
        Ready-made sections built from normal elements — every part stays editable. Click to add after the current
        section, or drag to place.
      </p>
      <div className="flex flex-col gap-2">
        {SECTION_TEMPLATES.map((t) => (
          <button
            key={t.id}
            title={t.description}
            onPointerDown={dragOrTap({ kind: "template", templateId: t.id, label: t.name }, () => insertTemplate(t.id))}
            onClick={(e) => e.detail === 0 && insertTemplate(t.id)}
            className="group cursor-grab rounded-md border border-neutral-200 p-1.5 text-left hover:border-indigo-400 hover:bg-indigo-50/40 active:cursor-grabbing"
          >
            <SectionThumb id={t.id} />
            <div className="mt-1 flex items-baseline justify-between gap-2 px-0.5">
              <span className="truncate text-xs font-medium">{t.name}</span>
              <span className="shrink-0 text-[10px] text-neutral-400">{t.category}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
