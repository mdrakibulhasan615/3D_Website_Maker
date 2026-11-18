"use client";

import { useEffect } from "react";
import { startAutosave } from "@/store/editorStore";
import { handleEditorKeyDown } from "@/store/shortcuts";
import { TopBar } from "./TopBar";
import { InsertPanel } from "./InsertPanel";
import { LayersPanel } from "./LayersPanel";
import { Inspector } from "./inspector/Inspector";
import { Canvas } from "./canvas/Canvas";
import { DragGhost } from "./DragGhost";

/** The editor shell: top bar, left panels, canvas, inspector. */
export default function Editor() {
  useEffect(() => {
    const stopAutosave = startAutosave();
    window.addEventListener("keydown", handleEditorKeyDown);
    // Cleanup runs when the component unmounts — always undo what an effect sets up.
    return () => {
      stopAutosave();
      window.removeEventListener("keydown", handleEditorKeyDown);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100 text-sm text-neutral-900">
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
    </div>
  );
}
