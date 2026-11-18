import { z } from "zod";
import { defineComponent } from "../registry";

/** The root node of every page. Not insertable — each page has exactly one. */
export const Page = defineComponent({
  type: "Page",
  label: "Page",
  category: "Structure",
  description: "The root of a page.",
  propsSchema: z.object({}),
  defaultStyles: { base: { minHeight: "100vh", display: "flex", flexDirection: "column" } },
  acceptsChildren: true,
  insertable: false,
  runtimeDeps: [],
  inspector: [],
  Render: ({ rootProps, children }) => <div {...rootProps}>{children}</div>,
});
