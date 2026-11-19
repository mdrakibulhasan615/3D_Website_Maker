/**
 * Translating between OUR stored format (spans) and Tiptap's editing format (JSON).
 * Tiptap is only used while editing, so this boundary is the only place that knows both.
 */
import type { JSONContent } from "@tiptap/react";
import { RICH_MARKS, isSafeHref, type RichMark, type RichSpan } from "@msb/components";

const isRichMark = (type: string): type is RichMark => (RICH_MARKS as readonly string[]).includes(type);

/** Stored spans (or plain text for older Text nodes) → a one-paragraph Tiptap document. */
export function spansToTiptap(spans: RichSpan[] | undefined, text: string): JSONContent {
  const source: RichSpan[] = spans?.length
    ? spans
    : text.split("\n").flatMap((line, i) => (i > 0 ? [{ break: true as const }, { text: line }] : [{ text: line }]));

  const content: JSONContent[] = source.flatMap((span): JSONContent[] => {
    if ("break" in span) return [{ type: "hardBreak" }];
    if (!span.text) return []; // ProseMirror doesn't allow empty text nodes
    const marks: JSONContent["marks"] = (span.marks ?? []).map((type) => ({ type }));
    if (span.href) marks.push({ type: "link", attrs: { href: span.href } });
    return [{ type: "text", text: span.text, ...(marks.length ? { marks } : {}) }];
  });

  return { type: "doc", content: [{ type: "paragraph", ...(content.length ? { content } : {}) }] };
}

/** Tiptap JSON → spans. Keeps only the marks we support and only safe links. */
export function tiptapToSpans(json: JSONContent): RichSpan[] {
  const spans: RichSpan[] = [];
  (json.content ?? []).forEach((block, blockIndex) => {
    if (blockIndex > 0) spans.push({ break: true }); // extra paragraphs (e.g. from a paste) become line breaks
    for (const inline of block.content ?? []) {
      if (inline.type === "hardBreak") {
        spans.push({ break: true });
      } else if (inline.type === "text" && inline.text) {
        const marks = (inline.marks ?? []).map((m) => m.type).filter(isRichMark);
        const href = inline.marks?.find((m) => m.type === "link")?.attrs?.href;
        spans.push({
          text: inline.text,
          ...(marks.length ? { marks } : {}),
          ...(typeof href === "string" && isSafeHref(href) ? { href } : {}),
        });
      }
    }
  });
  return spans;
}
