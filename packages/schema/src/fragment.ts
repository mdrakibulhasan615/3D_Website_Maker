/**
 * A "fragment": a node plus all its descendants, detached from any document.
 * It's what goes on the clipboard when you copy an element.
 */
import { z } from "zod";
import { NodeSchema } from "./document";

/** Marker so we can recognise our own data among whatever else is on the clipboard. */
export const FRAGMENT_KIND = "msb-fragment";

export const FragmentSchema = z.object({
  kind: z.literal(FRAGMENT_KIND),
  version: z.literal(1),
  rootId: z.string(),
  nodes: z.record(z.string(), NodeSchema),
});
export type Fragment = z.infer<typeof FragmentSchema>;
