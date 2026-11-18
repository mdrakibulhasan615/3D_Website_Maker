import { z } from "zod";
import { defineComponent } from "../registry";

/** Inline SVG placeholder, so new images work offline with no external request. */
const PLACEHOLDER_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'>" +
      "<rect width='100%' height='100%' fill='#e2e8f0'/>" +
      "<text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' " +
      "font-family='sans-serif' font-size='28' fill='#64748b'>Image</text></svg>",
  );

export const Image = defineComponent({
  type: "Image",
  label: "Image",
  category: "Basic",
  description: "A picture from a URL.",
  propsSchema: z.object({
    src: z.string().default(PLACEHOLDER_SRC),
    alt: z.string().default(""),
  }),
  defaultStyles: { base: { display: "block", width: "100%", maxWidth: 640, borderRadius: 16 } },
  acceptsChildren: false,
  insertable: true,
  runtimeDeps: [],
  inspector: [
    { prop: "src", label: "Image URL", control: "url" },
    { prop: "alt", label: "Alt text (for screen readers)", control: "text" },
  ],
  // eslint-disable-next-line @next/next/no-img-element
  Render: ({ props, rootProps }) => <img {...rootProps} src={props.src} alt={props.alt} />,
});
