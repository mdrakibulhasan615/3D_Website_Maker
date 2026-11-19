import type { DesignTokens } from "@msb/schema";

/** A minimal CSS reset applied to every rendered site (editor canvas and published). */
export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0}
body{font-family:var(--font-body,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);color:var(--color-ink,#0f172a);-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--font-heading,inherit)}
h1,h2,h3,h4,p{margin:0}
img{max-width:100%}
a{color:inherit}
`;

/** Extra CSS only inside the EDITOR canvas: makes empty containers visible and droppable. */
export const EDITOR_CSS = `
body{user-select:none;-webkit-user-select:none}
img{-webkit-user-drag:none}
[data-node-id]{cursor:default}
a[data-node-id],[data-node-id] a{cursor:default}
[data-container]:empty{min-height:64px;outline:1px dashed #a5b4fc;outline-offset:-4px;background:rgba(99,102,241,.04)}
[data-node-type="Text"]:empty::before{content:"Empty text";opacity:.35}
.ProseMirror{outline:none;white-space:pre-wrap;word-wrap:break-word;cursor:text}
.ProseMirror p{margin:0}
[data-editing]{outline:2px solid #6366f1;outline-offset:4px;border-radius:2px}
[data-container]:empty::after{content:"Empty — select it and insert an element";display:block;padding:22px 12px;font:12px system-ui;color:#818cf8;text-align:center}
`;

/** Design tokens → CSS custom properties, e.g. --color-brand: #4f46e5 */
export function tokensToCss(tokens: DesignTokens): string {
  const vars = [
    ...Object.entries(tokens.colors).map(([name, value]) => `--color-${name}:${value}`),
    ...Object.entries(tokens.fonts).map(([name, value]) => `--font-${name}:${value}`),
  ];
  return vars.length ? `:root{${vars.join(";")}}` : "";
}
