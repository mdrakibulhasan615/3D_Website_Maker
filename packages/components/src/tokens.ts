/**
 * Design tokens: named values (colors, fonts) that styles REFERENCE instead of copying.
 *
 *   token  colors.brand = "#4f46e5"
 *   CSS    :root { --color-brand: #4f46e5 }
 *   style  backgroundColor: "var(--color-brand)"
 *
 * Change the token once → every element using it updates.
 */
export type TokenKind = "colors" | "fonts";

const PREFIX: Record<TokenKind, string> = { colors: "color", fonts: "font" };

/** "--color-brand" */
export function tokenVar(kind: TokenKind, name: string): string {
  return `--${PREFIX[kind]}-${name}`;
}

/** "var(--color-brand)" or "var(--color-brand, #4f46e5)" with a fallback. */
export function tokenRef(kind: TokenKind, name: string, fallback?: string): string {
  return `var(${tokenVar(kind, name)}${fallback ? `, ${fallback}` : ""})`;
}

const REF_RE = /^var\(--(color|font)-([a-z0-9-]+)(?:\s*,\s*(.+))?\)$/i;

/** Is this style value exactly a token reference? Returns which token, or null. */
export function parseTokenRef(value: unknown): { kind: TokenKind; name: string; fallback?: string } | null {
  if (typeof value !== "string") return null;
  const m = REF_RE.exec(value.trim());
  if (!m) return null;
  return { kind: m[1]!.toLowerCase() === "color" ? "colors" : "fonts", name: m[2]!, fallback: m[3] };
}

/** Token names become part of a CSS variable, so keep them simple: lowercase-kebab. */
export function isValidTokenName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replace every reference to one token inside a CSS value — including inside
 * gradients like "linear-gradient(90deg, var(--color-brand), #fff)".
 */
export function replaceTokenRefs(
  value: string,
  kind: TokenKind,
  name: string,
  replacement: string | ((fallback?: string) => string),
): string {
  // var(--color-name) or var(--color-name, <fallback that may contain one level of parens>)
  const re = new RegExp(
    `var\\(${escapeRe(tokenVar(kind, name))}(?:\\s*,\\s*([^()]*(?:\\([^()]*\\))?[^()]*))?\\)`,
    "g",
  );
  return value.replace(re, (_match, fallback: string | undefined) =>
    typeof replacement === "function" ? replacement(fallback) : replacement,
  );
}
