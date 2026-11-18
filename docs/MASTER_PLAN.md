# Master Execution Plan — "Canva for Web Design with Advanced Motion"

> Living document. Every major architecture decision lives here. If we deviate, update this file.

---

## 0. The Core Idea

The whole platform rests on one rule:

> **The website is data (a JSON document). Everything else is a *view* of that data.**

- The **Editor** reads and writes that JSON.
- The **Published site** renders that JSON.
- The **Code exporter** turns that JSON into source files.

All three use the same **Component Registry**, so a block looks and behaves the same in the editor, on the live site, and in exported code. Most of the decisions below follow from this rule.

```
                    ┌──────────────────────────────┐
                    │   Site Document (JSON)       │
                    │   nodes · styles · motion    │
                    └──────────────┬───────────────┘
             ┌─────────────────────┼─────────────────────┐
             ▼                     ▼                     ▼
     ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
     │   EDITOR     │      │  RENDERER    │      │  COMPILER    │
     │ (read/write) │      │ (SSR publish)│      │ (code export)│
     └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
            └─────────────────────┼─────────────────────┘
                                  ▼
                    ┌──────────────────────────────┐
                    │  Component Registry          │
                    │  (Hero, Bento, Scene3D, ...) │
                    └──────────────────────────────┘
```

---

## 1. System Architecture & Tech Stack

### 1.1 Repository Layout (Monorepo)

**Choice:** npm workspaces + Turborepo. *(Originally pnpm; switched because npm ships with Node — zero setup. Swappable later with no code changes.)* Workspace packages are named `@msb/*` and ship raw TypeScript (Next.js compiles them via `transpilePackages`). The Renderer lives in `packages/components/src/render`.
**Why:** the editor, the published-site renderer, and the exporter all need the same schema and components. A monorepo lets them import shared packages without publishing to npm. *Rejected alternative:* separate repos, which would mean version drift between the editor and the renderer.

```
3D_Website_Maker/
├── apps/
│   ├── editor/          # Next.js app: dashboard + visual editor (mostly client-side)
│   └── sites/           # Next.js app: serves published user sites (SSR/ISR, multi-tenant by domain)
├── packages/
│   ├── schema/          # TypeScript types + Zod validators for the Site Document; migrations
│   ├── components/      # Component Registry: every block's render + props schema + inspector config
│   ├── motion/          # Animation runtime: JSON timeline → GSAP/ScrollTrigger; Lenis setup
│   ├── three/           # R3F helpers: shared canvas, model loader, Spline wrapper
│   ├── compiler/        # JSON → React/Tailwind source files (export pipeline)
│   └── ui/              # Editor-only UI kit (panels, inputs, color pickers) — shadcn/ui based
├── supabase/            # SQL migrations, RLS policies, edge functions
└── docs/                # This plan, ADRs (architecture decision records)
```

### 1.2 Frontend Framework

| Layer | Choice | Why | Trade-off |
|---|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript** | One framework covers both needs: the editor runs client-side (`"use client"`), published sites get SSR/ISR for SEO and fast first paint. | App Router's server/client boundary takes some learning. Vite + a separate SSR server would be lighter for the editor alone but duplicates infrastructure. |
| Styling (editor UI) | Tailwind CSS + shadcn/ui | Fast to build, consistent, accessible primitives (Radix). | None significant. |
| Styling (user sites) | **Style objects in JSON → compiled to CSS** (atomic classes at publish, Tailwind on export) | Users pick arbitrary values (e.g. `padding: 37px`), and Tailwind's JIT can't run on arbitrary values at runtime. | Two style outputs to maintain (runtime CSS + Tailwind export). |

### 1.3 Drag-and-Drop & Canvas Engine

**Key decision: a DOM canvas, not a `<canvas>` canvas.**
User components render as real HTML inside an **iframe** in the editor.

- **Why DOM:** what you see is exactly what gets published (same CSS, same fonts, same layout engine). Canva-style `<canvas>` rendering would mean reimplementing CSS layout, which is enormous.
- **Why an iframe:** (1) the user site's CSS can't leak into the editor UI, and the editor's CSS can't leak into the site; (2) resizing the iframe gives **real** responsive breakpoints, so media queries fire correctly; (3) GSAP and Lenis run in isolation.

**Library evaluation:**

| Option | Verdict |
|---|---|
| **@dnd-kit** | ✅ **Use for:** dragging blocks from the Insert panel into the canvas, reordering in flow layout, and the Layer Tree. Accessible, sensors are customizable, works across iframes with a custom sensor. |
| **React Flow** | ❌ Built for node graphs (wires between boxes), not page layout. |
| **Moveable / custom pointer engine** | ✅ **Use for:** freeform move/resize/rotate, snap guides, and distance indicators. dnd-kit doesn't do resize handles or smart guides. |
| Pure custom engine | Later, if Moveable becomes limiting. |

> **Decision (Phase 1, implemented):** we built a small **custom pointer engine** instead of dnd-kit + Moveable.
> Reason: the canvas is an iframe, so pointer events arrive in two different documents with two coordinate
> systems, and dnd-kit measures droppables in the parent document. Our drop logic ("between siblings",
> "inside container", "at a point in a free section") was custom anyway. See `apps/editor/src/interactions/`:
> `pointerSession` (shared gesture plumbing) → `dragDrop` + `dropTargets` (insert/reorder/reparent) and
> `freeform` + `snapping` (move/resize with smart guides). dnd-kit remains an option for non-canvas lists later.

**Layout modes (an important trade-off):**

```
Page (vertical flow, always)
 └── Section  ← layout: "flow" | "grid" | "free"
      ├── flow: children stack (flexbox). Responsive for free.
      ├── grid: CSS Grid with snap-to-cell (Bento grids live here).
      └── free: children absolutely positioned *within the section*,
               with per-breakpoint x/y/w/h overrides.
```

**Why freeform only inside sections:** a fully freeform page (Canva-style) breaks on mobile because absolute positions don't reflow. Framer and Webflow both settled on the same compromise: **sections flow vertically, and the inside of a section can be freeform.** Users get creative freedom, and the page still works at every screen size.

**Snap system:** a spatial index (simple sorted edge arrays at first, an R-tree later) of sibling edges and centers. While dragging, find the nearest edge within 6px → snap and draw a guide line. Grid mode snaps to computed track lines.

### 1.4 3D & Animation Engine

| Concern | Choice | Why |
|---|---|---|
| 3D rendering | **Three.js via React Three Fiber (R3F) + drei** | Declarative and React-native, so a 3D scene is just another component with props. drei provides loaders, controls, and `<View>`. |
| No-code 3D | **Spline** (`@splinetool/react-spline`) as a separate block type | Designers can bring scenes from Spline. Trade-off: heavier runtime (~500KB+) and less control, so it stays optional and lazy-loaded. |
| Timeline animation | **GSAP + ScrollTrigger** | Industry standard, handles scrub/pin/stagger robustly, and timelines can be scrubbed (crucial for the editor's timeline preview). Now free for all uses, plugins included. |
| Smooth scroll | **Lenis** | Light, works with native scroll (no fake scroll container), so accessibility and `position: sticky` keep working. |
| Simple UI micro-interactions | CSS transitions (hover, press) | No JS cost for basic states. |

**Why GSAP over Framer Motion for the runtime:** our animations are *data* (JSON timelines), not hand-written JSX. GSAP's imperative timeline API maps cleanly from JSON and supports scrubbing to any time `t`, which the editor timeline needs. Framer Motion stays an *export option* for users who want idiomatic React code.

**Wiring Lenis ↔ GSAP ↔ R3F (one clock):**

```
requestAnimationFrame (driven by gsap.ticker)
   │
   ├─► lenis.raf(time)               // smooth scroll position
   │       └─► lenis.on('scroll') ─► ScrollTrigger.update()
   │                                     └─► timelines progress (scrub)
   │
   └─► R3F scenes read scroll progress from a shared store
         (frameloop="demand" → invalidate() only when progress changes)
```

A single ticker keeps scroll, DOM animations, and 3D scenes in sync, avoiding the jitter you get from competing rAF loops.

**Multiple 3D blocks on one page:** browsers cap WebGL contexts (~16). Use **one shared `<Canvas>`** fixed behind the page, with drei's `<View>` drawing each 3D block into its DOM rectangle. One context, many scenes.

### 1.5 State Management & Persistence

**Editor state: Zustand + Immer, normalized.**

- **Why Zustand:** small, fast, and components subscribe to *slices*, so dragging one node doesn't re-render the whole tree. Redux adds boilerplate without benefit here. Jotai is a viable alternative but makes whole-document operations (undo, save) more awkward.
- **Why normalized (flat map by id):** moving a node becomes "change `parentId` + two `children` arrays" instead of deep tree surgery. Lookups are O(1).
- **Undo/redo:** Immer's `produceWithPatches` gives forward and inverse patches for free. Store patches, not full snapshots.
- **Future multiplayer:** the patch-based design maps onto **Yjs** (CRDT) later without rewriting the store's API.

**Site Document schema (in `packages/schema`):**

```ts
type SiteDocument = {
  id: string;
  schemaVersion: number;              // enables migrations as the format evolves
  meta: { title: string; favicon?: AssetRef; seo: SeoMeta };
  tokens: DesignTokens;               // colors, fonts, spacing, radii → CSS variables
  breakpoints: { id: 'base' | 'md' | 'lg'; minWidth: number }[];
  pages: { id: string; slug: string; rootNodeId: string }[];
  nodes: Record<NodeId, Node>;        // normalized tree
  animations: Record<AnimId, Animation>;
  assets: Record<AssetId, Asset>;
};

type Node = {
  id: NodeId;
  type: string;                       // registry key: "Hero", "Text", "Scene3D", "BentoGrid"...
  parentId: NodeId | null;
  children: NodeId[];
  props: Record<string, unknown>;     // validated by that component's Zod schema
  styles: Partial<Record<BreakpointId, StyleObject>>; // base + overrides (mobile-first)
  layout?: FreeLayout | GridPlacement; // when parent section is "free" or "grid"
  animationIds: AnimId[];
  locked?: boolean; hidden?: boolean; name?: string;
};

type Animation = {
  id: AnimId;
  targetNodeId: NodeId;
  trigger:
    | { type: 'load'; delay?: number }
    | { type: 'hover' | 'click' }
    | { type: 'scroll'; start: string; end: string; scrub: boolean | number; pin?: boolean; triggerNodeId?: NodeId };
  tracks: {
    property: 'x' | 'y' | 'scale' | 'rotate' | 'opacity' | 'clipPath' | `three.${string}`;
    keyframes: { t: number; value: number | string; ease?: string }[]; // t: 0..1
  }[];
  reducedMotion: 'disable' | 'fade-only';
};
```

**Database (Supabase / PostgreSQL):**

```sql
projects        (id, owner_id, name, created_at, updated_at)
site_documents  (project_id PK, doc JSONB, schema_version, updated_at)   -- current draft
document_versions (id, project_id, doc JSONB, created_at, label)          -- snapshots / history
deployments     (id, project_id, version_id, domain, status, published_at)
assets          (id, project_id, storage_path, kind, size, meta JSONB)    -- files in Supabase Storage
```

- **Why JSONB for the document:** the editor always loads and saves the *whole* document, so relational normalization (a row per node) would cost joins for no benefit. JSONB still allows indexing and querying when needed.
- **Saving:** debounced autosave (~1.5s after edits) sends the full doc. If documents grow large, switch to sending patches.
- **Publishing** creates an immutable `document_versions` row, so the live site never changes until the user republishes.
- **Security:** Row Level Security, so users only touch their own projects.

---

## 2. Component-Based Architecture & Editor Core

### 2.1 Anatomy of a Component (the Registry contract)

Every block, from a Text label to a 3D scene, is defined the same way:

```ts
// packages/components/src/hero/index.ts
export const Hero = defineComponent({
  type: 'Hero',
  category: 'Sections',
  propsSchema: z.object({
    heading: z.string().default('Build something stunning'),
    subheading: z.string().optional(),
    align: z.enum(['left', 'center']).default('center'),
    background: z.enum(['none', 'gradient', 'scene3d']).default('gradient'),
  }),
  defaultStyles: { base: { paddingBlock: 96 } },
  acceptsChildren: true,            // can users drop things inside?
  runtimeDeps: [],                  // e.g. ['gsap'] or ['three'] → drives code-splitting
  inspector: [                      // how the Property Inspector renders controls
    { prop: 'heading', control: 'text' },
    { prop: 'align', control: 'segmented' },
    { prop: 'background', control: 'select' },
  ],
  render: lazy(() => import('./Hero.view')),  // the actual React component
});
```

**Why this shape:**
- The **Zod schema** is the single source of truth. It validates saved data, generates inspector defaults, and types the render props.
- **`inspector` config** means the editor never hard-codes per-component UI: add a component and its controls appear automatically.
- **`runtimeDeps`** lets the publisher ship GSAP/Three.js only to pages that use them.

**Initial component library:**

| Category | Components |
|---|---|
| Primitives | Text, Image, Button, Link, Icon, Video, Container |
| Sections | Hero, Feature Grid, Bento Grid, Testimonials, Pricing, Footer, Navbar |
| Motion | Parallax Container, Marquee, Sticky Scroll Stack, Reveal Group, Horizontal Scroll |
| 3D | Scene3D (GLTF model + lights + camera), Spline Embed, Particle Field, Shader Background |

### 2.2 Editor UI Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ Top Bar: project · breakpoint switcher · undo/redo · preview · publish│
├────────────┬────────────────────────────────────────┬────────────────┤
│ Left Panel │            Canvas Viewport             │  Inspector     │
│            │  ┌──────────────────────────────────┐  │                │
│ • Insert   │  │ <iframe> renders the user site   │  │ • Props        │
│ • Layers   │  │   via the same Renderer          │  │ • Layout       │
│ • Pages    │  └──────────────────────────────────┘  │ • Style        │
│ • Assets   │  Overlay layer (outside iframe):       │ • Tokens       │
│            │  selection boxes, handles, snap guides │ • Motion       │
├────────────┴────────────────────────────────────────┴────────────────┤
│ Timeline: tracks per animated node · keyframes · scrubber · scroll ↕ │
└──────────────────────────────────────────────────────────────────────┘
```

**Editor data flow (a single edit):**

```
User drags a resize handle
   │
   ▼
Overlay (pointer events, in editor document)
   │  converts screen coords → iframe coords → section-local coords
   ▼
store.dispatch(updateNodeLayout(id, { w: 420 }))     // Zustand + Immer
   │  produces patches → pushed to undo stack
   ▼
Store notifies subscribers
   ├─► Inspector re-renders "Width: 420"
   ├─► Layers panel (unchanged → no re-render, thanks to slices)
   └─► Iframe bridge posts the patch → iframe Renderer updates only that node
                                          │
                                          ▼
                               Overlay re-measures node rect (ResizeObserver)
   │
   ▼
Autosave debounce → Supabase
```

**Key editor sub-systems:**

1. **Iframe bridge:** the editor and the iframe share the same JS origin (`srcdoc` or a same-origin route), so the iframe can read the Zustand store directly with no `postMessage` serialization. *Trade-off:* less isolation than a cross-origin iframe, but much simpler and faster.
2. **Overlay layer:** selection outlines and handles render *outside* the iframe on top of it. User content can't cover them, and they don't pollute the user's DOM.
3. **Layer Tree:** a virtualized tree (handles hundreds of nodes) with dnd-kit sortable for reparenting.
4. **Property Inspector:** auto-generated from each component's `inspector` config. Style controls write to `styles[activeBreakpoint]`. Values can be raw (`24px`) or token references (`var(--space-4)`).
5. **Timeline Controller:**
   - Renders tracks and keyframes from `animations`.
   - Builds a **real GSAP timeline** in the iframe, paused, and dragging the scrubber calls `timeline.progress(p)`. The preview *is* the runtime, not an approximation.
   - Scroll animations show a "scroll position" scrubber instead of a time scrubber.

### 2.3 JSON → HTML/CSS/JS (the Renderer)

```
SiteDocument
   │
   ▼
renderNode(id)  — recursive
   ├─ registry[node.type].render(props, children)
   ├─ styles → className (atomic CSS hashed from style object, per breakpoint)
   ├─ layout (free) → position:absolute + per-breakpoint left/top/width/height
   └─ data-anim-id attrs → picked up by Motion runtime after hydration
   │
   ▼
HTML (SSR) + one CSS file + minimal JS islands
   │
   ▼
Client: hydrate → Motion runtime builds GSAP timelines → lazy-mount 3D when in view
```

**Style compilation:** each unique style object → a deterministic hashed class (e.g. `.s-3fa2 { padding: 24px }`, `@media (min-width:768px) { .s-3fa2 { padding: 48px } }`). Tokens become CSS custom properties on `:root`. *Why:* deduplicates styles across nodes, and the output is small, cacheable, and free of runtime CSS-in-JS cost.

---

## 3. Code Generation & Export Pipeline

### 3.1 Two Output Paths

| Path | How | When |
|---|---|---|
| **A. Hosted publish** | `apps/sites` renders the immutable document version via the Renderer (ISR, cached at the edge). Custom domains map to project IDs. | Default and fastest: "click Publish, it's live". |
| **B. Code export** | `packages/compiler` generates a standalone Next.js/Vite project (zip or GitHub push). | Users who want to own and extend the code. |

**Why both:** path A reuses the Renderer, so it's cheap to build and always faithful. Path B is the "no lock-in" promise but is harder to make clean, which is why it comes last in the roadmap.

### 3.2 Compiler Pipeline (Path B)

```
SiteDocument
   │ 1. Validate + migrate (schema package)
   ▼
IR (intermediate representation)
   │ 2. Component extraction: repeated subtrees → reusable components
   │ 3. Style lowering: style objects → Tailwind classes
   │      (arbitrary values → `p-[37px]`; tokens → tailwind.config theme)
   │ 4. Motion lowering: animations → `useGSAP()` hooks  (or Framer Motion variants)
   │ 5. 3D lowering: Scene3D → R3F component file + model in /public
   ▼
Code emitters (one per target: next-tailwind, vite-react, framer-motion)
   │ 6. Generate JSX via templates/AST (ts-morph) → Prettier format
   ▼
File tree → zip / GitHub repo / Vercel deploy hook
```

- **Each emitter owns its component templates** (`Hero.next.tsx.tmpl`), so exported code reads like a human wrote it, not like a generic `renderNode` loop.
- **Deploy:** Vercel's Deploy API (or Netlify) for one-click deploy of exported code. GitHub App integration to push to a user's repo.

### 3.3 Performance Strategy (60+ FPS)

**Loading:**
- **Per-page dependency graph:** union of `runtimeDeps` across used components → only load GSAP, Lenis, and Three.js where needed. A text-only page ships ~0 KB of animation JS.
- **Dynamic imports** for every heavy block (`next/dynamic`, `ssr: false` for 3D).
- **3D lazy-mount:** IntersectionObserver with `rootMargin: 200%`, so the scene loads shortly before it scrolls into view and a static poster image shows until then.
- **Asset pipeline at upload:** GLTF → Draco/Meshopt compression + KTX2 textures (via `gltf-transform` in a Supabase Edge Function or worker); images → AVIF/WebP, responsive `srcset`.

**Runtime:**
- Animate only **`transform` and `opacity`** (compositor-only, no layout). The inspector warns when animating layout properties (width, top, ...).
- `will-change` added only while an animation is active.
- R3F: `frameloop="demand"`, `dpr={[1, 1.75]}` clamp, `PerformanceMonitor` from drei to degrade quality on slow GPUs.
- One shared WebGL canvas (see 1.4).
- `prefers-reduced-motion` → honor each animation's `reducedMotion` setting; Lenis disabled.
- Mobile: optional "lite mode" per 3D block (poster image or lower-poly model).

**Budgets enforced in CI for published templates:** LCP < 2.5s, CLS < 0.1, INP < 200ms, JS < 150KB gzipped (excluding lazy 3D).

---

## 4. Phased Development Roadmap

### Phase 1 — Core Drag-and-Drop Canvas & Static Layouts (MVP)
**Goal:** build a static landing page by dragging blocks, and see it responsive.

- [x] Monorepo scaffold (npm workspaces + Turborepo), `apps/editor`, `packages/schema`, `packages/components`
- [x] Site Document types + Zod schema (nodes, styles, breakpoints)
- [x] Zustand store: normalized nodes, selection, undo/redo via Immer patches
- [x] Iframe canvas + Renderer (`renderNode`) + style compiler (hashed classes)
- [x] Overlay: hover outline, selection box
- [x] Overlay: resize handles (freeform children)
- [x] Insert panel (click-to-insert)
- [x] Insert panel → drag into canvas; flow-layout reordering; Layers drag-to-reparent (custom pointer engine)
- [x] Freeform sections with snap guides (custom; Alt disables snapping)
- [x] Freeform on mobile: "Stack on mobile" toggle (default on). Below 768px children stack in normal flow,
      ordered by their desktop position via CSS `order` (DOM unchanged, so desktop overlap is preserved).
- [x] Freeform on tablet: "Scale with width" (default on for new free sections). Rects are stored in px at the
      section's `designWidth` and rendered as % horizontally (y/h stay px). Editing converts screen px → design px.
      Editing a rect at a breakpoint pins larger breakpoints first, so fixing Tablet never moves Desktop.
- [ ] Known limit: narrower boxes make text wrap taller than its fixed height → may overlap; adjust at Tablet
      (move/resize or a smaller tablet font size). Possible later: auto-height for text-like elements.
- [ ] Consider the same "don't leak upward" pinning for per-breakpoint *styles* (today they cascade mobile-first).
- [ ] Accessibility: CSS `order` changes visual but not screen-reader order in stacked sections.
- [x] Breakpoint switcher (iframe width) with per-breakpoint style overrides
- [x] 6–8 primitives (Text, Image, Button, Container, Section, Navbar, Footer)
- [x] Local persistence (localStorage autosave) — no backend yet

**Exit criteria:** build a 3-section landing page, edit it at 3 breakpoints, undo/redo works, 60 FPS while dragging.

### Phase 2 — Component System & Styling Inspector
**Goal:** a professional-feeling editor with a real component library.

- [ ] `defineComponent` registry contract + auto-generated Inspector
- [ ] Inspector panels: Layout (flex/grid/free), Spacing, Typography, Colors, Borders, Effects (shadow, blur, gradients)
- [ ] Design tokens panel → CSS variables; token references in style values
- [ ] Layer Tree (virtualized, rename, lock, hide, drag to reparent)
- [ ] Section library: Hero, Feature Grid, Bento Grid (grid snap), Pricing, Testimonials
- [ ] Copy/paste, duplicate, group, keyboard shortcuts
- [ ] Rich text editing (Tiptap) inside Text nodes

**Exit criteria:** a non-developer can build a polished marketing page from templates in under 15 minutes.

### Phase 3 — Motion, GSAP Scroll Triggers & 3D (R3F)
**Goal:** the differentiator — cinematic motion without code.

- [ ] `packages/motion`: JSON Animation → GSAP timeline interpreter; Lenis + ScrollTrigger + ticker wiring
- [ ] Motion panel in Inspector: presets (Fade Up, Parallax, Pin & Scrub, Stagger Reveal, Text Split)
- [ ] Timeline Controller: tracks, keyframes, easing editor, scrubbing via `timeline.progress()`
- [ ] Motion components: Parallax Container, Sticky Scroll Stack, Horizontal Scroll, Marquee
- [ ] `packages/three`: shared Canvas + drei `<View>`; Scene3D block (GLTF upload, lighting presets, orbit/auto-rotate)
- [ ] Scroll-linked 3D: bind `three.rotation.y` / camera position tracks to scroll progress
- [ ] Spline Embed block (lazy)
- [ ] Asset upload with GLTF compression worker
- [ ] Reduced-motion handling + performance warnings in editor

**Exit criteria:** a hero where a 3D product rotates on scroll while text reveals in sync, sustaining 60 FPS on a mid-range laptop.

### Phase 4 — Saving, Publishing & Code Export
**Goal:** go live and own your code.

- [ ] Supabase: auth, projects, site_documents, versions, assets, RLS policies
- [ ] Autosave + version history (restore snapshots)
- [ ] `apps/sites`: multi-tenant SSR/ISR renderer, subdomain + custom domain routing
- [ ] Per-page code-splitting by `runtimeDeps`; Lighthouse CI budgets
- [ ] `packages/compiler`: IR → Next.js + Tailwind + GSAP emitter; zip download
- [ ] GitHub push + Vercel deploy integration
- [ ] (Stretch) Framer Motion emitter; Yjs real-time collaboration

**Exit criteria:** publish to a URL in under 10s; the exported project runs with `npm install && npm run dev` and looks identical.

---

## 5. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Editor preview ≠ published output | Same Renderer + same registry in both; visual regression tests (Playwright screenshots) |
| Freeform layouts break on mobile | Freeform scoped to sections; per-breakpoint overrides; "auto-stack on mobile" toggle |
| Schema changes break saved projects | `schemaVersion` + migration functions in `packages/schema`, tested on fixtures |
| 3D kills performance | Shared canvas, lazy mount, compression, DPR clamp, PerformanceMonitor, poster fallbacks |
| Exported code is ugly | Per-target templates, component extraction, Prettier; snapshot tests of emitted code |
| Scope creep | Each phase ships something usable; Phase 1 has no backend on purpose |

---

## 6. Glossary (for learning)

- **SSR / ISR:** Server-Side Rendering (HTML built per request) / Incremental Static Regeneration (HTML built once, cached, rebuilt when content changes).
- **Normalized state:** storing tree items in a flat `{ id: item }` map with references instead of nested objects.
- **Immer patches:** small "diff" records of what changed, which give us cheap undo/redo.
- **CRDT (Yjs):** a data structure that lets multiple users edit simultaneously and merge without conflicts.
- **ScrollTrigger scrub:** ties an animation's progress directly to scroll position instead of time.
- **WebGL context:** the GPU drawing surface behind a `<canvas>`; browsers allow only a limited number.
- **Compositor-only properties:** `transform` and `opacity` can animate without recalculating layout, which keeps animations smooth.
