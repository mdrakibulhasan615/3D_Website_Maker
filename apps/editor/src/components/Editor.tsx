"use client";

import { useEffect } from "react";
import { startAutosave } from "@/store/editorStore";
import { handleEditorKeyDown } from "@/commands/keyboard";
import { handleCopyEvent, handleCutEvent, handlePasteEvent } from "@/commands/clipboard";
import { TopBar } from "./TopBar";
import { InsertPanel } from "./InsertPanel";
import { LayersPanel } from "./LayersPanel";
import { Inspector } from "./inspector/Inspector";
import { Canvas } from "./canvas/Canvas";
import { DragGhost } from "./DragGhost";
import { ContextMenu } from "./ContextMenu";
import { ShortcutsDialog } from "./ShortcutsDialog";

/** The editor shell: top bar, left panels, canvas, inspector — plus global listeners and overlays. */
export default function Editor() {
  useEffect(() => {
    const stopAutosave = startAutosave();
    window.addEventListener("keydown", handleEditorKeyDown);
    document.addEventListener("copy", handleCopyEvent);
    document.addEventListener("cut", handleCutEvent);
    document.addEventListener("paste", handlePasteEvent);
    // Cleanup runs when the component unmounts — always undo what an effect sets up.
    return () => {
      stopAutosave();
      window.removeEventListener("keydown", handleEditorKeyDown);
      document.removeEventListener("copy", handleCopyEvent);
      document.removeEventListener("cut", handleCutEvent);
      document.removeEventListener("paste", handlePasteEvent);
    };
  }, []);

  return (
    // select-none: the editor chrome isn't document text (Ctrl+A shouldn't highlight panels).
    // Inputs and textareas still allow selecting their own text.
    <div className="flex h-screen select-none flex-col overflow-hidden bg-neutral-100 text-sm text-neutral-900">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
          <InsertPanel />
          <LayersPanel />
        </aside>
        <main className="min-w-0 flex-1 overflow-auto">
          <Canvas />
        </main>
        <aside className="w-72 shrink-0 overflow-y-auto border-l border-neutral-200 bg-white">
          <Inspector />
        </aside>
      </div>
      <DragGhost />
      <ContextMenu />
      <ShortcutsDialog />
    </div>
  );
}
