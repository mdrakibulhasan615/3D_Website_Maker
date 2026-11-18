/**
 * The editor's global state (Zustand) with undo/redo (Immer patches).
 *
 * Components read from it with a SELECTOR, e.g. `useEditor(s => s.selectedId)`.
 * A component only re-renders when the value its selector returns changes —
 * that's why dragging one element doesn't re-render the whole editor.
 */
import { create } from "zustand";
import { applyPatches, enablePatches, produceWithPatches, type Draft, type Patch } from "immer";
import {
  BREAKPOINT_ORDER,
  resolveRect,
  getDescendantIds,
  getPage,
  isAncestorOf,
  type BreakpointId,
  type FreeLayout,
  type Rect,
  type SiteDocument,
  type StyleValue,
} from "@msb/schema";
import {
  isFreeLayout,
  isValidTokenName,
  nextFreeRect,
  replaceTokenRefs,
  stacksOnMobile,
  tokenRef,
  type LayoutMode,
  type TokenKind,
} from "@msb/components";
import { createNode, getDefinition } from "@msb/components";
import { loadInitialDocument, saveDocument } from "./persistence";

enablePatches();

const HISTORY_LIMIT = 100;
/** Edits with the same key within this window become ONE undo step (e.g. typing a word). */
const MERGE_WINDOW_MS = 1000;
/**
 * Keys starting with this prefix ALWAYS merge, regardless of time. Each drag/resize
 * gesture gets a unique "gesture:<id>" key, so one whole gesture = one undo step,
 * even if the user pauses mid-drag.
 */
export const GESTURE_PREFIX = "gesture:";
const AUTOSAVE_DELAY_MS = 800;

type HistoryEntry = {
  patches: Patch[]; // how to redo
  inverse: Patch[]; // how to undo
  mergeKey?: string;
  time: number;
};

export type SaveStatus = "saved" | "unsaved" | "error";

export type EditorState = {
  // ── Data that gets saved ──
  doc: SiteDocument;
  // ── UI state (not saved, not in undo history) ──
  pageId: string;
  selectedId: string | null;
  hoveredId: string | null;
  breakpoint: BreakpointId;
  saveStatus: SaveStatus;
  past: HistoryEntry[];
  future: HistoryEntry[];

  // ── Actions ──
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setBreakpoint: (breakpoint: BreakpointId) => void;
  /** Insert relative to the current selection (click-to-insert). */
  insertNode: (type: string) => string | null;
  /** Insert at an exact spot (drag-and-drop). `layout` is set when dropping into a free section. */
  insertNodeAt: (type: string, parentId: string, index: number, layout?: FreeLayout) => string | null;
  deleteNode: (id: string) => void;
  /** layout: undefined = keep as is, null = remove (leaving a free section), object = set. */
  moveNode: (id: string, newParentId: string, index: number, layout?: FreeLayout | null) => void;
  /** Write a freeform rectangle at the CURRENT breakpoint. */
  setFreeRect: (id: string, rect: Rect, mergeKey?: string) => void;
  setLayoutMode: (
    id: string,
    mode: LayoutMode,
    measured?: { childRects: Record<string, Rect>; height: number; width: number },
  ) => void;
  setMobileStack: (id: string, on: boolean) => void;
  /** `measuredWidth` becomes the design width if the section doesn't have one yet. */
  setProportional: (id: string, on: boolean, measuredWidth?: number) => void;
  updateProps: (id: string, patch: Record<string, unknown>) => void;
  setStyle: (id: string, prop: string, value: StyleValue | undefined) => void;
  /** Several style props at once (one undo step), e.g. switching fill mode. */
  setStyles: (id: string, patch: Record<string, StyleValue | undefined>) => void;
  setToken: (kind: TokenKind, name: string, value: string) => void;
  /** Renames the token AND rewrites every reference to it. Returns false if the name is invalid/taken. */
  renameToken: (kind: TokenKind, from: string, to: string) => boolean;
  /** Deletes the token and replaces its references with the literal value (nothing breaks visually). */
  deleteToken: (kind: TokenKind, name: string) => void;
  renameNode: (id: string, name: string) => void;
  toggleHidden: (id: string) => void;
  setTitle: (title: string) => void;
  undo: () => void;
  redo: () => void;
  replaceDocument: (doc: SiteDocument) => void;
};

/**
 * Where does a newly inserted element go?
 *  - Selected a container → inside it, at the end.
 *  - Selected a leaf (e.g. Text) → right after it, in the same parent.
 *  - Nothing selected → end of the page.
 */
function resolveInsertTarget(doc: SiteDocument, pageId: string, selectedId: string | null) {
  const rootId = getPage(doc, pageId).rootNodeId;
  const selected = selectedId ? doc.nodes[selectedId] : undefined;
  if (selected) {
    if (getDefinition(selected.type)?.acceptsChildren) {
      return { parentId: selected.id, index: selected.children.length };
    }
    if (selected.parentId) {
      const parent = doc.nodes[selected.parentId]!;
      return { parentId: parent.id, index: parent.children.indexOf(selected.id) + 1 };
    }
  }
  return { parentId: rootId, index: doc.nodes[rootId]!.children.length };
}

/** Run `fn` over every string style value in the document (used to rewrite token references). */
function rewriteStyleStrings(draft: Draft<SiteDocument>, fn: (value: string) => string) {
  for (const node of Object.values(draft.nodes)) {
    for (const bp of BREAKPOINT_ORDER) {
      const styles = node.styles[bp];
      if (!styles) continue;
      for (const [prop, value] of Object.entries(styles)) {
        if (typeof value !== "string") continue;
        const next = fn(value);
        if (next !== value) styles[prop] = next;
      }
    }
  }
}

export const useEditor = create<EditorState>()((set, get) => {
  const initialDoc = loadInitialDocument();

  /** The ONLY way the document changes. Records undo history automatically. */
  function commit(recipe: (draft: Draft<SiteDocument>) => void, mergeKey?: string) {
    const { doc, past } = get();
    const [next, patches, inverse] = produceWithPatches(doc, recipe);
    if (patches.length === 0) return; // nothing actually changed

    const now = Date.now();
    const last = past[past.length - 1];
    const isGesture = mergeKey?.startsWith(GESTURE_PREFIX) ?? false;
    const canMerge = mergeKey && last?.mergeKey === mergeKey && (isGesture || now - last.time < MERGE_WINDOW_MS);

    const nextPast = canMerge
      ? [
          ...past.slice(0, -1),
          // Redo = old changes then new; undo = new inverses then old (reverse order).
          { patches: [...last.patches, ...patches], inverse: [...inverse, ...last.inverse], mergeKey, time: now },
        ]
      : [...past, { patches, inverse, mergeKey, time: now }].slice(-HISTORY_LIMIT);

    set({ doc: next, past: nextPast, future: [] });
  }

  /** After undo/redo the selected node might no longer exist. */
  const keepSelection = (doc: SiteDocument, id: string | null) => (id && doc.nodes[id] ? id : null);

  return {
    doc: initialDoc,
    pageId: initialDoc.pages[0]!.id,
    selectedId: null,
    hoveredId: null,
    breakpoint: "lg",
    saveStatus: "saved",
    past: [],
    future: [],

    select: (id) => set({ selectedId: id }),
    hover: (id) => {
      if (get().hoveredId !== id) set({ hoveredId: id });
    },
    setBreakpoint: (breakpoint) => set({ breakpoint }),

    insertNode: (type) => {
      const { doc, pageId, selectedId } = get();
      const target = resolveInsertTarget(doc, pageId, selectedId);
      return get().insertNodeAt(type, target.parentId, target.index);
    },

    insertNodeAt: (type, parentId, index, layout) => {
      const parent = get().doc.nodes[parentId];
      if (!getDefinition(type) || !parent || !getDefinition(parent.type)?.acceptsChildren) return null;
      const node = createNode(type, parentId);
      if (layout) node.layout = layout;
      // Anything inside a free section needs a position, even when inserted by click.
      else if (isFreeLayout(parent)) node.layout = { base: nextFreeRect(get().doc.nodes, parent, type) };
      commit((draft) => {
        draft.nodes[node.id] = node;
        draft.nodes[parentId]!.children.splice(index, 0, node.id);
      });
      set({ selectedId: node.id });
      return node.id;
    },

    deleteNode: (id) => {
      const { doc, pageId } = get();
      const node = doc.nodes[id];
      if (!node?.parentId || id === getPage(doc, pageId).rootNodeId) return; // can't delete the page root
      const parentId = node.parentId;
      const toDelete = [id, ...getDescendantIds(doc, id)];
      commit((draft) => {
        const parent = draft.nodes[parentId]!;
        parent.children = parent.children.filter((childId) => childId !== id);
        for (const deadId of toDelete) delete draft.nodes[deadId];
      });
      set({ selectedId: parentId, hoveredId: null });
    },

    moveNode: (id, newParentId, index, layout) => {
      const { doc } = get();
      const node = doc.nodes[id];
      const newParent = doc.nodes[newParentId];
      if (!node?.parentId || !newParent) return;
      if (id === newParentId || isAncestorOf(doc, id, newParentId)) return; // can't drop into itself
      if (!getDefinition(newParent.type)?.acceptsChildren) return;
      const oldParentId = node.parentId;
      commit((draft) => {
        const oldParent = draft.nodes[oldParentId]!;
        const oldIndex = oldParent.children.indexOf(id);
        oldParent.children.splice(oldIndex, 1);
        // Removing the node shifts later siblings left by one.
        const targetIndex = oldParentId === newParentId && oldIndex < index ? index - 1 : index;
        draft.nodes[newParentId]!.children.splice(targetIndex, 0, id);
        const moved = draft.nodes[id]!;
        moved.parentId = newParentId;
        if (layout === null) delete moved.layout;
        else if (layout) moved.layout = layout;
        else if (!moved.layout && isFreeLayout(newParent)) {
          moved.layout = { base: nextFreeRect(doc.nodes, newParent, moved.type) };
        }
      });
      set({ selectedId: id });
    },

    setFreeRect: (id, rect, mergeKey) => {
      const bp = get().breakpoint;
      commit((draft) => {
        const node = draft.nodes[id];
        if (!node) return;
        if (!node.layout) {
          node.layout = { base: rect };
          return;
        }
        // Pin larger breakpoints first: fixing Tablet must not move things on Desktop.
        // (Without this, Desktop would inherit the new Tablet rect through the cascade.)
        for (const larger of BREAKPOINT_ORDER.slice(BREAKPOINT_ORDER.indexOf(bp) + 1)) {
          if (!node.layout[larger]) node.layout[larger] = { ...resolveRect(node.layout, larger) };
        }
        node.layout[bp] = rect;
      }, mergeKey ?? `rect:${id}:${bp}`);
    },

    setLayoutMode: (id, mode, measured) =>
      commit((draft) => {
        const node = draft.nodes[id];
        if (!node) return;
        node.props.layout = mode;
        for (const childId of node.children) {
          const child = draft.nodes[childId];
          if (!child) continue;
          if (mode === "flow") delete child.layout;
          // Keep each child exactly where it was on screen when switching to freeform.
          else if (!child.layout) child.layout = { base: measured?.childRects[childId] ?? { x: 24, y: 24, w: 240, h: 120 } };
        }
        if (mode === "free") {
          // Absolute children don't take up space, so the section needs its own height.
          // If it stacks on mobile, that height only matters from tablet up ("md").
          const bp = stacksOnMobile(node) ? "md" : "base";
          const styles = (node.styles[bp] ??= {});
          if (styles.minHeight === undefined) styles.minHeight = Math.max(200, measured?.height ?? 480);
          // New freeform sections scale with width; the rects were just measured at this width.
          if (measured?.width && node.props.designWidth === undefined) {
            node.props.proportional = true;
            node.props.designWidth = measured.width;
          }
        }
      }),

    setProportional: (id, on, measuredWidth) =>
      commit((draft) => {
        const node = draft.nodes[id];
        if (!node) return;
        node.props.proportional = on;
        if (on && node.props.designWidth === undefined && measuredWidth) node.props.designWidth = measuredWidth;
      }),

    setMobileStack: (id, on) =>
      commit((draft) => {
        const node = draft.nodes[id];
        if (!node) return;
        node.props.mobileStack = on;
        // Without stacking, phones use the absolute layout too → the section needs a height there.
        if (!on && node.styles.base?.minHeight === undefined) {
          const height = node.styles.md?.minHeight ?? node.styles.lg?.minHeight ?? 480;
          (node.styles.base ??= {}).minHeight = height;
        }
      }),

    updateProps: (id, patch) =>
      commit((draft) => {
        const node = draft.nodes[id];
        if (node) Object.assign(node.props, patch);
      }, `props:${id}:${Object.keys(patch).join(",")}`),

    /** Writes to the CURRENT breakpoint only. Empty value = remove the override. */
    setStyle: (id, prop, value) => {
      const bp = get().breakpoint;
      commit((draft) => {
        const node = draft.nodes[id];
        if (!node) return;
        const styles = (node.styles[bp] ??= {});
        if (value === undefined || value === "") delete styles[prop];
        else styles[prop] = value;
        if (Object.keys(styles).length === 0) delete node.styles[bp];
      }, `style:${id}:${bp}:${prop}`);
    },

    setStyles: (id, patch) => {
      const bp = get().breakpoint;
      commit((draft) => {
        const node = draft.nodes[id];
        if (!node) return;
        const styles = (node.styles[bp] ??= {});
        for (const [prop, value] of Object.entries(patch)) {
          if (value === undefined || value === "") delete styles[prop];
          else styles[prop] = value;
        }
        if (Object.keys(styles).length === 0) delete node.styles[bp];
      }, `styles:${id}:${bp}:${Object.keys(patch).sort().join(",")}`);
    },

    setToken: (kind, name, value) =>
      commit((draft) => {
        draft.tokens[kind][name] = value;
      }, `token:${kind}:${name}`),

    renameToken: (kind, from, to) => {
      const tokens = get().doc.tokens[kind];
      if (from === to || !(from in tokens) || to in tokens || !isValidTokenName(to)) return false;
      commit((draft) => {
        // Rebuild the object so the renamed token keeps its position in the list.
        draft.tokens[kind] = Object.fromEntries(
          Object.entries(draft.tokens[kind]).map(([k, v]) => (k === from ? [to, v] : [k, v])),
        );
        rewriteStyleStrings(draft, (v) => replaceTokenRefs(v, kind, from, (fallback) => tokenRef(kind, to, fallback)));
      });
      return true;
    },

    deleteToken: (kind, name) =>
      commit((draft) => {
        const value = draft.tokens[kind][name];
        if (value === undefined) return;
        delete draft.tokens[kind][name];
        rewriteStyleStrings(draft, (v) => replaceTokenRefs(v, kind, name, value));
      }),

    renameNode: (id, name) =>
      commit((draft) => {
        const node = draft.nodes[id];
        if (!node) return;
        if (name.trim()) node.name = name;
        else delete node.name;
      }, `name:${id}`),

    toggleHidden: (id) =>
      commit((draft) => {
        const node = draft.nodes[id];
        if (node) node.hidden = !node.hidden;
      }),

    setTitle: (title) =>
      commit((draft) => {
        draft.meta.title = title;
      }, "meta:title"),

    undo: () => {
      const { past, future, doc, selectedId } = get();
      const entry = past[past.length - 1];
      if (!entry) return;
      const next = applyPatches(doc, entry.inverse);
      set({ doc: next, past: past.slice(0, -1), future: [entry, ...future], selectedId: keepSelection(next, selectedId) });
    },

    redo: () => {
      const { past, future, doc, selectedId } = get();
      const entry = future[0];
      if (!entry) return;
      const next = applyPatches(doc, entry.patches);
      set({ doc: next, past: [...past, entry], future: future.slice(1), selectedId: keepSelection(next, selectedId) });
    },

    replaceDocument: (doc) =>
      set({ doc, pageId: doc.pages[0]!.id, selectedId: null, hoveredId: null, past: [], future: [] }),
  };
});

/**
 * Autosave: watch the store, and a moment after the document stops changing,
 * write it to storage. Returns a cleanup function.
 */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    const ok = saveDocument(useEditor.getState().doc);
    useEditor.setState({ saveStatus: ok ? "saved" : "error" });
  };

  const unsubscribe = useEditor.subscribe((state, prev) => {
    if (state.doc === prev.doc) return; // only react to document changes
    useEditor.setState({ saveStatus: "unsaved" });
    clearTimeout(timer);
    timer = setTimeout(flush, AUTOSAVE_DELAY_MS);
  });

  const onBeforeUnload = () => {
    if (timer) flush();
  };
  window.addEventListener("beforeunload", onBeforeUnload);

  return () => {
    unsubscribe();
    window.removeEventListener("beforeunload", onBeforeUnload);
    if (timer) flush();
  };
}
