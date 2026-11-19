"use client";

import type { Node } from "@msb/schema";
import { FONT_OPTIONS, tokenRef } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { Group } from "../ui";
import { ColorRow, SegmentedRow, SelectRow, TextRow } from "../style/fields";

const WEIGHTS = [
  { value: "300", label: "300 · Light" },
  { value: "400", label: "400 · Regular" },
  { value: "500", label: "500 · Medium" },
  { value: "600", label: "600 · Semibold" },
  { value: "700", label: "700 · Bold" },
  { value: "800", label: "800 · Extrabold" },
  { value: "900", label: "900 · Black" },
];

export function TypographySection({ node }: { node: Node }) {
  const fontTokens = useEditor((s) => s.doc.tokens.fonts);
  // Font tokens first (◆), then the raw font list.
  const fontOptions = [
    ...Object.keys(fontTokens).map((name) => ({ value: tokenRef("fonts", name), label: `◆ ${name}` })),
    ...FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label })),
  ];

  return (
    <Group title="Typography">
      <SelectRow node={node} prop="fontFamily" label="Font" options={fontOptions} />
      <TextRow node={node} prop="fontSize" label="Size" scrub={{ min: 1 }} />
      <SelectRow node={node} prop="fontWeight" label="Weight" options={WEIGHTS} />
      <TextRow node={node} prop="lineHeight" label="Line height" scrub={{ step: 0.05, min: 0 }} placeholder="normal" />
      <TextRow node={node} prop="letterSpacing" label="Letter sp." scrub={{ step: 0.1 }} placeholder="0" />
      <SegmentedRow
        node={node}
        prop="textAlign"
        label="Align"
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
          { value: "justify", label: "Justify" },
        ]}
      />
      <ColorRow node={node} prop="color" label="Color" />
      <SelectRow
        node={node}
        prop="textTransform"
        label="Case"
        options={[
          { value: "none", label: "As typed" },
          { value: "uppercase", label: "UPPERCASE" },
          { value: "lowercase", label: "lowercase" },
          { value: "capitalize", label: "Capitalize" },
        ]}
      />
    </Group>
  );
}
