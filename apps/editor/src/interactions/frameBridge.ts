/**
 * The bridge between the editor (main page) and the canvas (iframe).
 *
 * The iframe has its OWN coordinate system: (0,0) is the iframe's top-left corner,
 * not the browser window's. Everything that crosses the boundary goes through here.
 */

export type Point = { x: number; y: number };
export type Box = { top: number; left: number; width: number; height: number };

let iframeEl: HTMLIFrameElement | null = null;
let frameDocument: Document | null = null;

/** Called by <Canvas> once the iframe is ready (and with nulls on unmount). */
export function registerFrame(iframe: HTMLIFrameElement | null, doc: Document | null) {
  iframeEl = iframe;
  frameDocument = doc;
}

export const getIframe = () => iframeEl;
export const getFrameDoc = () => frameDocument;

export function getNodeElement(id: string): HTMLElement | null {
  return frameDocument?.querySelector<HTMLElement>(`[data-node-id="${id}"]`) ?? null;
}

/** A node's box in IFRAME coordinates. */
export function getNodeRect(id: string): Box | null {
  const el = getNodeElement(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** iframe coords → main-page coords. */
export function frameToParent(p: Point): Point {
  const r = iframeEl?.getBoundingClientRect();
  return r ? { x: p.x + r.left, y: p.y + r.top } : p;
}

/** main-page coords → iframe coords, or null if the point is outside the canvas. */
export function parentToFrame(p: Point): Point | null {
  if (!iframeEl) return null;
  const r = iframeEl.getBoundingClientRect();
  if (p.x < r.left || p.x > r.right || p.y < r.top || p.y > r.bottom) return null;
  return { x: p.x - r.left, y: p.y - r.top };
}

/** Does this container stack its children horizontally or vertically? (Read from real CSS.) */
export function getFlowDirection(id: string): "row" | "column" {
  const el = getNodeElement(id);
  const view = el?.ownerDocument.defaultView;
  if (!el || !view) return "column";
  const css = view.getComputedStyle(el);
  return css.display.includes("flex") && css.flexDirection.startsWith("row") ? "row" : "column";
}
