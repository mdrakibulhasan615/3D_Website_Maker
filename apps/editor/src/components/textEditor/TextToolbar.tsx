"use client";

/**
 * Floating formatting bar above the text being edited. It lives in the MAIN page (on top of
 * the iframe, like the selection overlay). Buttons use onMouseDown + preventDefault so
 * clicking them doesn't steal focus/selection from the text.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useEditorState } from "@tiptap/react";
import { isSafeHref } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { getNodeRect, type Box } from "@/interactions/frameBridge";
import { useTextEditSession } from "./textEditSession";

/** "example.com" → "https://example.com"; leaves mailto:, /path, #anchor alone. */
function normalizeHref(raw: string): string {
  const value = raw.trim();
  if (/^[a-z][a-z0-9+.-]*:|^\/|^#/i.test(value)) return value;
  return `https://${value}`;
}

export function TextToolbar() {
  const editingId = useEditor((s) => s.editingTextId);
  const editor = useTextEditSession((s) => s.editor);
  const [box, setBox] = useState<Box | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");

  // Follow the text as it moves/grows while typing (same per-frame measuring as the overlay).
  useEffect(() => {
    if (!editingId) return;
    let frame = 0;
    const tick = () => {
      const r = getNodeRect(editingId);
      setBox((prev) => (prev && r && prev.top === r.top && prev.left === r.left && prev.width === r.width ? prev : r));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [editingId]);

  // Re-render only when the active formatting changes, not on every keystroke.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            code: e.isActive("code"),
            link: e.isActive("link"),
          }
        : null,
  });

  if (!editingId || !editor || !box || !active) return null;

  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault(); // keep the text selection
    fn();
  };

  const applyLink = () => {
    const value = href.trim();
    // Validate BEFORE touching the editor: Tiptap runs chained commands as they're called,
    // so even building `chain().focus()` would move focus back into the text — and the next
    // keystrokes would replace the selected text instead of going into this input.
    if (value && !isSafeHref(normalizeHref(value))) return; // invalid (e.g. javascript:) — shown in red
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!value) chain.unsetLink().run();
    else chain.setLink({ href: normalizeHref(value) }).run();
    setLinkOpen(false);
  };
  const hrefInvalid = !!href.trim() && !isSafeHref(normalizeHref(href));

  const top = box.top > 48 ? box.top - 44 : box.top + box.height + 8;

  return (
    <div
      data-text-toolbar=""
      className="pointer-events-auto absolute z-30 flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
      style={{ top, left: Math.max(4, box.left) }}
    >
      <ToolButton label="Bold (Ctrl+B)" active={active.bold} onMouseDown={run(() => editor.chain().focus().toggleBold().run())}>
        <b>B</b>
      </ToolButton>
      <ToolButton label="Italic (Ctrl+I)" active={active.italic} onMouseDown={run(() => editor.chain().focus().toggleItalic().run())}>
        <i>I</i>
      </ToolButton>
      <ToolButton label="Underline (Ctrl+U)" active={active.underline} onMouseDown={run(() => editor.chain().focus().toggleUnderline().run())}>
        <u>U</u>
      </ToolButton>
      <ToolButton label="Strikethrough" active={active.strike} onMouseDown={run(() => editor.chain().focus().toggleStrike().run())}>
        <s>S</s>
      </ToolButton>
      <ToolButton label="Code" active={active.code} onMouseDown={run(() => editor.chain().focus().toggleCode().run())}>
        <span className="font-mono">{"</>"}</span>
      </ToolButton>
      <ToolButton
        label="Link"
        active={active.link || linkOpen}
        onMouseDown={run(() => {
          setHref(String(editor.getAttributes("link").href ?? ""));
          setLinkOpen((o) => !o);
        })}
      >
        Link
      </ToolButton>

      {linkOpen && (
        <input
          autoFocus
          value={href}
          placeholder="https://… or /page"
          onChange={(e) => setHref(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Stop the key's default action: otherwise, once focus moves back into the text,
              // the browser can deliver it there as a "new line" — which finishes editing.
              e.preventDefault();
              applyLink();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setLinkOpen(false);
              editor.commands.focus();
            }
            e.stopPropagation();
          }}
          className={`ml-1 w-44 rounded border px-1.5 py-0.5 text-xs outline-none ${
            hrefInvalid ? "border-red-400 text-red-600" : "border-neutral-200 focus:border-indigo-400"
          }`}
        />
      )}

      <span className="mx-1 h-4 w-px bg-neutral-200" />
      <ToolButton label="Done (Enter)" onMouseDown={run(() => useTextEditSession.getState().finish?.())}>
        Done
      </ToolButton>
    </div>
  );
}

function ToolButton({ label, active, onMouseDown, children }: {
  label: string;
  active?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={onMouseDown}
      className={`min-w-7 rounded px-1.5 py-1 text-xs ${active ? "bg-indigo-600 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
    >
      {children}
    </button>
  );
}
