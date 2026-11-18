"use client";

import type { Node } from "@msb/schema";
import { useEditor } from "@/store/editorStore";
import { Group, INPUT } from "../ui";
import { ColorRow, SelectRow, StyleRow, TextRow } from "../style/fields";
import { useStyleField } from "../style/useStyleField";
import { parseStyleInput } from "../style/values";

export function BorderSection({ node }: { node: Node }) {
  const width = useStyleField(node, "borderWidth");
  const style = useStyleField(node, "borderStyle");

  return (
    <Group title="Border">
      <StyleRow label="Width" field={width} scrub={{ min: 0 }}>
        <input
          value={width.own === undefined ? "" : String(width.own)}
          placeholder={width.inherited !== undefined ? String(width.inherited) : "0"}
          onChange={(e) => {
            const value = parseStyleInput(e.target.value);
            // A border width alone draws nothing — CSS also needs a style. Add "solid" for you.
            if (value !== undefined && style.value === undefined) {
              useEditor.getState().setStyles(node.id, { borderWidth: value, borderStyle: "solid" });
            } else width.set(value);
          }}
          className={INPUT}
        />
      </StyleRow>
      <SelectRow node={node} prop="borderStyle" label="Style" options={["none", "solid", "dashed", "dotted"]} />
      <ColorRow node={node} prop="borderColor" label="Color" />
      <TextRow node={node} prop="borderRadius" label="Radius" scrub={{ min: 0 }} placeholder="0" />
    </Group>
  );
}
