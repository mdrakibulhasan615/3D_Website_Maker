/** Tiny store for transient UI: the right-click menu position and the shortcuts dialog. */
import { create } from "zustand";

type UiState = {
  menu: { x: number; y: number } | null;
  shortcutsOpen: boolean;
};

export const useUiStore = create<UiState>()(() => ({ menu: null, shortcutsOpen: false }));

export const openMenu = (x: number, y: number) => useUiStore.setState({ menu: { x, y } });
export const closeMenu = () => useUiStore.setState({ menu: null });
export const setShortcutsOpen = (open: boolean) => useUiStore.setState({ shortcutsOpen: open });
