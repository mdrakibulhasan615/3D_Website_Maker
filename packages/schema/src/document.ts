/**
 * The Site Document: the single source of truth for a user's website.
 *
 * Each shape is defined ONCE as a Zod schema. From it we get:
 *   - a TypeScript type (via `z.infer`) for compile-time safety, and
 *   - a runtime validator (`.safeParse`) for data from localStorage / the database.
 */
import { z } from "zod";

/** Bump this whenever the document shape changes, and add a migration. */
export const CURRENT_SCHEMA_VERSION = 1;

// ─── Breakpoints ─────────────────────────────────────────────────────────────
// Mobile-first: "base" applies everywhere, "md" overrides from 768px, "lg" from 1024px.
export const BreakpointIdSchema = z.enum(["base", "md", "lg"]);
export type BreakpointId = z.infer<typeof BreakpointIdSchema>;

export const BreakpointSchema = z.object({
  id: BreakpointIdSchema,
  label: z.string(),
  /** CSS media query threshold. */
  minWidth: z.number(),
  /** How wide the editor canvas is when previewing this breakpoint. */
  previewWidth: z.number(),
});
export type Breakpoint = z.infer<typeof BreakpointSchema>;

export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { id: "base", label: "Mobile", minWidth: 0, previewWidth: 390 },
  { id: "md", label: "Tablet", minWidth: 768, previewWidth: 768 },
  { id: "lg", label: "Desktop", minWidth: 1024, previewWidth: 1280 },
];

// ─── Styles ──────────────────────────────────────────────────────────────────
// camelCase CSS properties, e.g. { paddingTop: 24, color: "#fff" }.
// Numbers become px (except unitless props like opacity) in the style compiler.
export const StyleValueSchema = z.union([z.string(), z.number()]);
export type StyleValue = z.infer<typeof StyleValueSchema>;

export const StyleObjectSchema = z.record(z.string(), StyleValueSchema);
export type StyleObject = z.infer<typeof StyleObjectSchema>;

export const ResponsiveStylesSchema = z.object({
  base: StyleObjectSchema.optional(),
  md: StyleObjectSchema.optional(),
  lg: StyleObjectSchema.optional(),
});
export type ResponsiveStyles = z.infer<typeof ResponsiveStylesSchema>;

// ─── Freeform layout (used by children of "free" sections; wired up next) ────
/** A box in a free section's local coordinates (px from the section's top-left). */
export const RectSchema = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
export type Rect = z.infer<typeof RectSchema>;
export const FreeLayoutSchema = z.object({
  base: RectSchema,
  md: RectSchema.optional(),
  lg: RectSchema.optional(),
});
export type FreeLayout = z.infer<typeof FreeLayoutSchema>;

// ─── Nodes ───────────────────────────────────────────────────────────────────
// Stored NORMALIZED: a flat map of id → node, with parent/children references,
// instead of nested objects. Moving a node = editing two arrays + one field.
export const NodeSchema = z.object({
  id: z.string(),
  /** Key into the Component Registry, e.g. "Text", "Section". */
  type: z.string(),
  /** Optional user-facing name shown in the Layers panel. */
  name: z.string().optional(),
  parentId: z.string().nullable(),
  children: z.array(z.string()),
  /** Component-specific props; validated by that component's own Zod schema. */
  props: z.record(z.string(), z.unknown()),
  styles: ResponsiveStylesSchema,
  layout: FreeLayoutSchema.optional(),
  animationIds: z.array(z.string()),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
});
export type Node = z.infer<typeof NodeSchema>;

// ─── Animations (schema reserved now, runtime arrives in Phase 3) ────────────
export const AnimationTriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("load"), delay: z.number().optional() }),
  z.object({ type: z.literal("hover") }),
  z.object({ type: z.literal("click") }),
  z.object({
    type: z.literal("scroll"),
    start: z.string(),
    end: z.string(),
    scrub: z.union([z.boolean(), z.number()]),
    pin: z.boolean().optional(),
    triggerNodeId: z.string().optional(),
  }),
]);

export const AnimationSchema = z.object({
  id: z.string(),
  targetNodeId: z.string(),
  trigger: AnimationTriggerSchema,
  tracks: z.array(
    z.object({
      property: z.string(),
      keyframes: z.array(
        z.object({
          t: z.number().min(0).max(1),
          value: z.union([z.number(), z.string()]),
          ease: z.string().optional(),
        }),
      ),
    }),
  ),
  reducedMotion: z.enum(["disable", "fade-only"]),
});
export type Animation = z.infer<typeof AnimationSchema>;

// ─── Assets ──────────────────────────────────────────────────────────────────
export const AssetSchema = z.object({
  id: z.string(),
  kind: z.enum(["image", "video", "model"]),
  name: z.string(),
  url: z.string(),
});
export type Asset = z.infer<typeof AssetSchema>;

// ─── The document ────────────────────────────────────────────────────────────
export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  rootNodeId: z.string(),
});
export type Page = z.infer<typeof PageSchema>;

export const DesignTokensSchema = z.object({
  colors: z.record(z.string(), z.string()),
  fonts: z.record(z.string(), z.string()),
});
export type DesignTokens = z.infer<typeof DesignTokensSchema>;

export const SiteDocumentSchema = z.object({
  id: z.string(),
  schemaVersion: z.number().int(),
  meta: z.object({ title: z.string(), description: z.string().optional() }),
  tokens: DesignTokensSchema,
  breakpoints: z.array(BreakpointSchema),
  pages: z.array(PageSchema).min(1),
  nodes: z.record(z.string(), NodeSchema),
  animations: z.record(z.string(), AnimationSchema),
  assets: z.record(z.string(), AssetSchema),
});
export type SiteDocument = z.infer<typeof SiteDocumentSchema>;
