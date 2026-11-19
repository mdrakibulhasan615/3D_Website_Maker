/**
 * Font choices. System fonts cost nothing to load; Google fonts are fetched ONLY
 * when a document actually uses them (see googleFontsHref).
 */
import { BREAKPOINT_ORDER, type SiteDocument } from "@msb/schema";

export type FontOption = { label: string; value: string; /** Google Fonts "family" query, if any. */ google?: string };

export const FONT_OPTIONS: FontOption[] = [
  { label: "System Sans", value: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: "System Serif", value: 'ui-serif, Georgia, Cambria, "Times New Roman", serif' },
  { label: "Monospace", value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { label: "Inter", value: '"Inter", ui-sans-serif, system-ui, sans-serif', google: "Inter:wght@400;500;600;700;800" },
  { label: "DM Sans", value: '"DM Sans", ui-sans-serif, system-ui, sans-serif', google: "DM+Sans:wght@400;500;700" },
  {
    label: "Space Grotesk",
    value: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    google: "Space+Grotesk:wght@400;500;700",
  },
  {
    label: "Playfair Display",
    value: '"Playfair Display", ui-serif, Georgia, serif',
    google: "Playfair+Display:wght@400;700;800",
  },
  { label: "Fraunces", value: '"Fraunces", ui-serif, Georgia, serif', google: "Fraunces:wght@400;700;900" },
];

/** One Google Fonts stylesheet URL for every Google font the document uses, or null. */
export function googleFontsHref(doc: SiteDocument): string | null {
  const used = new Set<string>();
  const check = (value: unknown) => {
    const option = FONT_OPTIONS.find((o) => o.google && o.value === value);
    if (option?.google) used.add(option.google);
  };
  Object.values(doc.tokens.fonts).forEach(check);
  for (const node of Object.values(doc.nodes)) {
    for (const bp of BREAKPOINT_ORDER) check(node.styles[bp]?.fontFamily);
  }
  if (used.size === 0) return null;
  return `https://fonts.googleapis.com/css2?${[...used].map((f) => `family=${f}`).join("&")}&display=swap`;
}
