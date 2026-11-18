import { z } from "zod";
import { defineComponent } from "../registry";

export const Navbar = defineComponent({
  type: "Navbar",
  label: "Navbar",
  category: "Sections",
  description: "Top navigation with a brand name and links.",
  propsSchema: z.object({
    brand: z.string().default("Brand"),
    /** Comma-separated for now; becomes a proper list editor in Phase 2. */
    links: z.string().default("Home, About, Contact"),
  }),
  defaultStyles: {
    base: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      paddingTop: 20,
      paddingBottom: 20,
      paddingLeft: 24,
      paddingRight: 24,
    },
    md: { paddingLeft: 48, paddingRight: 48 },
  },
  acceptsChildren: false,
  insertable: true,
  runtimeDeps: [],
  inspector: [
    { prop: "brand", label: "Brand", control: "text" },
    { prop: "links", label: "Links (comma separated)", control: "text" },
  ],
  Render: ({ props, rootProps }) => {
    const links = props.links
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    return (
      <nav {...rootProps}>
        <strong style={{ fontSize: 20 }}>{props.brand}</strong>
        <div style={{ display: "flex", gap: 24, fontSize: 15 }}>
          {links.map((link) => (
            <a key={link} href="#" style={{ textDecoration: "none" }}>
              {link}
            </a>
          ))}
        </div>
      </nav>
    );
  },
});
