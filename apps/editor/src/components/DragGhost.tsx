"use client";

import { useDragStore } from "@/interactions/dragStore";

/** A small label that follows the pointer while dragging. pointer-events-none = invisible to hit-testing. */
export function DragGhost() {
  const source = useDragStore((s) => s.source);
  const pointer = useDragStore((s) => s.pointer);
  const hasTarget = useDragStore((s) => s.target !== null);
  if (!source || !pointer) return null;

  return (
    <div
      className={`pointer-events-none fixed z-50 rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white shadow-lg ${
        hasTarget ? "" : "opacity-50"
      }`}
      style={{ left: pointer.x + 12, top: pointer.y + 12 }}
    >
      {source.label}
    </div>
  );
}
