/**
 * Turning parts of a document into fragments and back. Pure functions — no store,
 * no DOM — so they're easy to reason about (and to unit-test later).
 */
import {
  FRAGMENT_KIND,
  FragmentSchema,
  createId,
  getDescendantIds,
  type Fragment,
  type Node,
  type SiteDocument,
} from "@msb/schema";
import { createNode, getDefinition } from "@msb/components";

/** Copy a node and its whole subtree out of the document. */
export function extractFragment(doc: SiteDocument, id: string): Fragment {
  const nodes: Record<string, Node> = {};
  for (const nodeId of [id, ...getDescendantIds(doc, id)]) {
    nodes[nodeId] = structuredClone(doc.nodes[nodeId]!);
  }
  nodes[id]!.parentId = null;
  return { kind: FRAGMENT_KIND, version: 1, rootId: id, nodes };
}

/** A fragment containing a single Text node — used when you paste plain text. */
export function textFragment(text: string): Fragment {
  const node = createNode("Text", null);
  node.props.text = text;
  return { kind: FRAGMENT_KIND, version: 1, rootId: node.id, nodes: { [node.id]: node } };
}

/**
 * Clipboard text is UNTRUSTED: it could be anything, from anywhere. Validate the
 * shape with Zod, then check the structure makes sense before it touches the document.
 */
export function parseFragment(text: string): Fragment | null {
  if (!text.includes(FRAGMENT_KIND)) return null; // cheap pre-check before JSON.parse
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = FragmentSchema.safeParse(raw);
  if (!parsed.success) return null;
  const fragment = parsed.data;

  // Every node must be reachable from the root exactly once (no orphans, no cycles,
  // no shared children), and every type must be a component we know.
  const seen = new Set<string>();
  const stack = [fragment.rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const node = fragment.nodes[id];
    if (!node || seen.has(id) || !getDefinition(node.type) || node.type === "Page") return null;
    seen.add(id);
    stack.push(...node.children);
  }
  return seen.size === Object.keys(fragment.nodes).length ? fragment : null;
}

/**
 * Give every node in the fragment a NEW id (pasting twice must not create duplicate ids),
 * and rebuild parent links from the children arrays so they're guaranteed consistent.
 */
export function instantiateFragment(fragment: Fragment): { rootId: string; nodes: Record<string, Node> } {
  const idMap = new Map(Object.keys(fragment.nodes).map((oldId) => [oldId, createId("n")]));
  const nodes: Record<string, Node> = {};

  for (const [oldId, node] of Object.entries(fragment.nodes)) {
    const id = idMap.get(oldId)!;
    nodes[id] = {
      ...structuredClone(node),
      id,
      parentId: null,
      children: node.children.map((childId) => idMap.get(childId)!),
      animationIds: [], // animations aren't part of fragments (yet)
    };
  }
  for (const node of Object.values(nodes)) {
    for (const childId of node.children) nodes[childId]!.parentId = node.id;
  }
  return { rootId: idMap.get(fragment.rootId)!, nodes };
}
