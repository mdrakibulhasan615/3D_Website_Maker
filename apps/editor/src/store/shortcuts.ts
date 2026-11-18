import { useEditor } from "./editorStore";

/**
 * Keyboard shortcuts. Attached to BOTH the editor window and the canvas iframe,
 * because keyboard focus can be in either one.
 */
export function handleEditorKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  // Don't hijack typing in form fields (Backspace must delete a character, not the element!).
  if (
    target &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)
  ) {
    return;
  }

  const state = useEditor.getState();
  const mod = event.ctrlKey || event.metaKey; // Ctrl on Windows, Cmd on Mac
  const key = event.key.toLowerCase();

  if (mod && key === "z") {
    event.preventDefault();
    if (event.shiftKey) state.redo();
    else state.undo();
  } else if (mod && key === "y") {
    event.preventDefault();
    state.redo();
  } else if ((key === "delete" || key === "backspace") && state.selectedId) {
    event.preventDefault();
    state.deleteNode(state.selectedId);
  } else if (key === "escape") {
    state.select(null);
  }
}
