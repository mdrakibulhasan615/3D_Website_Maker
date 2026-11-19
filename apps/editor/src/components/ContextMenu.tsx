"use client";

/** Right-click menu for the canvas and Layers. Its items come from the command registry. */
import { useEffect, useRef } from "react";
import { useEditor } from "@/store/editorStore";
import { COMMAND_BY_ID, labelOf, shortcutOf } from "@/commands/commands";
import { closeMenu, useUiStore } from "@/commands/uiStore";

/** "-" = separator. */
const ITEMS = ["copy", "cut", "paste", "duplicate", "-", "wrap", "unwrap", "-", "move-up", "move-down", "-", "lock", "hide", "-", "delete"];
const WIDTH = 220;
const HEIGHT = 380; // approximate, for keeping the menu on screen

export function ContextMenu() {
  const menu = useUiStore((s) => s.menu);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as globalThis.Node)) closeMenu();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("blur", closeMenu); // e.g. clicking into the iframe
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("blur", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menu]);

  if (!menu) return null;
  // Read state once at render: the menu is short-lived and closes after any action.
  const state = useEditor.getState();
  const left = Math.min(menu.x, window.innerWidth - WIDTH - 8);
  const top = Math.min(menu.y, window.innerHeight - HEIGHT - 8);

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 rounded-lg border border-neutral-200 bg-white py-1 text-xs shadow-xl"
      style={{ left, top, width: WIDTH }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {ITEMS.map((id, i) => {
        if (id === "-") return <div key={`sep-${i}`} className="my-1 border-t border-neutral-100" />;
        const command = COMMAND_BY_ID[id]!;
        const enabled = command.enabled(state);
        return (
          <button
            key={id}
            role="menuitem"
            type="button"
            disabled={!enabled}
            onClick={() => {
              closeMenu();
              command.run(useEditor.getState());
            }}
            className={`flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-indigo-50 disabled:cursor-default disabled:text-neutral-300 disabled:hover:bg-transparent ${
              id === "delete" && enabled ? "text-red-600" : ""
            }`}
          >
            <span>{labelOf(command, state)}</span>
            <span className="text-[10px] text-neutral-400">{shortcutOf(command)}</span>
          </button>
        );
      })}
    </div>
  );
}
