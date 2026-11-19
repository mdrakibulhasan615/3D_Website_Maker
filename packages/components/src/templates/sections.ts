/**
 * The section library. Each template is plain DATA built from existing primitives
 * (Section, Container, Text, Button, Image) — so every piece stays individually
 * selectable, styleable, responsive, and copy/paste-able after it's inserted.
 *
 * Colors are token references WITH fallbacks: they follow your brand tokens, and
 * still look right in a document that doesn't define them.
 */
import { tokenRef } from "../tokens";
import { el, type ElementSpec } from "./builder";

export type TemplateCategory = "Hero" | "Features" | "Social proof" | "Pricing" | "Call to action";

export type SectionTemplate = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  build: () => ElementSpec;
};

// ─── Shared design pieces ────────────────────────────────────────────────────

const C = {
  brand: tokenRef("colors", "brand", "#4f46e5"),
  ink: tokenRef("colors", "ink", "#0f172a"),
  paper: tokenRef("colors", "paper", "#f8fafc"),
  muted: tokenRef("colors", "muted", "#475569"),
  surface: tokenRef("colors", "surface", "#f1f5f9"),
  line: "#e2e8f0",
};

/** A responsive grid: 1 column on phones, `cols` from tablet up. */
const grid = (cols: number, extra: ElementSpec["styles"] = {}): ElementSpec["styles"] => ({
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
    gap: 24,
    width: "100%",
    maxWidth: 1120,
    marginTop: 24,
    textAlign: "left",
    ...extra.base,
  },
  md: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, ...extra.md },
  ...(extra.lg ? { lg: extra.lg } : {}),
});

const heading = (text: string, tag: "h1" | "h2" = "h2") =>
  el("Text", {
    props: { tag, text },
    styles:
      tag === "h1"
        ? { base: { fontSize: 40, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1, maxWidth: 820 }, md: { fontSize: 64 } }
        : { base: { fontSize: 30, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.5, maxWidth: 720 }, md: { fontSize: 40 } },
  });

const lead = (text: string) =>
  el("Text", { props: { text }, styles: { base: { fontSize: 17, color: C.muted, maxWidth: 620 }, md: { fontSize: 19 } } });

const secondaryButton = (label: string) =>
  el("Button", {
    name: "Secondary button",
    props: { label },
    styles: { base: { backgroundColor: "transparent", color: C.ink, borderWidth: 1, borderStyle: "solid", borderColor: "#cbd5e1" } },
  });

/** A small square "icon" made from a glyph, so it needs no image assets. */
const glyph = (char: string) =>
  el("Text", {
    name: "Icon",
    props: { tag: "span", text: char },
    styles: {
      base: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: 10,
        fontSize: 18,
        color: C.brand,
        backgroundColor: C.surface,
      },
    },
  });

const card = (name: string, styles: ElementSpec["styles"], children: ElementSpec[]) =>
  el(
    "Container",
    {
      name,
      styles: {
        ...styles,
        base: {
          gap: 12,
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
          borderRadius: 16,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: C.line,
          backgroundColor: "#ffffff",
          ...styles?.base,
        },
      },
    },
    children,
  );

// ─── Templates ───────────────────────────────────────────────────────────────

const heroCentered: SectionTemplate = {
  id: "hero-centered",
  name: "Hero · Centered",
  description: "Big headline, supporting line and two buttons.",
  category: "Hero",
  build: () =>
    el("Section", { name: "Hero", styles: { base: { textAlign: "center", gap: 20 }, md: { paddingTop: 144, paddingBottom: 144 } } }, [
      el("Text", {
        name: "Eyebrow",
        props: { tag: "span", text: "New · Version 2.0" },
        styles: {
          base: {
            display: "inline-block",
            fontSize: 13,
            fontWeight: 600,
            color: C.brand,
            backgroundColor: C.surface,
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 14,
            paddingRight: 14,
            borderRadius: 999,
          },
        },
      }),
      heading("Build pages people remember", "h1"),
      lead("Design visually, animate on scroll, and publish a fast site — without touching code."),
      el("Container", { name: "Actions", styles: { base: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 8 } } }, [
        el("Button", { props: { label: "Get started" } }),
        secondaryButton("See examples"),
      ]),
    ]),
};

const heroSplit: SectionTemplate = {
  id: "hero-split",
  name: "Hero · Split",
  description: "Text on one side, an image on the other.",
  category: "Hero",
  build: () =>
    el("Section", { name: "Hero" }, [
      el(
        "Container",
        {
          name: "Split",
          styles: {
            base: { width: "100%", maxWidth: 1120, gap: 40, alignItems: "stretch" },
            md: { flexDirection: "row", alignItems: "center", gap: 56 },
          },
        },
        [
          el("Container", { name: "Copy", styles: { base: { flex: 1, gap: 20, alignItems: "flex-start" } } }, [
            heading("Your product, beautifully explained", "h1"),
            lead("Pair a clear message with a strong visual. Swap the image for a screenshot or a 3D scene later."),
            el("Container", { name: "Actions", styles: { base: { flexDirection: "row", flexWrap: "wrap", gap: 12 } } }, [
              el("Button", { props: { label: "Start free" } }),
              secondaryButton("Book a demo"),
            ]),
          ]),
          el("Image", { props: { alt: "Product preview" }, styles: { base: { flex: 1, maxWidth: "none", borderRadius: 24 } } }),
        ],
      ),
    ]),
};

const features: [string, string, string][] = [
  ["◆", "Visual editing", "Place real components and see exactly what ships."],
  ["●", "Responsive", "Tune every element for mobile, tablet and desktop."],
  ["▲", "Design tokens", "Change a brand color once, update the whole site."],
  ["■", "Freeform layouts", "Break the grid where it matters, with smart guides."],
  ["★", "Fast by default", "Clean CSS and lazy-loaded media keep pages quick."],
  ["✦", "Motion-ready", "Scroll animations and 3D scenes slot right in."],
];

const featureGrid: SectionTemplate = {
  id: "feature-grid",
  name: "Feature grid",
  description: "Heading plus six feature cards in a responsive grid.",
  category: "Features",
  build: () =>
    el("Section", { name: "Features", styles: { base: { textAlign: "center", gap: 16 } } }, [
      heading("Everything you need to ship"),
      lead("A focused toolkit for building modern marketing sites."),
      el(
        "Container",
        { name: "Feature grid", styles: grid(3) },
        features.map(([icon, title, body]) =>
          card("Feature", {}, [
            glyph(icon),
            el("Text", { props: { tag: "h3", text: title }, styles: { base: { fontSize: 18, fontWeight: 700 } } }),
            el("Text", { props: { text: body }, styles: { base: { fontSize: 15, color: C.muted } } }),
          ]),
        ),
      ),
    ]),
};

/** A bento tile. `md` spans only apply from tablet up (see the note in the template). */
const tile = (title: string, body: string, styles: ElementSpec["styles"], dark = false) =>
  el(
    "Container",
    {
      name: "Tile",
      styles: {
        ...styles,
        base: {
          justifyContent: "flex-end",
          gap: 6,
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
          borderRadius: 20,
          overflow: "hidden",
          color: dark ? "#ffffff" : C.ink,
          ...styles?.base,
        },
      },
    },
    [
      el("Text", { props: { tag: "h3", text: title }, styles: { base: { fontSize: 22, fontWeight: 700 } } }),
      el("Text", { props: { text: body }, styles: { base: { fontSize: 15, opacity: 0.8 } } }),
    ],
  );

const bentoGrid: SectionTemplate = {
  id: "bento-grid",
  name: "Bento grid",
  description: "Asymmetric tiles of different sizes — great for highlights.",
  category: "Features",
  build: () =>
    el("Section", { name: "Highlights", styles: { base: { textAlign: "center", gap: 16 } } }, [
      heading("Built for the details"),
      el(
        "Container",
        {
          name: "Bento grid",
          // gridAutoRows gives every row the same height, so tiles that span 2 rows line up.
          styles: grid(4, { base: { gap: 16, gridAutoRows: "minmax(180px, auto)" } }),
        },
        [
          // Spans are set on "md" only: "span 2" inside a 1-column phone grid would
          // create extra columns and overflow the screen.
          tile(
            "Scroll-driven motion",
            "Timelines that follow the reader down the page.",
            {
              base: { backgroundImage: `linear-gradient(135deg, ${tokenRef("colors", "brand")}, #ec4899)`, backgroundColor: C.brand },
              md: { gridColumn: "span 2", gridRow: "span 2" },
            },
            true,
          ),
          tile("3D scenes", "Drop in models that react to scroll.", { base: { backgroundColor: C.ink }, md: { gridColumn: "span 2" } }, true),
          tile("Tokens", "One palette, everywhere.", { base: { backgroundColor: C.surface } }),
          tile("Breakpoints", "Pixel-perfect on every screen.", { base: { backgroundColor: C.surface } }),
          tile("Export", "Clean React + Tailwind when you need it.", { base: { backgroundColor: "#fef3c7" }, md: { gridColumn: "span 2" } }),
          tile("Publish", "Live in one click.", {
            base: { backgroundColor: "#ffffff", borderWidth: 1, borderStyle: "solid", borderColor: C.line },
            md: { gridColumn: "span 2" },
          }),
        ],
      ),
    ]),
};

const plan = (name: string, price: string, blurb: string, perks: string[], featured = false) => {
  const sub = featured ? "#94a3b8" : C.muted;
  return card(
    featured ? "Plan (featured)" : "Plan",
    {
      base: {
        gap: 16,
        paddingTop: 32,
        paddingBottom: 32,
        paddingLeft: 28,
        paddingRight: 28,
        borderRadius: 20,
        ...(featured ? { backgroundColor: C.ink, color: C.paper, borderColor: C.ink, boxShadow: "0 24px 64px rgba(15,23,42,.18)" } : {}),
      },
    },
    [
      el("Text", {
        name: "Plan name",
        props: { tag: "span", text: featured ? `${name} · Most popular` : name },
        styles: { base: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: featured ? "#a5b4fc" : C.brand } },
      }),
      el("Container", { name: "Price", styles: { base: { flexDirection: "row", alignItems: "baseline", gap: 4 } } }, [
        el("Text", { props: { tag: "h3", text: price }, styles: { base: { fontSize: 44, fontWeight: 800, lineHeight: 1 } } }),
        el("Text", { props: { tag: "span", text: "/ month" }, styles: { base: { fontSize: 15, color: sub } } }),
      ]),
      el("Text", { props: { text: blurb }, styles: { base: { fontSize: 15, color: sub } } }),
      el(
        "Container",
        { name: "Perks", styles: { base: { gap: 8, flex: 1 } } },
        perks.map((perk) => el("Text", { props: { text: `✓  ${perk}` }, styles: { base: { fontSize: 15 } } })),
      ),
      el("Button", { props: { label: featured ? "Start free trial" : "Choose plan" }, styles: { base: { display: "block", textAlign: "center" } } }),
    ],
  );
};

const pricing: SectionTemplate = {
  id: "pricing",
  name: "Pricing",
  description: "Three plans with a highlighted favourite.",
  category: "Pricing",
  build: () =>
    el("Section", { name: "Pricing", styles: { base: { textAlign: "center", gap: 16 } } }, [
      heading("Simple, honest pricing"),
      lead("Start free. Upgrade when your site takes off."),
      el("Container", { name: "Plans", styles: grid(3, { base: { maxWidth: 1040, alignItems: "stretch" } }) }, [
        plan("Starter", "$0", "For personal projects and experiments.", ["1 site", "Community support", "Basic animations"]),
        plan("Pro", "$29", "For professionals shipping client work.", ["10 sites", "Custom domains", "3D scenes", "Code export"], true),
        plan("Team", "$79", "For teams that build together.", ["Unlimited sites", "Shared design tokens", "Priority support"]),
      ]),
    ]),
};

const quotes: [string, string, string, string][] = [
  ["The scroll animations used to take us a week. Now it's an afternoon.", "Maya Lindqvist", "Design lead, Kitebase", "ML"],
  ["Our marketing team ships pages without waiting on engineering anymore.", "Daniel Osei", "Head of Growth, Fieldnote", "DO"],
  ["Exported code that a developer would actually want to keep. Rare.", "Priya Raman", "Frontend engineer, Orbit", "PR"],
];

const testimonials: SectionTemplate = {
  id: "testimonials",
  name: "Testimonials",
  description: "Three quote cards with names and roles.",
  category: "Social proof",
  build: () =>
    el("Section", { name: "Testimonials", styles: { base: { textAlign: "center", gap: 16, backgroundColor: C.surface } } }, [
      heading("Loved by teams who ship"),
      el(
        "Container",
        { name: "Quotes", styles: grid(3) },
        quotes.map(([quote, person, role, initials]) =>
          card("Quote", { base: { gap: 20, justifyContent: "space-between", borderRadius: 20 } }, [
            el("Text", { props: { text: `“${quote}”` }, styles: { base: { fontSize: 17, lineHeight: 1.6 } } }),
            el("Container", { name: "Author", styles: { base: { flexDirection: "row", alignItems: "center", gap: 12 } } }, [
              el("Text", {
                name: "Avatar",
                props: { tag: "span", text: initials },
                styles: {
                  base: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#ffffff",
                    backgroundColor: C.brand,
                  },
                },
              }),
              el("Container", { name: "Name", styles: { base: { gap: 2 } } }, [
                el("Text", { props: { text: person }, styles: { base: { fontSize: 15, fontWeight: 600 } } }),
                el("Text", { props: { text: role }, styles: { base: { fontSize: 13, color: C.muted } } }),
              ]),
            ]),
          ]),
        ),
      ),
    ]),
};

const ctaBand: SectionTemplate = {
  id: "cta-band",
  name: "Call to action",
  description: "A bold gradient band with one clear next step.",
  category: "Call to action",
  build: () =>
    el(
      "Section",
      {
        name: "Call to action",
        styles: {
          base: {
            textAlign: "center",
            gap: 20,
            color: "#ffffff",
            backgroundImage: `linear-gradient(135deg, ${tokenRef("colors", "brand")}, #7c3aed)`,
            backgroundColor: C.brand,
          },
        },
      },
      [
        heading("Ready to build something that moves?"),
        el("Text", { props: { text: "Start free — no credit card required." }, styles: { base: { fontSize: 18, opacity: 0.85 } } }),
        el("Button", { props: { label: "Create your site" }, styles: { base: { backgroundColor: "#ffffff", color: C.brand } } }),
      ],
    ),
};

export const SECTION_TEMPLATES: SectionTemplate[] = [heroCentered, heroSplit, featureGrid, bentoGrid, pricing, testimonials, ctaBand];

export const TEMPLATE_BY_ID: Record<string, SectionTemplate> = Object.fromEntries(SECTION_TEMPLATES.map((t) => [t.id, t]));
