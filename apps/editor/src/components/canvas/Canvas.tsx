"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { isAncestorOf, isLockedInTree } from "@msb/schema";
import { BASE_CSS, EDITOR_CSS, getDefinition, googleFontsHref, renderDocument } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { handleEditorKeyDown } from "@/commands/keyboard";
import { handleCopyEvent, handleCutEvent, handlePasteEvent } from "@/commands/clipboard";
import { openMenu } from "@/commands/uiStore";
import { frameToParent, registerFrame } from "@/interactions/frameBridge";
import { consumeRecentDrag } from "@/interactions/pointerSession";
import { startDrag } from "@/interactions/dragDrop";
import { isFreeChild, startTransform } from "@/interactions/freeform";
import { SelectionOverlay } from "./SelectionOverlay";
import { InlineTextEditor } from "../textEditor/InlineTextEditor";
import { TextToolbar } from "../textEditor/TextToolbar";

/** An empty HTML page for the iframe. The marker attribute tells us it has finished loading. */
const FRAME_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body data-msb-frame></body></html>';

/**
 * Find the node id for whatever was clicked/hovered.
 * Note: elements inside an iframe come from a different JavaScript "realm", so
 * `target instanceof Element` would be FALSE. We check for `.closest` instead.
 */
function findNodeId(target: EventTarget | null): string | null {
  const el = target as Element | null;
  if (!el || typeof el.closest !== "function") return null;
  const id = el.closest("[data-node-id]")?.getAttribute("data-node-id") ?? null;
  // Locked layers are "click-through": climb to the first ancestor outside any locked subtree.
  const { doc } = useEditor.getState();
  let current = id;
  while (current && isLockedInTree(doc, current)) current = doc.nodes[current]?.parentId ?? null;
  return current;
}

/**
 * Pointer down on the canvas decides which gesture starts:
 *  - inside the SELECTED free element → move it (lets you grab a card by its text)
 *  - on a free element → select + move it
 *  - on a flow element → select + (if the pointer moves) drag to reorder
 */
/** Is this event inside the Text currently being edited? Then the text editor owns it. */
const inEditingText = (target: EventTarget | null) =>
  !!(target as Element | null)?.closest?.("[data-editing]");

function onCanvasPointerDown(e: PointerEvent) {
  if (e.button !== 0 || inEditingText(e.target)) return; // let the caret/selection work normally
  const id = findNodeId(e.target);
  const state = useEditor.getState();
  const node = id ? state.doc.nodes[id] : undefined;
  if (!id || !node?.parentId) return; // nothing, or the page root

  e.preventDefault(); // no native image dragging / text selection
  (document.activeElement as HTMLElement | null)?.blur(); // so Delete/Undo go to the editor, not an inspector input
  const start = frameToParent({ x: e.clientX, y: e.clientY });

  const sel = state.selectedId;
  if (sel && (sel === id || isAncestorOf(state.doc, sel, id)) && isFreeChild(sel)) {
    startTransform(sel, "move", start);
    return;
  }
  state.select(id);
  if (isFreeChild(id)) {
    startTransform(id, "move", start);
  } else {
    const label = node.name ?? getDefinition(node.type)?.label ?? node.type;
    startDrag({ kind: "move", id, label }, start);
  }
}

export function Canvas() {
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);
  const breakpoint = useEditor((s) => s.breakpoint);
  const activeBp = doc.breakpoints.find((b) => b.id === breakpoint);
  const width = activeBp?.previewWidth ?? 1280;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameDoc, setFrameDoc] = useState<Document | null>(null);

  const editingTextId = useEditor((s) => (s.editingTextId && s.doc.nodes[s.editingTextId] ? s.editingTextId : null));

  // Re-render the site only when the document (or the text being edited) changes.
  // For the Text being edited, the override swaps in a live editor in the exact same tag.
  const { tree, css } = useMemo(
    () =>
      renderDocument(doc, pageId, "editor", {
        override: ({ node, props, rootProps }) =>
          node.id === editingTextId ? (
            <InlineTextEditor key={node.id} node={node} props={props as ComponentProps<typeof InlineTextEditor>["props"]} rootProps={rootProps} />
          ) : undefined,
      }),
    [doc, pageId, editingTextId],
  );
  // Only non-null when the document uses a Google font — no external request otherwise.
  const fontsHref = useMemo(() => googleFontsHref(doc), [doc]);

  // 1) Wait for the iframe's empty page to load, then grab its `document`.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const init = () => {
      const d = iframe.contentDocument;
      if (d?.body?.hasAttribute("data-msb-frame")) {
        registerFrame(iframe, d); // let interaction code find the iframe
        setFrameDoc(d);
      }
    };
    init(); // it may already be loaded
    iframe.addEventListener("load", init);
    return () => {
      iframe.removeEventListener("load", init);
      registerFrame(null, null);
    };
  }, []);

  // 2) Listen for pointer + keyboard events INSIDE the iframe.
  useEffect(() => {
    if (!frameDoc) return;
    const { select, hover } = useEditor.getState();
    const onMove = (e: MouseEvent) => hover(findNodeId(e.target));
    const onLeave = () => hover(null);
    const onClick = (e: MouseEvent) => {
      e.preventDefault(); // links/buttons on the canvas must not navigate while editing
      if (inEditingText(e.target)) return; // clicks inside the text being edited move the caret
      if (consumeRecentDrag()) return; // this click is just the tail end of a drag
      select(findNodeId(e.target));
    };
    // Double-click a Text to edit it in place.
    const onDoubleClick = (e: MouseEvent) => {
      if (inEditingText(e.target)) return;
      const id = findNodeId(e.target);
      if (id && useEditor.getState().doc.nodes[id]?.type === "Text") useEditor.getState().startTextEdit(id);
    };
    const onNativeDrag = (e: DragEvent) => e.preventDefault();
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      select(findNodeId(e.target));
      const p = frameToParent({ x: e.clientX, y: e.clientY }); // the menu lives in the main page
      openMenu(p.x, p.y);
    };
    // The same handlers as the main page — keyboard focus may be inside the iframe.
    const listeners: [string, EventListener][] = [
      ["mousemove", onMove as EventListener],
      ["click", onClick as EventListener],
      ["dblclick", onDoubleClick as EventListener],
      ["pointerdown", onCanvasPointerDown as EventListener],
      ["dragstart", onNativeDrag as EventListener],
      ["contextmenu", onContextMenu as EventListener],
      ["keydown", handleEditorKeyDown as EventListener],
      ["copy", handleCopyEvent as EventListener],
      ["cut", handleCutEvent as EventListener],
      ["paste", handlePasteEvent as EventListener],
    ];
    for (const [type, fn] of listeners) frameDoc.addEventListener(type, fn);
    frameDoc.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      for (const [type, fn] of listeners) frameDoc.removeEventListener(type, fn);
      frameDoc.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [frameDoc]);

  return (
    // w-max + min-w-full: grow to fit a wide canvas (so it scrolls) instead of
    // overflowing to the left, where flexbox centering would make it unreachable.
    <div className="flex h-full w-max min-w-full flex-col items-center px-6 pb-6 pt-3">
      <div className="mb-2 text-[11px] text-neutral-400">
        {activeBp?.label} · {width}px
      </div>
      <div className="relative min-h-0 flex-1 shrink-0 bg-white shadow-lg ring-1 ring-black/5" style={{ width }}>
        <iframe ref={iframeRef} srcDoc={FRAME_HTML} title="Canvas" className="block h-full w-full border-0" />
        {/* 3) Portals: render the site's CSS into the iframe <head> and the site into its <body>. */}
        {frameDoc && createPortal(<style>{BASE_CSS + EDITOR_CSS + css}</style>, frameDoc.head)}
        {frameDoc && fontsHref && createPortal(<link rel="stylesheet" href={fontsHref} />, frameDoc.head)}
        {frameDoc && createPortal(tree, frameDoc.body)}
        {frameDoc && <SelectionOverlay frameDoc={frameDoc} />}
        {frameDoc && editingTextId && <TextToolbar />}
      </div>
    </div>
  );
}
