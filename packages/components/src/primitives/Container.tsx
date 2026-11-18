import { z } from "zod";
import { defineComponent } from "../registry";

/** A generic box for grouping and laying out children (flexbox by default). */
export const Container = defineComponent({
  type: "Container",
  label: "Container",
  category: "Structure",
  description: "A box that groups and arranges other elements.",
  propsSchema: z.object({}),
  defaultStyles: { base: { display: "flex", flexDirection: "column", gap: 16 } },
  acceptsChildren: true,
  insertable: true,
  runtimeDeps: [],
  inspector: [],
  Render: ({ rootProps, children }) => <div {...rootProps}>{children}</div>,
});
