"use client";

import { resolveStyle, type Node } from "@msb/schema";
import { useEditor } from "@/store/editorStore";
import { Group, INPUT } from "../ui";
import { SegmentedInput, SegmentedRow, SelectRow, StyleRow, TextRow } from "../style/fields";
import { useStyleField, type StyleField } from "../style/useStyleField";

const ALIGN = [
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "stretch", label: "Stretch" },
];
const JUSTIFY = [
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "space-between", label: "Space between" },
  { value: "space-around", label: "Space around" },
];

/**
 * A number input that reads/writes a number embedded in a CSS string, e.g.
 * gridTemplateColumns "repeat(3, minmax(0, 1fr))" ↔ 3, or gridColumn "span 2" ↔ 2.
 */
function EmbeddedNumber({ field, pattern, format, placeholder }: {
  field: StyleField;
  pattern: RegExp;
  format: (n: number) => string;
  placeholder: string;
}) {
  const read = (v: unknown) => (typeof v === "string" ? pattern.exec(v)?.[1] : undefined);
  return (
    <input
      type="number"
      min={1}
      value={read(field.own) ?? ""}
      placeholder={read(field.inherited) ?? placeholder}
      onChange={(e) => {
        const n = Number(e.target.value);
        field.set(n > 0 ? format(n) : undefined);
      }}
      className={INPUT}
    />
  );
}

export function LayoutSection({ node, parent }: { node: Node; parent?: Node }) {
  const breakpoint = useEditor((s) => s.breakpoint);
  const display = useStyleField(node, "display");
  const columns = useStyleField(node, "gridTemplateColumns");
  const colSpan = useStyleField(node, "gridColumn");
  const rowSpan = useStyleField(node, "gridRow");

  const mode = String(display.value ?? "block");
  // Grid-item controls only make sense when the PARENT is a grid (at this breakpoint).
  const parentIsGrid = !!parent && resolveStyle(parent.styles, breakpoint).display === "grid";

  return (
    <Group title="Layout">
      <SegmentedInput
        field={display}
        options={[
          { value: "block", label: "Block" },
          { value: "flex", label: "Flex" },
          { value: "grid", label: "Grid" },
          { value: "inline-block", label: "Inline" },
          { value: "none", label: "Hide", title: "display: none — hidden at this breakpoint and up" },
        ]}
      />

      {mode === "flex" && (
        <>
          <SegmentedRow node={node} prop="flexDirection" label="Direction" options={[
            { value: "row", label: "→ Row" },
            { value: "column", label: "↓ Column" },
          ]} />
          <SelectRow node={node} prop="alignItems" label="Align" options={ALIGN} />
          <SelectRow node={node} prop="justifyContent" label="Justify" options={JUSTIFY} />
          <TextRow node={node} prop="gap" label="Gap" scrub={{ min: 0 }} placeholder="0" />
          <SegmentedRow node={node} prop="flexWrap" label="Wrap" options={[
            { value: "nowrap", label: "No wrap" },
            { value: "wrap", label: "Wrap" },
          ]} />
        </>
      )}

      {mode === "grid" && (
        <>
          <StyleRow label="Columns" field={columns}>
            <EmbeddedNumber
              field={columns}
              pattern={/^repeat\((\d+),/}
              format={(n) => `repeat(${n}, minmax(0, 1fr))`}
              placeholder="1"
            />
          </StyleRow>
          <TextRow node={node} prop="gap" label="Gap" scrub={{ min: 0 }} placeholder="0" />
          <SelectRow node={node} prop="alignItems" label="Align" options={ALIGN.map((o) => ({ ...o, value: o.value.replace("flex-", "") }))} />
        </>
      )}

      {parentIsGrid && (
        <>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Grid item</div>
          <StyleRow label="Column span" field={colSpan}>
            <EmbeddedNumber field={colSpan} pattern={/^span (\d+)/} format={(n) => `span ${n}`} placeholder="1" />
          </StyleRow>
          <StyleRow label="Row span" field={rowSpan}>
            <EmbeddedNumber field={rowSpan} pattern={/^span (\d+)/} format={(n) => `span ${n}`} placeholder="1" />
          </StyleRow>
        </>
      )}
    </Group>
  );
}
