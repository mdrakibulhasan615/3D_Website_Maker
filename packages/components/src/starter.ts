/** A starter landing page, so the editor never opens to a blank screen. */
import {
  BREAKPOINT_ORDER,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_BREAKPOINTS,
  createId,
  type Node,
  type ResponsiveStyles,
  type SiteDocument,
} from "@msb/schema";
import { createNode } from "./factory";
import { FONT_OPTIONS } from "./fonts";
import { tokenRef } from "./tokens";

const color = (name: string) => tokenRef("colors", name);

type Overrides = { name?: string; props?: Record<string, unknown>; styles?: ResponsiveStyles };

export function createStarterDocument(): SiteDocument {
  const nodes: Record<string, Node> = {};

  const add = (type: string, parentId: string | null, overrides: Overrides = {}): string => {
    const node = createNode(type, parentId);
    if (overrides.name) node.name = overrides.name;
    Object.assign(node.props, overrides.props);
    for (const bp of BREAKPOINT_ORDER) {
      if (overrides.styles?.[bp]) node.styles[bp] = { ...node.styles[bp], ...overrides.styles[bp] };
    }
    nodes[node.id] = node;
    if (parentId) nodes[parentId]!.children.push(node.id);
    return node.id;
  };

  const root = add("Page", null);

  add("Navbar", root, { props: { brand: "Lumen", links: "Features, Pricing, About" } });

  const hero = add("Section", root, {
    name: "Hero",
    styles: {
      base: { paddingTop: 96, paddingBottom: 96, textAlign: "center", backgroundColor: color("ink"), color: color("paper") },
      md: { paddingTop: 140, paddingBottom: 140 },
    },
  });
  add("Text", hero, {
    props: { tag: "h1", text: "Design websites that move." },
    styles: { base: { fontSize: 40, fontWeight: 800, lineHeight: 1.1, maxWidth: 720 }, md: { fontSize: 64 } },
  });
  add("Text", hero, {
    props: { tag: "p", text: "Drag, drop and animate — then publish in one click." },
    styles: { base: { color: "#cbd5e1", maxWidth: 560 } },
  });
  add("Button", hero, { props: { label: "Get started" } });

  const features = add("Section", root, { name: "Features" });
  add("Text", features, {
    props: { tag: "h2", text: "Everything you need" },
    styles: { base: { fontSize: 32, fontWeight: 700 } },
  });
  const row = add("Container", features, {
    name: "Feature row",
    styles: { base: { width: "100%", maxWidth: 1040, gap: 24 }, md: { flexDirection: "row" } },
  });
  const cards: [string, string][] = [
    ["Visual canvas", "Build layouts by placing real components — no code required."],
    ["Responsive", "Tweak styles per breakpoint and preview mobile, tablet and desktop."],
    ["Motion-ready", "Scroll-driven animation and 3D scenes arrive in Phase 3."],
  ];
  for (const [title, body] of cards) {
    const card = add("Container", row, {
      name: "Card",
      styles: {
        base: {
          flex: 1,
          gap: 8,
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
          borderRadius: 16,
          backgroundColor: color("surface"),
        },
      },
    });
    add("Text", card, { props: { tag: "h3", text: title }, styles: { base: { fontSize: 20, fontWeight: 700 } } });
    add("Text", card, { props: { text: body }, styles: { base: { fontSize: 16, color: color("muted") } } });
  }

  add("Footer", root, { props: { text: "© 2026 Lumen. Built with Motion Site Builder." } });

  return {
    id: createId("doc"),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: { title: "My first site" },
    tokens: {
      colors: { brand: "#4f46e5", ink: "#0f172a", paper: "#f8fafc", muted: "#475569", surface: "#f1f5f9" },
      fonts: { heading: FONT_OPTIONS[0]!.value, body: FONT_OPTIONS[0]!.value },
    },
    breakpoints: structuredClone(DEFAULT_BREAKPOINTS),
    pages: [{ id: createId("page"), name: "Home", slug: "/", rootNodeId: root }],
    nodes,
    animations: {},
    assets: {},
  };
}
