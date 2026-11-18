import { z } from "zod";
import { defineComponent } from "../registry";

export const Footer = defineComponent({
  type: "Footer",
  label: "Footer",
  category: "Sections",
  description: "Bottom-of-page text.",
  propsSchema: z.object({
    text: z.string().default("© Your company"),
  }),
  defaultStyles: {
    base: {
      paddingTop: 32,
      paddingBottom: 32,
      paddingLeft: 24,
      paddingRight: 24,
      textAlign: "center",
      fontSize: 14,
      color: "#64748b",
    },
  },
  acceptsChildren: false,
  insertable: true,
  runtimeDeps: [],
  inspector: [{ prop: "text", label: "Text", control: "text" }],
  Render: ({ props, rootProps }) => (
    <footer {...rootProps}>
      <p>{props.text}</p>
    </footer>
  ),
});
