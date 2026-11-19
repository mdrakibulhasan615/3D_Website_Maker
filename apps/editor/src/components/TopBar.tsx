"use client";

import { createStarterDocument } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { setShortcutsOpen } from "@/commands/uiStore";

const SAVE_LABEL = { saved: "Saved locally", unsaved: "Saving…", error: "Save failed" } as const;

export function TopBar() {
  const breakpoints = useEditor((s) => s.doc.breakpoints);
  const active = useEditor((s) => s.breakpoint);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const saveStatus = useEditor((s) => s.saveStatus);
  const { setBreakpoint, undo, redo, replaceDocument } = useEditor.getState();

  const resetToStarter = () => {
    if (window.confirm("Replace your page with the starter template? Your current page will be lost.")) {
      replaceDocument(createStarterDocument());
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-neutral-200 bg-white px-4">
      <span className="font-semibold">Motion Site Builder</span>

      <div className="flex gap-1">
        <ToolbarButton onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          Undo
        </ToolbarButton>
        <ToolbarButton onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          Redo
        </ToolbarButton>
      </div>

      {/* Breakpoint switcher: changes the canvas width AND which styles the inspector edits. */}
      <div className="mx-auto flex rounded-md bg-neutral-100 p-0.5">
        {breakpoints.map((bp) => (
          <button
            key={bp.id}
            onClick={() => setBreakpoint(bp.id)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              active === bp.id ? "bg-white shadow-sm" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {bp.label}
          </button>
        ))}
      </div>

      <span className={`text-xs ${saveStatus === "error" ? "text-red-600" : "text-neutral-400"}`}>
        {SAVE_LABEL[saveStatus]}
      </span>
      <ToolbarButton onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)">
        ?
      </ToolbarButton>
      <ToolbarButton onClick={resetToStarter}>Reset</ToolbarButton>
    </header>
  );
}

function ToolbarButton(props: { onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      className="rounded px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {props.children}
    </button>
  );
}
