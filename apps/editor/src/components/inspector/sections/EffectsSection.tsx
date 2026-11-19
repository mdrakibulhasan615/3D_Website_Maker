"use client";

import type { Node } from "@msb/schema";
import { Group, INPUT } from "../ui";
import { StyleRow, TextInput } from "../style/fields";
import { useStyleField, type StyleField } from "../style/useStyleField";

const SHADOWS: Record<string, { label: string; css: string }> = {
  none: { label: "None", css: "none" },
  sm: { label: "Small", css: "0 1px 2px rgba(15,23,42,.08)" },
  md: { label: "Medium", css: "0 4px 12px rgba(15,23,42,.10)" },
  lg: { label: "Large", css: "0 12px 32px rgba(15,23,42,.14)" },
  xl: { label: "Extra large", css: "0 24px 64px rgba(15,23,42,.18)" },
  glow: { label: "Glow", css: "0 0 40px rgba(99,102,241,.45)" },
};

/** "blur(8px)" ↔ 8, for filter / backdrop-filter. */
function BlurInput({ field }: { field: StyleField }) {
  const read = (v: unknown) => (typeof v === "string" ? /blur\((\d+(?:\.\d+)?)px\)/.exec(v)?.[1] : undefined);
  return (
    <input
      type="number"
      min={0}
      value={read(field.own) ?? ""}
      placeholder={read(field.inherited) ?? "0"}
      onChange={(e) => {
        const n = Number(e.target.value);
        field.set(n > 0 ? `blur(${n}px)` : undefined);
      }}
      className={INPUT}
    />
  );
}

export function EffectsSection({ node }: { node: Node }) {
  const opacity = useStyleField(node, "opacity");
  const shadow = useStyleField(node, "boxShadow");
  const blur = useStyleField(node, "filter");
  const backdrop = useStyleField(node, "backdropFilter");

  const percent = Math.round(Number(opacity.value ?? 1) * 100);
  const shadowKey = (v: unknown) => Object.entries(SHADOWS).find(([, s]) => s.css === v)?.[0];
  const ownKey = shadow.own === undefined ? "" : (shadowKey(shadow.own) ?? "custom");

  return (
    <Group title="Effects">
      <StyleRow label="Opacity" field={opacity}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={percent}
            onChange={(e) => opacity.set(Number(e.target.value) / 100)}
            className="min-w-0 flex-1 accent-indigo-600"
          />
          <span className="w-8 text-right text-[11px] tabular-nums text-neutral-500">{percent}%</span>
        </div>
      </StyleRow>

      <StyleRow label="Shadow" field={shadow}>
        <select
          value={ownKey}
          onChange={(e) => {
            const key = e.target.value;
            if (key === "") shadow.reset();
            else if (key !== "custom") shadow.set(SHADOWS[key]!.css);
          }}
          className={`${INPUT} ${shadow.own === undefined ? "text-neutral-400" : ""}`}
        >
          <option value="">
            {shadow.inherited !== undefined
              ? `${SHADOWS[shadowKey(shadow.inherited) ?? ""]?.label ?? "Custom"} (inherited)`
              : "—"}
          </option>
          {Object.entries(SHADOWS).map(([key, s]) => (
            <option key={key} value={key}>
              {s.label}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
      </StyleRow>
      {ownKey === "custom" && (
        <div className="pl-[92px]">
          <TextInput field={shadow} placeholder="0 8px 24px rgba(0,0,0,.2)" />
        </div>
      )}

      <StyleRow label="Blur" field={blur}>
        <BlurInput field={blur} />
      </StyleRow>
      <StyleRow label="Backdrop blur" field={backdrop}>
        <BlurInput field={backdrop} />
      </StyleRow>
      <p className="text-[10px] leading-snug text-neutral-400">
        Backdrop blur frosts whatever is <i>behind</i> the element — pair it with a semi-transparent fill.
      </p>
    </Group>
  );
}
