import { z } from "zod";
import { defineComponent } from "../registry";
import { RichTextSchema, renderRichText } from "../richText";

const TEXT_TAGS = ["h1", "h2", "h3", "p", "span"] as const;

export const Text = defineComponent({
  type: "Text",
  label: "Text",
  category: "Basic",
  description: "A heading or paragraph.",
  propsSchema: z.object({
    /** Plain text — always kept in sync (layer labels, search, accessibility). */
    text: z.string().default("Edit this text"),
    /** Formatted text (bold, links…). When present, it's what gets rendered. */
    rich: RichTextSchema.optional(),
    tag: z.enum(TEXT_TAGS).default("p"),
  }),
  defaultStyles: { base: { fontSize: 18, lineHeight: 1.5 } },
  acceptsChildren: false,
  insertable: true,
  runtimeDeps: [],
  inspector: [
    { prop: "text", label: "Text", control: "textarea" },
    {
      prop: "tag",
      label: "Tag",
      control: "select",
      options: TEXT_TAGS.map((t) => ({ value: t, label: t.toUpperCase() })),
    },
  ],
  Render: ({ props, rootProps }) => {
    // The semantic tag (h1 vs p) matters for SEO and accessibility; the LOOK comes from styles.
    const Tag = props.tag;
    return <Tag {...rootProps}>{props.rich?.length ? renderRichText(props.rich) : props.text}</Tag>;
  },
});
