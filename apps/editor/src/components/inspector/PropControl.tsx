"use client";

/** Content props (text, links, layout mode…) — generated from each component's `inspector` config. */
import type { ReactNode } from "react";
import type { Node } from "@msb/schema";
import { hasFormatting, type InspectorControl, type LayoutMode, type RichSpan } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { setProportional, switchLayoutMode } from "@/interactions/freeform";
import { INPUT, Row } from "./ui";

/**
 * Most props are a plain "set this value". A few need extra work (measuring the
 * canvas first, keeping heights consistent), so they route to dedicated actions.
 */
function setProp(node: Node, prop: string, value: unknown) {
  const store = useEditor.getState();
  if (node.type === "Section" && prop === "layout") return switchLayoutMode(node.id, value as LayoutMode);
  if (node.type === "Section" && prop === "mobileStack") return store.setMobileStack(node.id, value as boolean);
  if (node.type === "Section" && prop === "proportional") return setProportional(node.id, value as boolean);
  store.updateProps(node.id, { [prop]: value });
}

export function PropControl({ node, control, value: raw }: { node: Node; control: InspectorControl; value: unknown }) {
  const value = raw == null ? "" : String(raw);
  const update = (next: unknown) => setProp(node, control.prop, next);

  let input: ReactNode;
  if (control.control === "toggle") {
    input = (
      <input
        type="checkbox"
        checked={raw === true}
        onChange={(e) => update(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-indigo-600"
      />
    );
  } else if (control.control === "textarea") {
    // Formatted Text: a plain textarea would silently drop the bold/links, so make it
    // read-only and offer an explicit "Clear formatting" instead.
    const formatted = node.type === "Text" && control.prop === "text" && hasFormatting(node.props.rich as RichSpan[] | undefined);
    input = (
      <div className="flex flex-col gap-1">
        <textarea
          value={value}
          rows={3}
          readOnly={formatted}
          onChange={(e) => update(e.target.value)}
          className={`${INPUT} ${formatted ? "bg-neutral-50 text-neutral-500" : ""}`}
        />
        {node.type === "Text" && control.prop === "text" && (
          <span className="text-[10px] leading-snug text-neutral-400">
            {formatted ? "Has formatting — double-click the text on the canvas to edit. " : "Double-click on the canvas for bold, links and more."}
            {formatted && (
              <button
                type="button"
                onClick={() => useEditor.getState().updateProps(node.id, { rich: undefined })}
                className="font-medium text-indigo-600 hover:text-indigo-800"
              >
                Clear formatting
              </button>
            )}
          </span>
        )}
      </div>
    );
  } else if (control.control === "select") {
    input = (
      <select value={value} onChange={(e) => update(e.target.value)} className={INPUT}>
        {control.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else {
    input = (
      <input
        type={control.control === "url" ? "url" : "text"}
        value={value}
        onChange={(e) => update(e.target.value)}
        className={INPUT}
      />
    );
  }
  return <Row label={control.label}>{input}</Row>;
}
