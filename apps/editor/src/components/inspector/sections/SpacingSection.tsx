"use client";

import type { Node } from "@msb/schema";
import { Group } from "../ui";
import { useStyleField } from "../style/useStyleField";
import { parseStyleInput } from "../style/values";

/** One tiny box in the box-model diagram. Blue text = set here; grey placeholder = inherited. */
function BoxInput({ node, prop }: { node: Node; prop: string }) {
  const field = useStyleField(node, prop);
  return (
    <input
      value={field.own === undefined ? "" : String(field.own)}
      placeholder={field.inherited !== undefined ? String(field.inherited) : "0"}
      onChange={(e) => field.set(parseStyleInput(e.target.value))}
      title={prop}
      className={`w-10 rounded bg-transparent px-0.5 py-0.5 text-center text-[11px] placeholder:text-neutral-400 hover:bg-white focus:bg-white focus:outline focus:outline-1 focus:outline-indigo-400 ${
        field.own !== undefined ? "font-medium text-indigo-700" : "text-neutral-500"
      }`}
    />
  );
}

/**
 * The CSS box model, drawn: margin (outside the element) wraps padding (inside it).
 * This mirrors how browser devtools show it, so the mental model transfers.
 */
export function SpacingSection({ node }: { node: Node }) {
  return (
    <Group title="Spacing">
      <div className="relative rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-1 py-0.5 text-[9px] text-neutral-400">
        <span className="absolute left-1.5 top-1">MARGIN</span>
        <div className="flex justify-center">
          <BoxInput node={node} prop="marginTop" />
        </div>
        <div className="flex items-center gap-1">
          <BoxInput node={node} prop="marginLeft" />
          <div className="relative flex-1 rounded border border-neutral-300 bg-white px-1 py-0.5">
            <span className="absolute left-1.5 top-1">PADDING</span>
            <div className="flex justify-center">
              <BoxInput node={node} prop="paddingTop" />
            </div>
            <div className="flex items-center justify-between">
              <BoxInput node={node} prop="paddingLeft" />
              <div className="mx-1 h-5 flex-1 rounded-sm bg-neutral-100" />
              <BoxInput node={node} prop="paddingRight" />
            </div>
            <div className="flex justify-center">
              <BoxInput node={node} prop="paddingBottom" />
            </div>
          </div>
          <BoxInput node={node} prop="marginRight" />
        </div>
        <div className="flex justify-center">
          <BoxInput node={node} prop="marginBottom" />
        </div>
      </div>
      <p className="text-[10px] leading-snug text-neutral-400">
        Numbers are px (also accepts rem, %, auto). Blue = set here, grey = inherited. Clear a box to reset it.
      </p>
    </Group>
  );
}
