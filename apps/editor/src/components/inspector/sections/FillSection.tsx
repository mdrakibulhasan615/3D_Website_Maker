"use client";

import type { Node, StyleValue } from "@msb/schema";
import { useEditor } from "@/store/editorStore";
import { Group, INPUT, Row, Segmented } from "../ui";
import { ColorFieldInput, ColorInput, StyleRow } from "../style/fields";
import { useStyleField } from "../style/useStyleField";
import { gradientCss, parseGradient, type Gradient } from "../style/values";

const DEFAULT_GRADIENT: Gradient = { angle: 135, from: "#6366f1", to: "#ec4899" };

/**
 * Background: None / Solid / Gradient. A gradient lives in `background-image`,
 * a solid color in `background-color` — two CSS properties behind one control.
 */
export function FillSection({ node }: { node: Node }) {
  const color = useStyleField(node, "backgroundColor");
  const image = useStyleField(node, "backgroundImage");
  const setStyles = (patch: Record<string, StyleValue | undefined>) => useEditor.getState().setStyles(node.id, patch);

  const gradient = parseGradient(image.value);
  const mode = gradient ? "gradient" : color.value !== undefined && color.value !== "transparent" ? "solid" : "none";
  const g = gradient ?? DEFAULT_GRADIENT;
  const setGradient = (next: Partial<Gradient>) => setStyles({ backgroundImage: gradientCss({ ...g, ...next }) });

  const switchMode = (next: string) => {
    if (next === "none") {
      // If a smaller breakpoint sets a background, we must explicitly override it.
      setStyles({
        backgroundColor: color.inherited !== undefined ? "transparent" : undefined,
        backgroundImage: image.inherited !== undefined ? "none" : undefined,
      });
    } else if (next === "solid") {
      setStyles({ backgroundImage: image.inherited !== undefined ? "none" : undefined, backgroundColor: color.value ?? "#ffffff" });
    } else {
      setStyles({ backgroundImage: gradientCss(g) });
    }
  };

  return (
    <Group title="Fill">
      <Segmented
        value={mode}
        onChange={switchMode}
        options={[
          { value: "none", label: "None" },
          { value: "solid", label: "Solid" },
          { value: "gradient", label: "Gradient" },
        ]}
      />
      {mode === "solid" && (
        <StyleRow label="Color" field={color}>
          <ColorFieldInput field={color} />
        </StyleRow>
      )}
      {mode === "gradient" && (
        <>
          <div className="h-6 rounded border border-black/10" style={{ backgroundImage: gradientCss(g) }} />
          <Row label="Angle">
            <input type="number" value={g.angle} onChange={(e) => setGradient({ angle: Number(e.target.value) || 0 })} className={INPUT} />
          </Row>
          <Row label="From">
            <ColorInput value={g.from} onChange={(v) => v !== undefined && setGradient({ from: String(v) })} />
          </Row>
          <Row label="To">
            <ColorInput value={g.to} onChange={(v) => v !== undefined && setGradient({ to: String(v) })} />
          </Row>
        </>
      )}
    </Group>
  );
}
