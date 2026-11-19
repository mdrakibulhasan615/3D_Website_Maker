/**
 * Rich text as DATA ("spans"), rendered as real React elements.
 *
 *   [{ text: "Hello " }, { text: "world", marks: ["bold"] }, { break: true }, { text: "docs", href: "/docs" }]
 *
 * Why not store HTML? Rendering stored HTML means injecting it into the page —
 * the classic XSS hole (e.g. <img onerror=…> or javascript: links). Spans can only
 * ever become the handful of elements below, and links are checked before rendering.
 */
import type { ReactNode } from "react";
import { z } from "zod";

export const RICH_MARKS = ["bold", "italic", "underline", "strike", "code"] as const;
export type RichMark = (typeof RICH_MARKS)[number];

export const RichSpanSchema = z.union([
  z.object({
    text: z.string(),
    marks: z.array(z.enum(RICH_MARKS)).optional(),
    href: z.string().optional(),
  }),
  z.object({ break: z.literal(true) }),
]);
export type RichSpan = z.infer<typeof RichSpanSchema>;
export const RichTextSchema = z.array(RichSpanSchema);

/**
 * Only allow link targets that can't run code: web, mail, phone, in-page anchors and
 * same-site paths. Blocks "javascript:", "data:", "vbscript:" and friends.
 */
export function isSafeHref(href: string): boolean {
  const value = href.trim();
  return /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(value);
}

/** The text without formatting (layer labels, accessibility, search). */
export function richToPlainText(spans: RichSpan[]): string {
  return spans.map((s) => ("break" in s ? "\n" : s.text)).join("");
}

/** Does it contain any formatting worth keeping? (Otherwise the plain `text` prop is enough.) */
export function hasFormatting(spans: RichSpan[] | undefined): boolean {
  return !!spans?.some((s) => "break" in s || (s.marks && s.marks.length > 0) || s.href);
}

// Inner → outer wrapping order, so the HTML nesting is always the same.
const WRAP: [RichMark, (child: ReactNode, key: number) => ReactNode][] = [
  ["code", (c, k) => <code key={k}>{c}</code>],
  ["strike", (c, k) => <s key={k}>{c}</s>],
  ["underline", (c, k) => <u key={k}>{c}</u>],
  ["italic", (c, k) => <em key={k}>{c}</em>],
  ["bold", (c, k) => <strong key={k}>{c}</strong>],
];

export function renderRichText(spans: RichSpan[]): ReactNode[] {
  return spans.map((span, i) => {
    if ("break" in span) return <br key={i} />;
    let node: ReactNode = span.text;
    for (const [mark, wrap] of WRAP) {
      if (span.marks?.includes(mark)) node = wrap(node, i);
    }
    if (span.href && isSafeHref(span.href)) {
      const external = /^https?:\/\//i.test(span.href);
      node = (
        <a key={i} href={span.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {node}
        </a>
      );
    }
    // Plain strings in an array still need keys; wrapping in a keyed fragment would add noise.
    return typeof node === "string" ? <span key={i}>{node}</span> : node;
  });
}
