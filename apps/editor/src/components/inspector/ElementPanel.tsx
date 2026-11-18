"use client";

/** Everything about the SELECTED element: name, content props, position, and styles. */
import { resolveRect, type Rect } from "@msb/schema";
import { designWidthOf, getDefinition, isFreeLayout, isPositionedAt } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { Group, INPUT } from "./ui";
import { PropControl } from "./PropControl";
import { BP_LABEL } from "./style/useStyleField";
import { LayoutSection } from "./sections/LayoutSection";
import { SpacingSection } from "./sections/SpacingSection";
import { SizeSection } from "./sections/SizeSection";
import { TypographySection } from "./sections/TypographySection";
import { FillSection } from "./sections/FillSection";
import { BorderSection } from "./sections/BorderSection";
import { EffectsSection } from "./sections/EffectsSection";

export function ElementPanel() {
  const node = useEditor((s) => (s.selectedId ? s.doc.nodes[s.selectedId] : undefined));
  const parent = useEditor((s) => {
    const n = s.selectedId ? s.doc.nodes[s.selectedId] : undefined;
    return n?.parentId ? s.doc.nodes[n.parentId] : undefined;
  });
  const breakpoint = useEditor((s) => s.breakpoint);
  if (!node) return null;

  const def = getDefinition(node.type);
  const { renameNode, deleteNode } = useEditor.getState();
  const freeChild = !!node.layout && isPositionedAt(parent, breakpoint);
  const stackedOnMobile = !!node.layout && isFreeLayout(parent) && !freeChild;
  // Props with schema defaults filled in (old documents may lack newer props).
  const resolvedProps = (def?.propsSchema.safeParse(node.props).data ?? node.props) as Record<string, unknown>;
  const controls = (def?.inspector ?? []).filter(
    (c) => !c.visibleWhen || resolvedProps[c.visibleWhen.prop] === c.visibleWhen.equals,
  );

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

      {controls.length > 0 && (
        <Group title="Content">
          {controls.map((control) => (
            <PropControl key={control.prop} node={node} control={control} value={resolvedProps[control.prop]} />
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

      <div className="mx-3 my-2 flex items-center gap-2 rounded bg-indigo-50 px-2 py-1.5 text-[11px] leading-snug text-indigo-800">
        <span>
          Styling <b>{BP_LABEL[breakpoint]}</b>
        </span>
        <span className="ml-auto flex items-center gap-1 text-indigo-600">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> set here
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-neutral-300" /> inherited
        </span>
      </div>

      <LayoutSection node={node} parent={parent} />
      <SpacingSection node={node} />
      <SizeSection node={node} />
      <TypographySection node={node} />
      <FillSection node={node} />
      <BorderSection node={node} />
      <EffectsSection node={node} />

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
