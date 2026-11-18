import { z } from "zod";
import { defineComponent } from "../registry";

const SECTION_TAGS = ["section", "header", "main", "footer"] as const;

/** A full-width band of the page. Pages are a vertical stack of sections. */
export const Section = defineComponent({
  type: "Section",
  label: "Section",
  category: "Structure",
  description: "A full-width band that holds content.",
  propsSchema: z.object({
    tag: z.enum(SECTION_TAGS).default("section"),
    /** "flow" = children stack (responsive by default). "free" = place children anywhere. */
    layout: z.enum(["flow", "free"]).default("flow"),
    /** Freeform only: on phones, ignore positions and stack children top-to-bottom. */
    mobileStack: z.boolean().default(true),
    /**
     * Freeform only: scale horizontal positions/widths with the section's width.
     * Rects are stored in px "as designed at `designWidth`" and rendered as percentages.
     */
    proportional: z.boolean().default(false),
    designWidth: z.number().positive().optional(),
  }),
  defaultStyles: {
    base: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 24,
      paddingTop: 64,
      paddingBottom: 64,
      paddingLeft: 24,
      paddingRight: 24,
    },
    md: { paddingTop: 96, paddingBottom: 96, paddingLeft: 48, paddingRight: 48 },
  },
  acceptsChildren: true,
  insertable: true,
  runtimeDeps: [],
  inspector: [
    {
      prop: "layout",
      label: "Layout mode",
      control: "select",
      options: [
        { value: "flow", label: "Flow (stack)" },
        { value: "free", label: "Freeform" },
      ],
    },
    { prop: "mobileStack", label: "Stack on mobile", control: "toggle", visibleWhen: { prop: "layout", equals: "free" } },
    { prop: "proportional", label: "Scale with width", control: "toggle", visibleWhen: { prop: "layout", equals: "free" } },
    {
      prop: "tag",
      label: "HTML tag",
      control: "select",
      options: SECTION_TAGS.map((t) => ({ value: t, label: `<${t}>` })),
    },
  ],
  Render: ({ props, rootProps, children }) => {
    const Tag = props.tag;
    return <Tag {...rootProps}>{children}</Tag>;
  },
});
