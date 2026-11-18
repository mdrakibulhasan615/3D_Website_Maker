import { z } from "zod";
import { defineComponent } from "../registry";

/** A link styled as a button (an <a>, because buttons on marketing sites navigate). */
export const Button = defineComponent({
  type: "Button",
  label: "Button",
  category: "Basic",
  description: "A call-to-action link.",
  propsSchema: z.object({
    label: z.string().default("Click me"),
    href: z.string().default("#"),
  }),
  defaultStyles: {
    base: {
      display: "inline-block",
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 24,
      paddingRight: 24,
      borderRadius: 999,
      // A token reference (with a fallback in case the document has no "brand" token).
      backgroundColor: "var(--color-brand, #4f46e5)",
      color: "#ffffff",
      fontWeight: 600,
      textDecoration: "none",
    },
  },
  acceptsChildren: false,
  insertable: true,
  runtimeDeps: [],
  inspector: [
    { prop: "label", label: "Label", control: "text" },
    { prop: "href", label: "Link URL", control: "url" },
  ],
  Render: ({ props, rootProps }) => (
    <a {...rootProps} href={props.href}>
      {props.label}
    </a>
  ),
});
