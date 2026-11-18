/** The list of all components. Add a new component here and it shows up in the editor. */
import type { ComponentDefinition } from "./registry";
import { Page } from "./primitives/Page";
import { Section } from "./primitives/Section";
import { Container } from "./primitives/Container";
import { Text } from "./primitives/Text";
import { Image } from "./primitives/Image";
import { Button } from "./primitives/Button";
import { Navbar } from "./primitives/Navbar";
import { Footer } from "./primitives/Footer";

export const componentList: ComponentDefinition[] = [
  Page,
  Section,
  Container,
  Text,
  Image,
  Button,
  Navbar,
  Footer,
];

/** Lookup by type name: registry["Text"] → the Text definition. */
export const registry: Record<string, ComponentDefinition> = Object.fromEntries(
  componentList.map((def) => [def.type, def]),
);

export function getDefinition(type: string): ComponentDefinition | undefined {
  return registry[type];
}
