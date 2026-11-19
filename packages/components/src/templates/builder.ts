/**
 * A tiny builder for describing element trees as data:
 *
 *   el("Section", { name: "Hero" }, [
 *     el("Text", { props: { tag: "h1", text: "Hello" } }),
 *   ])
 *
 * buildFragment() turns that description into a Fragment — the same format
 * copy/paste uses — so inserting a template reuses the exact same code path.
 */
import { BREAKPOINT_ORDER, FRAGMENT_KIND, type Fragment, type Node, type ResponsiveStyles } from "@msb/schema";
import { createNode } from "../factory";

export type ElementSpec = {
  type: string;
  name?: string;
  props?: Record<string, unknown>;
  /** Merged ON TOP of the component's default styles, per breakpoint. */
  styles?: ResponsiveStyles;
  children?: ElementSpec[];
};

export function el(
  type: string,
  options: Omit<ElementSpec, "type" | "children"> = {},
  children: ElementSpec[] = [],
): ElementSpec {
  return { type, ...options, children };
}

export function buildFragment(spec: ElementSpec): Fragment {
  const nodes: Record<string, Node> = {};

  const make = (s: ElementSpec, parentId: string | null): string => {
    const node = createNode(s.type, parentId);
    if (s.name) node.name = s.name;
    Object.assign(node.props, s.props);
    for (const bp of BREAKPOINT_ORDER) {
      if (s.styles?.[bp]) node.styles[bp] = { ...node.styles[bp], ...s.styles[bp] };
    }
    nodes[node.id] = node;
    node.children = (s.children ?? []).map((child) => make(child, node.id));
    return node.id;
  };

  const rootId = make(spec, null);
  return { kind: FRAGMENT_KIND, version: 1, rootId, nodes };
}
