/**
 * The live editing session, shared between the inline editor (which owns the Tiptap
 * instance) and the floating toolbar / outside-click handling (which need to reach it).
 */
import { create } from "zustand";
import type { Editor } from "@tiptap/react";

type Session = {
  editor: Editor | null;
  /** Save the edit and leave editing mode. Set by the inline editor while it's mounted. */
  finish: (() => void) | null;
};

export const useTextEditSession = create<Session>()(() => ({ editor: null, finish: null }));

/** Finish the current edit, if there is one (e.g. the user clicked elsewhere). */
export function finishTextEdit() {
  useTextEditSession.getState().finish?.();
}
