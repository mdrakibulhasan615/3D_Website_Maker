/**
 * The Component Registry contract.
 *
 * Every block (Text, Section, later Scene3D...) is described by ONE object.
 * The editor, the published-site renderer and the code exporter all read
 * these definitions — so adding a component here makes it appear everywhere.
 */
import type { ReactNode } from "react";
import type { z } from "zod";
import type { ResponsiveStyles } from "@msb/schema";

/** Only show a control when another prop has a given value (e.g. freeform-only options). */
type VisibleWhen = { visibleWhen?: { prop: string; equals: unknown } };

/** Describes one control in the Property Inspector. The inspector UI is generated from these. */
export type InspectorControl = VisibleWhen &
  (
    | { prop: string; label: string; control: "text" | "textarea" | "url" | "toggle" }
    | { prop: string; label: string; control: "select"; options: { value: string; label: string }[] }
  );

/**
 * Props every component must spread onto its ROOT element.
 * `className` carries the compiled styles; the data-* attributes let the editor
 * find which DOM element belongs to which node (only present in editor mode).
 */
export type RootProps = {
  className: string;
  "data-node-id"?: string;
  "data-node-type"?: string;
  "data-container"?: "";
};

export type RenderArgs<P> = {
  props: P;
  rootProps: RootProps;
  children?: ReactNode;
};

export type ComponentCategory = "Structure" | "Basic" | "Sections";

// `P = any` is deliberate: the registry holds many components with different
// prop types. Each individual definition is still fully typed (see defineComponent).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ComponentDefinition<P = any> {
  type: string;
  label: string;
  category: ComponentCategory;
  description: string;
  /** Validates props AND supplies defaults (`schema.parse({})` returns the defaults). */
  propsSchema: z.ZodType<P>;
  /** Copied into a node's styles when it's created, so users can then edit them. */
  defaultStyles: ResponsiveStyles;
  /** Can other nodes be placed inside this one? */
  acceptsChildren: boolean;
  /** Shown in the Insert panel? (The Page root is not.) */
  insertable: boolean;
  /** Heavy runtime libraries this block needs, e.g. ["gsap"] — drives code-splitting later. */
  runtimeDeps: string[];
  inspector: InspectorControl[];
  Render(args: RenderArgs<P>): ReactNode;
}

/** Identity function — exists purely so TypeScript infers `P` from the props schema. */
export function defineComponent<P>(definition: ComponentDefinition<P>): ComponentDefinition<P> {
  return definition;
}
