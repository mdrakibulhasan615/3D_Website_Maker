"use client";

import dynamic from "next/dynamic";

/**
 * Load the editor in the browser only (ssr: false).
 * It relies on browser-only things (localStorage, iframes, pointer events), and an
 * editor has no SEO needs, so server-rendering it would add complexity for nothing.
 */
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="grid h-screen place-items-center text-sm text-neutral-500">Loading editor…</div>
  ),
});

export function EditorLoader() {
  return <Editor />;
}
