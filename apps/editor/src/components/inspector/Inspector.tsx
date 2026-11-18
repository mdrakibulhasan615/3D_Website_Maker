"use client";

/** The right-hand panel: an "Element" tab (selection) and a "Site" tab (title, tokens). */
import { useEffect, useState } from "react";
import { useEditor } from "@/store/editorStore";
import { ElementPanel } from "./ElementPanel";
import { SitePanel } from "./SitePanel";

type Tab = "element" | "site";

export function Inspector() {
  const selectedId = useEditor((s) => (s.selectedId && s.doc.nodes[s.selectedId] ? s.selectedId : null));
  const [tab, setTab] = useState<Tab>("element");

  // Selecting something jumps to its properties.
  useEffect(() => {
    if (selectedId) setTab("element");
  }, [selectedId]);

  const active: Tab = selectedId ? tab : "site";

  return (
    <div>
      <div className="sticky top-0 z-10 flex border-b border-neutral-200 bg-white">
        {(["element", "site"] as const).map((t) => (
          <button
            key={t}
            type="button"
            disabled={t === "element" && !selectedId}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium capitalize disabled:cursor-not-allowed disabled:text-neutral-300 ${
              active === t ? "border-b-2 border-indigo-600 text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {active === "element" ? <ElementPanel /> : <SitePanel />}
    </div>
  );
}
