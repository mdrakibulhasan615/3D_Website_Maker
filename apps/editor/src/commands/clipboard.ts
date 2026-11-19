/**
 * Copy / cut / paste.
 *
 * Keyboard shortcuts go through the browser's native `copy`/`cut`/`paste` EVENTS —
 * they give us direct access to the system clipboard without a permission prompt,
 * so copying in one tab and pasting in another works.
 * The right-click menu can't use those events, so we also keep an in-memory copy.
 */
import { FRAGMENT_KIND, getPage, isLockedInTree, type Fragment } from "@msb/schema";
import { getDefinition } from "@msb/components";
import { useEditor, type EditorState } from "@/store/editorStore";
import { extractFragment, parseFragment, textFragment } from "@/store/fragments";

let memory: Fragment | null = null;

export const hasClipboard = () => memory !== null;

/** Typing in a form field must keep normal text copy/paste. */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el?.tagName) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

/** Copy the selection into memory. Returns the fragment (or null if nothing copyable). */
function rememberSelection(): Fragment | null {
  const s = useEditor.getState();
  const node = s.selectedId ? s.doc.nodes[s.selectedId] : undefined;
  if (!node?.parentId) return null; // nothing selected, or the page root
  memory = extractFragment(s.doc, node.id);
  return memory;
}

/**
 * Where does a paste go?
 *  - a selected container (that isn't the thing we copied) → inside it
 *  - otherwise → right after the selection
 *  - nothing selected → end of the page
 * (The "isn't the thing we copied" rule means copy → paste makes a sibling, not a child.)
 */
function pasteTarget(s: EditorState, fragment: Fragment) {
  const sel = s.selectedId ? s.doc.nodes[s.selectedId] : undefined;
  if (sel) {
    const canHold = getDefinition(sel.type)?.acceptsChildren && !isLockedInTree(s.doc, sel.id);
    if (canHold && sel.id !== fragment.rootId) return { parentId: sel.id, index: sel.children.length };
    if (sel.parentId) {
      const parent = s.doc.nodes[sel.parentId]!;
      return { parentId: parent.id, index: parent.children.indexOf(sel.id) + 1 };
    }
  }
  const rootId = getPage(s.doc, s.pageId).rootNodeId;
  return { parentId: rootId, index: s.doc.nodes[rootId]!.children.length };
}

function paste(fragment: Fragment) {
  const s = useEditor.getState();
  const target = pasteTarget(s, fragment);
  s.insertFragment(fragment, target.parentId, target.index);
}

// ─── Used by the right-click menu ────────────────────────────────────────────

export function copySelection() {
  const fragment = rememberSelection();
  // Best effort: also put it on the system clipboard (allowed during a click).
  if (fragment) void navigator.clipboard?.writeText(JSON.stringify(fragment)).catch(() => {});
}

export function cutSelection() {
  const id = useEditor.getState().selectedId;
  copySelection();
  if (id && memory) useEditor.getState().deleteNode(id);
}

export function pasteFromMemory() {
  if (memory) paste(memory);
}

// ─── Native clipboard events (keyboard shortcuts) ────────────────────────────

export function handleCopyEvent(event: ClipboardEvent) {
  if (isEditableTarget(event.target)) return;
  const fragment = rememberSelection();
  if (!fragment) return;
  event.preventDefault();
  event.clipboardData?.setData("text/plain", JSON.stringify(fragment));
}

export function handleCutEvent(event: ClipboardEvent) {
  if (isEditableTarget(event.target)) return;
  const s = useEditor.getState();
  const id = s.selectedId;
  if (!id || isLockedInTree(s.doc, id)) return;
  handleCopyEvent(event);
  if (event.defaultPrevented) s.deleteNode(id);
}

export function handlePasteEvent(event: ClipboardEvent) {
  if (isEditableTarget(event.target)) return;
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") ?? "";
  const fragment = parseFragment(text);
  if (fragment) {
    paste(fragment); // our own element (maybe from another tab)
  } else if (text.includes(FRAGMENT_KIND)) {
    // It CLAIMS to be an element but failed validation (corrupt or tampered) → ignore it,
    // rather than pasting the raw JSON as text.
    console.warn("[editor] Ignored clipboard data: invalid element fragment.");
  } else if (text.trim()) {
    paste(textFragment(text.trim().slice(0, 5000))); // plain text → new Text element
  } else {
    pasteFromMemory();
  }
}
