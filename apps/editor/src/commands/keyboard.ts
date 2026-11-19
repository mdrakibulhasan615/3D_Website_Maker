/**
 * Keyboard shortcuts: find the command whose keys match, check it's enabled, run it.
 * Attached to BOTH the editor window and the canvas iframe (focus can be in either).
 */
import { useEditor } from "@/store/editorStore";
import { isEditableTarget } from "./clipboard";
import { COMMANDS, matches } from "./commands";
import { closeMenu, useUiStore } from "./uiStore";

export function handleEditorKeyDown(event: KeyboardEvent) {
  // Typing in a form field: Backspace must delete a character, not the element!
  if (isEditableTarget(event.target)) return;

  // An open menu/dialog takes Escape first.
  const ui = useUiStore.getState();
  if (event.key === "Escape" && (ui.menu || ui.shortcutsOpen)) {
    useUiStore.setState({ menu: null, shortcutsOpen: false });
    return;
  }
  if (ui.menu) closeMenu();

  const state = useEditor.getState();
  for (const command of COMMANDS) {
    const combo = command.keys?.find((k) => matches(k, event));
    if (!combo) continue;
    const enabled = command.enabled(state);
    // Block the browser default for Ctrl/Cmd shortcuts (e.g. Ctrl+D = bookmark) even when
    // disabled; but let plain keys like arrows keep scrolling when they do nothing here.
    if (enabled || combo.mod) event.preventDefault();
    if (enabled) command.run(state, event);
    return;
  }
}
