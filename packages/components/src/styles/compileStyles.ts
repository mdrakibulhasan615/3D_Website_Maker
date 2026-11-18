/**
 * Style compiler: turns a node's style JSON into a real CSS class.
 *
 *   { base: { paddingTop: 24 }, md: { paddingTop: 48 } }
 *        ↓
 *   .s-1x9ab { padding-top: 24px }
 *   @media (min-width: 768px) { .s-1x9ab { padding-top: 48px } }
 *
 * The class name is a HASH of the styles, so identical styles share one class
 * (smaller CSS), and the output is deterministic (same input → same CSS).
 */
import {
  BREAKPOINT_ORDER,
  type Breakpoint,
  type ResponsiveStyles,
  type StyleObject,
  type StyleValue,
} from "@msb/schema";

/** CSS properties where a bare number must NOT get "px" appended. */
const UNITLESS = new Set([
  "opacity",
  "zIndex",
  "fontWeight",
  "lineHeight",
  "flex",
  "flexGrow",
  "flexShrink",
  "order",
  "aspectRatio",
  "scale",
]);

/** paddingTop → padding-top */
function toKebabCase(prop: string): string {
  return prop.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
}

function formatValue(prop: string, value: StyleValue): string {
  return typeof value === "number" && !UNITLESS.has(prop) ? `${value}px` : String(value);
}

function toDeclarations(style: StyleObject | undefined): string {
  if (!style) return "";
  return Object.entries(style)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .map(([prop, value]) => `${toKebabCase(prop)}:${formatValue(prop, value)}`)
    .join(";");
}

/** JSON.stringify with sorted keys, so {a,b} and {b,a} hash the same. */
function stableStringify(styles: ResponsiveStyles): string {
  return BREAKPOINT_ORDER.map((bp) => {
    const style = styles[bp] ?? {};
    const keys = Object.keys(style).sort();
    return `${bp}{${keys.map((k) => `${k}:${style[k]}`).join(";")}}`;
  }).join("|");
}

/** FNV-1a: a tiny, fast, non-cryptographic string hash. */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Collects CSS rules while the renderer walks the tree, then prints one stylesheet. */
export class StyleSheetBuilder {
  private rules = new Map<string, string>();

  constructor(private breakpoints: Breakpoint[]) {}

  /** Register a node's styles; returns the class name to put on its element. */
  add(styles: ResponsiveStyles): string {
    const className = `s-${hash(stableStringify(styles))}`;
    if (!this.rules.has(className)) {
      this.rules.set(className, this.buildRule(className, styles));
    }
    return className;
  }

  private buildRule(className: string, styles: ResponsiveStyles): string {
    let css = "";
    for (const bp of this.breakpoints) {
      const declarations = toDeclarations(styles[bp.id]);
      if (!declarations) continue;
      const rule = `.${className}{${declarations}}`;
      css += bp.minWidth > 0 ? `@media (min-width:${bp.minWidth}px){${rule}}` : rule;
    }
    return css;
  }

  toString(): string {
    return [...this.rules.values()].join("\n");
  }
}
