"use client";

import type { Node } from "@msb/schema";
import { Group } from "../ui";
import { MiniField, SelectRow } from "../style/fields";

export function SizeSection({ node }: { node: Node }) {
  return (
    <Group title="Size">
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        <MiniField node={node} prop="width" label="Width" />
        <MiniField node={node} prop="height" label="Height" />
        <MiniField node={node} prop="minWidth" label="Min W" placeholder="0" />
        <MiniField node={node} prop="minHeight" label="Min H" placeholder="0" />
        <MiniField node={node} prop="maxWidth" label="Max W" placeholder="none" />
        <MiniField node={node} prop="maxHeight" label="Max H" placeholder="none" />
      </div>
      <SelectRow node={node} prop="overflow" label="Overflow" options={["visible", "hidden", "auto", "clip"]} />
    </Group>
  );
}
