"use client";

/** Press "?" — every shortcut, generated from the command registry (so it's always accurate). */
import { useEditor } from "@/store/editorStore";
import { COMMANDS, labelOf, shortcutOf, type Command } from "@/commands/commands";
import { setShortcutsOpen, useUiStore } from "@/commands/uiStore";

const EXTRA: { group: Command["group"]; label: string; keys: string }[] = [
  { group: "Arrange", label: "Nudge ×10 (freeform)", keys: "Shift + arrows" },
  { group: "Arrange", label: "Place without snapping", keys: "Alt while dragging" },
];

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  if (!open) return null;
  const state = useEditor.getState();

  // Collapse the 4 nudge commands into one readable line.
  const rows = COMMANDS.filter((c) => !c.id.startsWith("nudge-")).map((c) => ({
    group: c.group,
    label: labelOf(c, state),
    keys: shortcutOf(c) ?? "",
  }));
  rows.push({ group: "Arrange", label: "Nudge (freeform)", keys: "← ↑ → ↓" }, ...EXTRA);
  const groups = [...new Set(rows.map((r) => r.group))];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30" onMouseDown={() => setShortcutsOpen(false)}>
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        className="max-h-[80vh] w-[440px] overflow-y-auto rounded-xl bg-white p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <button onClick={() => setShortcutsOpen(false)} className="text-neutral-400 hover:text-neutral-800">
            ×
          </button>
        </div>
        {groups.map((group) => (
          <div key={group} className="mb-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{group}</div>
            {rows
              .filter((r) => r.group === group)
              .map((r) => (
                <div key={r.label} className="flex justify-between py-0.5 text-xs">
                  <span>{r.label}</span>
                  <kbd className="rounded bg-neutral-100 px-1.5 font-mono text-[11px] text-neutral-600">{r.keys}</kbd>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
