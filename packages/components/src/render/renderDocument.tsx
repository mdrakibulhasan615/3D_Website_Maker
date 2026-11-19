/**
 * The Renderer: JSON document → React elements + CSS.
 *
 * Used by the editor canvas today and by the published site (apps/sites) later.
 * Because both use THIS function, what you see in the editor is what gets published.
 */
import type { ReactNode } from "react";
import { BREAKPOINT_ORDER, getPage, resolveRect, type Node, type ResponsiveStyles, type SiteDocument } from "@msb/schema";
import { getDefinition } from "../library";
import { designWidthOf, isFreeLayout, stacksOnMobile, visualOrder } from "../layout";
import type { ComponentDefinition, RootProps } from "../registry";
import { StyleSheetBuilder } from "../styles/compileStyles";
import { tokensToCss } from "../styles/baseCss";

export type RenderMode = "editor" | "live";

/**
 * Lets the caller replace how ONE node renders (e.g. the editor swaps in a live text
 * editor for the Text being edited). Return undefined to render normally. This keeps
 * the renderer free of any editor-only dependencies.
 */
export type RenderOverride = (args: {
  node: Node;
  def: ComponentDefinition;
  props: unknown;
  rootProps: RootProps;
}) => ReactNode | undefined;

type RenderContext = {
  doc: SiteDocument;
  mode: RenderMode;
  sheet: StyleSheetBuilder;
  override?: RenderOverride;
  /** sectionId → (childId → mobile stack position). Computed once per section per render. */
  stackOrder: Map<string, Map<string, number>>;
};

export type RenderResult = {
  tree: ReactNode;
  css: string;
};

export function renderDocument(
  doc: SiteDocument,
  pageId: string,
  mode: RenderMode,
  options: { override?: RenderOverride } = {},
): RenderResult {
  const sheet = new StyleSheetBuilder(doc.breakpoints);
  const ctx: RenderContext = { doc, mode, sheet, stackOrder: new Map(), override: options.override };
  const tree = renderNode(getPage(doc, pageId).rootNodeId, ctx);
  return { tree, css: `${tokensToCss(doc.tokens)}\n${sheet.toString()}` };
}

/** Recursive: render this node, which renders its children, which render theirs... */
function renderNode(id: string, ctx: RenderContext): ReactNode {
  const node = ctx.doc.nodes[id];
  if (!node || node.hidden) return null;

  const def = getDefinition(node.type);
  if (!def) {
    // Unknown type (e.g. a component was removed). Visible in the editor, silent when published.
    return ctx.mode === "editor" ? (
      <div key={id} data-node-id={id} style={{ padding: 8, border: "1px dashed red", color: "red" }}>
        Unknown component “{node.type}”
      </div>
    ) : null;
  }

  // Validate stored props against the component's schema. Missing props get defaults,
  // so old documents keep working when a component gains a new prop.
  const parsed = def.propsSchema.safeParse(node.props);
  const props = parsed.success ? parsed.data : def.propsSchema.parse({});

  const parent = node.parentId ? ctx.doc.nodes[node.parentId] : undefined;
  const rootProps: RootProps = { className: ctx.sheet.add(effectiveStyles(node, parent, ctx)) };
  if (ctx.mode === "editor") {
    rootProps["data-node-id"] = id;
    rootProps["data-node-type"] = node.type;
    if (def.acceptsChildren) rootProps["data-container"] = "";
  }

  const overridden = ctx.override?.({ node, def, props, rootProps });
  if (overridden !== undefined) return overridden;

  const children = def.acceptsChildren ? node.children.map((childId) => renderNode(childId, ctx)) : undefined;
  const Render = def.Render;

  return (
    <Render key={id} props={props} rootProps={rootProps}>
      {children}
    </Render>
  );
}

/**
 * The user's styles plus layout-derived CSS:
 *  - a free container becomes the positioning context (position: relative)
 *  - a child of a free container gets position: absolute + its per-breakpoint rectangle
 *  - if the section stacks on mobile, positioning starts at "md" instead, and on mobile
 *    the child gets a CSS `order` so the stack follows the visual top-to-bottom order
 */
function effectiveStyles(node: Node, parent: Node | undefined, ctx: RenderContext): ResponsiveStyles {
  let styles = node.styles;
  if (isFreeLayout(node)) {
    styles = { ...styles, base: { position: "relative", ...styles.base } };
  }
  if (node.layout && parent && isFreeLayout(parent)) {
    styles = { ...styles };
    const stacked = stacksOnMobile(parent);
    const firstPositioned = stacked ? "md" : "base";
    // Proportional mode: horizontal values become % of the section's width.
    // (Percentages in `left`/`width` are relative to the positioned parent — the section.)
    const designWidth = designWidthOf(parent);
    const horizontal = (px: number) =>
      designWidth ? `${Math.round((px / designWidth) * 1e6) / 1e4}%` : px;

    for (const bp of BREAKPOINT_ORDER) {
      if (stacked && bp === "base") continue; // mobile: stay in normal flow
      // When stacking, the rect that WOULD have applied at md (often the base rect) starts there.
      const r = bp === firstPositioned ? resolveRect(node.layout, bp) : node.layout[bp];
      if (!r) continue; // larger breakpoints inherit through the CSS cascade
      styles[bp] = {
        ...styles[bp],
        ...(bp === firstPositioned ? { position: "absolute", margin: 0, maxWidth: "none" } : {}),
        left: horizontal(r.x),
        top: r.y,
        width: horizontal(r.w),
        height: r.h,
      };
    }

    if (stacked) {
      // `order` changes VISUAL order in a flex container without changing the DOM,
      // so desktop overlap (later in the DOM = drawn on top) is untouched.
      let order = ctx.stackOrder.get(parent.id);
      if (!order) {
        order = new Map(visualOrder(ctx.doc.nodes, parent).map((id, i) => [id, i]));
        ctx.stackOrder.set(parent.id, order);
      }
      styles.base = { ...styles.base, order: order.get(node.id) ?? 0 };
    }
  }
  return styles;
}
