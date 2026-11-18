import { createId, type Node } from "@msb/schema";
import { getDefinition } from "./library";

/** Create a brand-new node of a given component type, filled with that component's defaults. */
export function createNode(type: string, parentId: string | null): Node {
  const def = getDefinition(type);
  if (!def) throw new Error(`Unknown component type "${type}"`);
  return {
    id: createId("n"),
    type,
    parentId,
    children: [],
    // Parsing an empty object fills in every `.default(...)` from the schema.
    props: def.propsSchema.parse({}) as Record<string, unknown>,
    // Copy, so editing this node never mutates the shared default object.
    styles: structuredClone(def.defaultStyles),
    animationIds: [],
  };
}
