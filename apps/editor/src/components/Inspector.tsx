"use client";

import type { ReactNode } from "react";
import { resolveRect, resolveStyle, type BreakpointId, type Node, type Rect, type StyleValue } from "@msb/schema";
import {
  designWidthOf,
  getDefinition,
  isFreeLayout,
  isPositionedAt,
  type ComponentDefinition,
  type InspectorControl,
  type LayoutMode,
} from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { setProportional, switchLayoutMode } from "@/interactions/freeform";

// ─── Which style fields to show (Phase 2 replaces this with rich, grouped controls) ───
type StyleField = { prop: string; label: string; kind: "length" | "text" | "color" | "select"; options?: string[] };

const STYLE_GROUPS: { title: string; fields: StyleField[] }[] = [
  {
    title: "Layout",
    fields: [
      { prop: "display", label: "Display", kind: "select", options: ["block", "flex", "grid", "inline-block", "none"] },
      { prop: "flexDirection", label: "Direction", kind: "select", options: ["row", "column"] },
      { prop: "alignItems", label: "Align", kind: "select", options: ["flex-start", "center", "flex-end", "stretch"] },
      {
        prop: "justifyContent",
        label: "Justify",
        kind: "select",
        options: ["flex-start", "center", "flex-end", "space-between"],
      },
      { prop: "gap", label: "Gap", kind: "length" },
    ],
  },
  {
    title: "Spacing",
    fields: [
      { prop: "paddingTop", label: "Pad top", kind: "length" },
      { prop: "paddingBottom", label: "Pad bottom", kind: "length" },
      { prop: "paddingLeft", label: "Pad left", kind: "length" },
      { prop: "paddingRight", label: "Pad right", kind: "length" },
    ],
  },
  {
    title: "Size",
    fields: [
      { prop: "width", label: "Width", kind: "length" },
      { prop: "maxWidth", label: "Max width", kind: "length" },
      { prop: "height", label: "Height", kind: "length" },
      { prop: "minHeight", label: "Min height", kind: "length" },
    ],
  },
  {
    title: "Typography",
    fields: [
      { prop: "fontSize", label: "Size", kind: "length" },
      { prop: "fontWeight", label: "Weight", kind: "select", options: ["400", "500", "600", "700", "800"] },
      { prop: "textAlign", label: "Align", kind: "select", options: ["left", "center", "right"] },
      { prop: "color", label: "Color", kind: "color" },
    ],
  },
  {
    title: "Fill",
    fields: [
      { prop: "backgroundColor", label: "Background", kind: "color" },
      { prop: "borderRadius", label: "Radius", kind: "length" },
    ],
  },
];

/** "24" → 24 (becomes 24px), "2rem" → "2rem", "" → undefined (remove). */
function parseStyleInput(raw: string): StyleValue | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  return /^-?\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : trimmed;
}

export function Inspector() {
  const node = useEditor((s) => (s.selectedId ? s.doc.nodes[s.selectedId] : undefined));
  const breakpoint = useEditor((s) => s.breakpoint);
  const breakpointLabel = useEditor((s) => s.doc.breakpoints.find((b) => b.id === s.breakpoint)?.label);
  const parent = useEditor((s) => {
    const n = s.selectedId ? s.doc.nodes[s.selectedId] : undefined;
    return n?.parentId ? s.doc.nodes[n.parentId] : undefined;
  });

  if (!node) return <PageSettings />;
  const def = getDefinition(node.type);
  const freeChild = !!node.layout && isPositionedAt(parent, breakpoint);
  const stackedOnMobile = !!node.layout && isFreeLayout(parent) && !freeChild;
  // Props with schema defaults filled in (old documents may lack newer props).
  const resolvedProps = (def?.propsSchema.safeParse(node.props).data ?? node.props) as Record<string, unknown>;
  const visibleControls = (def?.inspector ?? []).filter(
    (c) => !c.visibleWhen || resolvedProps[c.visibleWhen.prop] === c.visibleWhen.equals,
  );
  const { renameNode, deleteNode } = useEditor.getState();

  return (
    <div className="pb-8">
      <div className="border-b border-neutral-200 p-3">
        <div className="text-xs text-neutral-400">{def?.label ?? node.type}</div>
        <input
          value={node.name ?? ""}
          placeholder={def?.label ?? node.type}
          onChange={(e) => renameNode(node.id, e.target.value)}
          className="mt-1 w-full rounded border border-transparent px-1 py-0.5 text-sm font-medium hover:border-neutral-200 focus:border-indigo-400 focus:outline-none"
        />
      </div>

      {def && visibleControls.length > 0 && (
        <Group title="Content">
          {visibleControls.map((control) => (
            <PropControl key={control.prop} node={node} def={def} control={control} value={resolvedProps[control.prop]} />
          ))}
        </Group>
      )}

      {stackedOnMobile && (
        <div className="mx-3 mt-3 rounded bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
          On mobile this freeform section <b>stacks</b> its children, ordered top-to-bottom by their desktop
          position. Switch to Tablet or Desktop to position this element.
        </div>
      )}

      {freeChild && node.layout && (
        <Group title="Position (freeform)">
          <PositionFields id={node.id} rect={resolveRect(node.layout, breakpoint)} />
          {designWidthOf(parent) && (
            <p className="text-[11px] leading-snug text-neutral-400">
              X and W are in px at the {designWidthOf(parent)}px design width and scale with the section.
            </p>
          )}
          <p className="text-[11px] leading-snug text-neutral-400">
            Drag on the canvas to move, use the handles to resize. Hold <b>Alt</b> to turn off snapping.
          </p>
        </Group>
      )}

      <div className="mx-3 mt-3 rounded bg-indigo-50 px-2 py-1.5 text-[11px] leading-snug text-indigo-800">
        Editing <b>{breakpointLabel}</b> styles.
        {breakpoint === "base"
          ? " Mobile styles apply to every screen size unless overridden."
          : " Grey values are inherited from smaller screens."}
      </div>

      {STYLE_GROUPS.map((group) => (
        <Group key={group.title} title={group.title}>
          {group.fields.map((field) => (
            <StyleFieldRow key={field.prop} node={node} field={field} breakpoint={breakpoint} />
          ))}
        </Group>
      ))}

      {node.parentId && (
        <div className="px-3 pt-4">
          <button
            onClick={() => deleteNode(node.id)}
            className="w-full rounded border border-red-200 py-1.5 text-xs text-red-600 hover:bg-red-50"
          >
            Delete element
          </button>
        </div>
      )}
    </div>
  );
}

function PageSettings() {
  const title = useEditor((s) => s.doc.meta.title);
  return (
    <div className="p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Page</h2>
      <Row label="Site title">
        <input value={title} onChange={(e) => useEditor.getState().setTitle(e.target.value)} className={INPUT} />
      </Row>
      <p className="mt-4 text-xs text-neutral-400">Select an element on the canvas or in Layers to edit it.</p>
    </div>
  );
}

function PositionFields({ id, rect }: { id: string; rect: Rect }) {
  const fields: { key: keyof Rect; label: string }[] = [
    { key: "x", label: "X" },
    { key: "y", label: "Y" },
    { key: "w", label: "W" },
    { key: "h", label: "H" },
  ];
  return (
    <div className="grid grid-cols-4 gap-1">
      {fields.map(({ key, label }) => (
        <label key={key} className="flex flex-col gap-0.5">
          <span className="text-[10px] text-neutral-400">{label}</span>
          <input
            type="number"
            value={rect[key]}
            onChange={(e) => useEditor.getState().setFreeRect(id, { ...rect, [key]: Number(e.target.value) || 0 })}
            className={INPUT}
          />
        </label>
      ))}
    </div>
  );
}

/**
 * Most props are a plain "set this value". A few need extra work, so they get
 * a dedicated action (Phase 2 will move these hooks into the registry itself).
 */
function setProp(node: Node, prop: string, value: unknown) {
  const store = useEditor.getState();
  if (node.type === "Section" && prop === "layout") return switchLayoutMode(node.id, value as LayoutMode); // measures children first
  if (node.type === "Section" && prop === "mobileStack") return store.setMobileStack(node.id, value as boolean);
  if (node.type === "Section" && prop === "proportional") return setProportional(node.id, value as boolean); // measures width
  store.updateProps(node.id, { [prop]: value });
}

function PropControl({
  node,
  control,
  value: raw,
}: {
  node: Node;
  def: ComponentDefinition;
  control: InspectorControl;
  value: unknown;
}) {
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
    input = <textarea value={value} rows={3} onChange={(e) => update(e.target.value)} className={INPUT} />;
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

function StyleFieldRow({ node, field, breakpoint }: { node: Node; field: StyleField; breakpoint: BreakpointId }) {
  const own = node.styles[breakpoint]?.[field.prop]; // set at THIS breakpoint?
  const effective = resolveStyle(node.styles, breakpoint)[field.prop]; // what actually applies
  const inherited = own === undefined && effective !== undefined ? String(effective) : undefined;
  const value = own === undefined ? "" : String(own);
  const set = (raw: string) => useEditor.getState().setStyle(node.id, field.prop, parseStyleInput(raw));

  let input: ReactNode;
  if (field.kind === "select") {
    input = (
      <select value={value} onChange={(e) => set(e.target.value)} className={`${INPUT} ${own === undefined ? "text-neutral-400" : ""}`}>
        <option value="">{inherited ? `${inherited} (inherited)` : "—"}</option>
        {field.options!.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else if (field.kind === "color") {
    const current = String(own ?? effective ?? "");
    input = (
      <div className="flex gap-1">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(current) ? current : "#000000"}
          onChange={(e) => set(e.target.value)}
          className="h-7 w-8 shrink-0 cursor-pointer rounded border border-neutral-200 bg-white p-0.5"
        />
        <input value={value} placeholder={inherited ?? "none"} onChange={(e) => set(e.target.value)} className={INPUT} />
      </div>
    );
  } else {
    input = (
      <input
        value={value}
        placeholder={inherited ?? (field.kind === "length" ? "auto" : "")}
        onChange={(e) => set(e.target.value)}
        className={INPUT}
      />
    );
  }
  return <Row label={field.label}>{input}</Row>;
}

const INPUT =
  "w-full min-w-0 rounded border border-neutral-200 bg-white px-2 py-1 text-xs placeholder:text-neutral-400 focus:border-indigo-400 focus:outline-none";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-neutral-100 px-3 py-3">
      <h3 className="mb-2 text-xs font-semibold text-neutral-600">{title}</h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid grid-cols-[84px_1fr] items-center gap-2">
      <span className="text-[11px] text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
