/**
 * The command registry — the single source of truth for editor actions.
 *
 * Each command says what it's called, which keys trigger it, when it's allowed,
 * and what it does. The keyboard handler, the right-click menu, and the shortcuts
 * dialog all read this list, so they can never disagree. (This is the "Command pattern".)
 */
import { isLockedInTree, resolveRect, type Node } from "@msb/schema";
import { getDefinition } from "@msb/components";
import type { EditorState } from "@/store/editorStore";
import { isFreeChild } from "@/interactions/freeform";
import { copySelection, cutSelection, hasClipboard, pasteFromMemory } from "./clipboard";
import { setShortcutsOpen } from "./uiStore";

export type KeyCombo = { key: string; mod?: boolean; shift?: boolean; alt?: boolean };

export type Command = {
  id: string;
  label: string | ((s: EditorState) => string);
  group: "Edit" | "Arrange" | "Visibility" | "Selection" | "History" | "Help";
  /** Keys handled by the keyboard handler. */
  keys?: KeyCombo[];
  /** Shortcut text for display only (e.g. copy/paste, which use native clipboard events). */
  shortcutHint?: KeyCombo;
  enabled: (s: EditorState) => boolean;
  run: (s: EditorState, event?: KeyboardEvent) => void;
};

const selected = (s: EditorState): Node | undefined => (s.selectedId ? s.doc.nodes[s.selectedId] : undefined);
/** Selected, not the page root, and not locked. */
const editable = (s: EditorState) => {
  const node = selected(s);
  return !!node?.parentId && !isLockedInTree(s.doc, node.id);
};
const siblingIndex = (s: EditorState) => {
  const node = selected(s);
  if (!node?.parentId) return { index: -1, count: 0 };
  const siblings = s.doc.nodes[node.parentId]!.children;
  return { index: siblings.indexOf(node.id), count: siblings.length };
};

function nudge(s: EditorState, dx: number, dy: number, event?: KeyboardEvent) {
  const node = selected(s);
  if (!node?.layout) return;
  const step = event?.shiftKey ? 10 : 1;
  const rect = resolveRect(node.layout, s.breakpoint);
  s.setFreeRect(node.id, { ...rect, x: rect.x + dx * step, y: rect.y + dy * step }, `nudge:${node.id}:${s.breakpoint}`);
}
const canNudge = (s: EditorState) => editable(s) && isFreeChild(s.selectedId);
const arrow = (key: string): KeyCombo[] => [{ key }, { key, shift: true }];

export const COMMANDS: Command[] = [
  // History
  { id: "undo", label: "Undo", group: "History", keys: [{ key: "z", mod: true }], enabled: (s) => s.past.length > 0, run: (s) => s.undo() },
  {
    id: "redo",
    label: "Redo",
    group: "History",
    keys: [{ key: "z", mod: true, shift: true }, { key: "y", mod: true }],
    enabled: (s) => s.future.length > 0,
    run: (s) => s.redo(),
  },

  // Edit
  { id: "copy", label: "Copy", group: "Edit", shortcutHint: { key: "c", mod: true }, enabled: (s) => !!selected(s)?.parentId, run: () => copySelection() },
  { id: "cut", label: "Cut", group: "Edit", shortcutHint: { key: "x", mod: true }, enabled: editable, run: () => cutSelection() },
  { id: "paste", label: "Paste", group: "Edit", shortcutHint: { key: "v", mod: true }, enabled: () => hasClipboard(), run: () => pasteFromMemory() },
  {
    id: "duplicate",
    label: "Duplicate",
    group: "Edit",
    keys: [{ key: "d", mod: true }],
    enabled: (s) => !!selected(s)?.parentId && !isLockedInTree(s.doc, selected(s)!.parentId!),
    run: (s) => s.duplicateNode(s.selectedId!),
  },
  {
    id: "delete",
    label: "Delete",
    group: "Edit",
    keys: [{ key: "Delete" }, { key: "Backspace" }],
    enabled: editable,
    run: (s) => s.deleteNode(s.selectedId!),
  },

  // Arrange
  { id: "wrap", label: "Wrap in container", group: "Arrange", keys: [{ key: "g", mod: true }], enabled: editable, run: (s) => s.wrapInContainer(s.selectedId!) },
  {
    id: "unwrap",
    label: "Unwrap",
    group: "Arrange",
    keys: [{ key: "g", mod: true, shift: true }],
    enabled: (s) => editable(s) && !!getDefinition(selected(s)!.type)?.acceptsChildren,
    run: (s) => s.unwrapNode(s.selectedId!),
  },
  {
    id: "move-up",
    label: "Move up",
    group: "Arrange",
    keys: [{ key: "ArrowUp", alt: true }],
    enabled: (s) => editable(s) && siblingIndex(s).index > 0,
    run: (s) => s.moveSibling(s.selectedId!, -1),
  },
  {
    id: "move-down",
    label: "Move down",
    group: "Arrange",
    keys: [{ key: "ArrowDown", alt: true }],
    enabled: (s) => editable(s) && siblingIndex(s).index < siblingIndex(s).count - 1,
    run: (s) => s.moveSibling(s.selectedId!, 1),
  },
  { id: "nudge-left", label: "Nudge left", group: "Arrange", keys: arrow("ArrowLeft"), enabled: canNudge, run: (s, e) => nudge(s, -1, 0, e) },
  { id: "nudge-right", label: "Nudge right", group: "Arrange", keys: arrow("ArrowRight"), enabled: canNudge, run: (s, e) => nudge(s, 1, 0, e) },
  { id: "nudge-up", label: "Nudge up", group: "Arrange", keys: arrow("ArrowUp"), enabled: canNudge, run: (s, e) => nudge(s, 0, -1, e) },
  { id: "nudge-down", label: "Nudge down", group: "Arrange", keys: arrow("ArrowDown"), enabled: canNudge, run: (s, e) => nudge(s, 0, 1, e) },

  // Visibility
  {
    id: "lock",
    label: (s) => (selected(s)?.locked ? "Unlock" : "Lock"),
    group: "Visibility",
    keys: [{ key: "l", mod: true, shift: true }],
    enabled: (s) => !!selected(s)?.parentId,
    run: (s) => s.toggleLocked(s.selectedId!),
  },
  {
    id: "hide",
    label: (s) => (selected(s)?.hidden ? "Show" : "Hide"),
    group: "Visibility",
    keys: [{ key: "h", mod: true, shift: true }],
    enabled: (s) => !!selected(s)?.parentId,
    run: (s) => s.toggleHidden(s.selectedId!),
  },

  // Selection
  {
    id: "select-parent",
    label: "Select parent",
    group: "Selection",
    keys: [{ key: "Escape" }],
    enabled: (s) => !!s.selectedId,
    run: (s) => {
      const parentId = selected(s)?.parentId;
      // Stop at the page root: one more Escape just deselects.
      s.select(parentId && s.doc.nodes[parentId]?.parentId ? parentId : null);
    },
  },

  // Help
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    group: "Help",
    // "?" is Shift+/ on US layouts; some layouts/tools report the key as "/" with Shift held.
    keys: [{ key: "?", shift: true }, { key: "/", shift: true }],
    enabled: () => true,
    run: () => setShortcutsOpen(true),
  },
];

export const COMMAND_BY_ID = Object.fromEntries(COMMANDS.map((c) => [c.id, c])) as Record<string, Command>;

export const labelOf = (command: Command, s: EditorState) =>
  typeof command.label === "function" ? command.label(s) : command.label;

// ─── Key matching & display ──────────────────────────────────────────────────

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function matches(combo: KeyCombo, event: KeyboardEvent): boolean {
  return (
    event.key.toLowerCase() === combo.key.toLowerCase() &&
    !!combo.mod === (event.ctrlKey || event.metaKey) &&
    !!combo.shift === event.shiftKey &&
    !!combo.alt === event.altKey
  );
}

const KEY_LABELS: Record<string, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "Esc",
  Backspace: "⌫",
  Delete: "Del",
};

export function formatCombo(combo: KeyCombo): string {
  const parts: string[] = [];
  if (combo.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (combo.shift && combo.key !== "?") parts.push("Shift");
  if (combo.alt) parts.push(isMac ? "⌥" : "Alt");
  parts.push(KEY_LABELS[combo.key] ?? combo.key.toUpperCase());
  return parts.join(isMac ? "" : "+");
}

/** The first shortcut of a command, for menus and the help dialog. */
export function shortcutOf(command: Command): string | null {
  const combo = command.keys?.[0] ?? command.shortcutHint;
  return combo ? formatCombo(combo) : null;
}
