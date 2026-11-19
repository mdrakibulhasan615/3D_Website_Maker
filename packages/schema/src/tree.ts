/** Pure helpers for walking the normalized node tree. No React, no side effects. */
import type { Page, SiteDocument } from "./document";

/** All descendants of a node (children, grandchildren, ...), not including the node itself. */
export function getDescendantIds(doc: SiteDocument, id: string): string[] {
  const out: string[] = [];
  const stack = [...(doc.nodes[id]?.children ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    out.push(current);
    stack.push(...(doc.nodes[current]?.children ?? []));
  }
  return out;
}

/** True if `ancestorId` is somewhere above `id` in the tree. Used to block "drop a box into itself". */
export function isAncestorOf(doc: SiteDocument, ancestorId: string, id: string): boolean {
  let current = doc.nodes[id]?.parentId ?? null;
  while (current) {
    if (current === ancestorId) return true;
    current = doc.nodes[current]?.parentId ?? null;
  }
  return false;
}

/** Is this node locked — itself, or because any ancestor is locked? */
export function isLockedInTree(doc: SiteDocument, id: string): boolean {
  let current: string | null | undefined = id;
  while (current) {
    const node: SiteDocument["nodes"][string] | undefined = doc.nodes[current];
    if (!node) return false;
    if (node.locked) return true;
    current = node.parentId;
  }
  return false;
}

export function getPage(doc: SiteDocument, pageId: string): Page {
  return doc.pages.find((p) => p.id === pageId) ?? doc.pages[0]!;
}
