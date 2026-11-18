import { resolveRect, type BreakpointId, type Node, type Rect } from "@msb/schema";

export type LayoutMode = "flow" | "free";

/**
 * Is this container in freeform mode? Children of a free container are absolutely
 * positioned using their `layout` rectangles instead of stacking (flexbox).
 */
export function isFreeLayout(node: Node | undefined | null): boolean {
  return node?.props.layout === "free";
}

/** Free section that turns back into a simple vertical stack on phones (the default). */
export function stacksOnMobile(node: Node | undefined | null): boolean {
  return isFreeLayout(node) && node!.props.mobileStack !== false;
}

/**
 * If this free section scales with width, the width (px) its rects were designed at.
 * null = fixed-pixel mode (rects are literal px at every width).
 */
export function designWidthOf(node: Node | undefined | null): number | null {
  if (!isFreeLayout(node) || node!.props.proportional !== true) return null;
  const width = node!.props.designWidth;
  return typeof width === "number" && width > 0 ? width : null;
}

/**
 * Are this container's children absolutely positioned AT THIS BREAKPOINT?
 * False for flow containers, and for stacking free sections at "base" (mobile).
 */
export function isPositionedAt(node: Node | undefined | null, breakpoint: BreakpointId): boolean {
  return isFreeLayout(node) && !(breakpoint === "base" && stacksOnMobile(node));
}

/**
 * The visual reading order of a free section's children: top-to-bottom, then left-to-right,
 * based on where they sit on DESKTOP (where people usually design). Orders the mobile stack.
 */
export function visualOrder(nodes: Record<string, Node>, section: Node): string[] {
  const rectOf = (id: string): Rect | null => {
    const layout = nodes[id]?.layout;
    return layout ? resolveRect(layout, "lg") : null;
  };
  return [...section.children].sort((a, b) => {
    const ra = rectOf(a);
    const rb = rectOf(b);
    if (!ra || !rb) return 0;
    return ra.y - rb.y || ra.x - rb.x;
  });
}

/** Starting size for elements placed into a free section. */
const FREE_SIZES: Record<string, { w: number; h: number }> = {
  Text: { w: 320, h: 80 },
  Image: { w: 320, h: 200 },
  Button: { w: 160, h: 48 },
  Container: { w: 280, h: 180 },
  Section: { w: 480, h: 240 },
  Navbar: { w: 640, h: 64 },
  Footer: { w: 480, h: 64 },
};

export function defaultFreeSize(type: string): { w: number; h: number } {
  return FREE_SIZES[type] ?? { w: 240, h: 120 };
}

/** A sensible spot for a new element with no drop point: left edge, below everything else. */
export function nextFreeRect(nodes: Record<string, Node>, section: Node, type: string): Rect {
  let bottom = 0;
  for (const id of section.children) {
    const layout = nodes[id]?.layout;
    if (layout) {
      const r = resolveRect(layout, "lg");
      bottom = Math.max(bottom, r.y + r.h);
    }
  }
  return { x: 24, y: bottom + 24, ...defaultFreeSize(type) };
}
