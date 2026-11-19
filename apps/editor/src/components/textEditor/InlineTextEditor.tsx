"use client";

/**
 * A live Tiptap editor that takes the place of ONE Text node on the canvas while you edit it.
 *
 * Key detail: we create the editor ON the element inside the iframe (`element: el`).
 * ProseMirror attaches some listeners (e.g. "selectionchange") to the document its view
 * is created in, so creating it in the main page and moving it into the iframe would leave
 * those listeners on the wrong document.
 */
import { useEffect, useRef } from "react";
import { Editor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import { hasFormatting, isSafeHref, richToPlainText, type RichSpan, type RootProps } from "@msb/components";
import type { Node } from "@msb/schema";
import { useEditor as useEditorStore } from "@/store/editorStore";
import { spansToTiptap, tiptapToSpans } from "./convert";
import { useTextEditSession } from "./textEditSession";

type TextProps = { text: string; rich?: RichSpan[]; tag: "h1" | "h2" | "h3" | "p" | "span" };

/** A Text is ONE block: the document is exactly one paragraph (line breaks via Shift+Enter). */
const SingleParagraph = Document.extend({ content: "paragraph" });

/** Enter / Escape finish editing (instead of splitting into a new paragraph). */
const FinishKeys = Extension.create<{ onFinish: () => void }>({
  name: "finishEditing",
  addOptions: () => ({ onFinish: () => {} }),
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        this.options.onFinish();
        return true;
      },
      Escape: () => {
        this.options.onFinish();
        return true;
      },
    };
  },
});

export function InlineTextEditor({ node, props, rootProps }: { node: Node; props: TextProps; rootProps: RootProps }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const original = { text: props.text, rich: props.rich };
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      const spans = tiptapToSpans(editor.getJSON());
      const text = richToPlainText(spans);
      const rich = hasFormatting(spans) ? spans : undefined;
      const changed = text !== original.text || JSON.stringify(rich ?? null) !== JSON.stringify(original.rich ?? null);
      // One commit for the whole edit → one undo step.
      useEditorStore.getState().endTextEdit(changed ? { text, rich } : undefined);
    };
    // Keyboard handlers run INSIDE ProseMirror's event handling; leaving edit mode unmounts
    // (destroys) the editor, so do that just after the current event finishes.
    const finishSoon = () => setTimeout(finish, 0);

    const editor = new Editor({
      element: el,
      content: spansToTiptap(props.rich, props.text),
      extensions: [
        SingleParagraph,
        StarterKit.configure({
          document: false,
          heading: false,
          blockquote: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          listKeymap: false,
          codeBlock: false,
          horizontalRule: false,
          dropcursor: false,
          gapcursor: false,
          trailingNode: false,
          link: {
            openOnClick: false,
            autolink: true,
            defaultProtocol: "https",
            // The SAME rule the renderer uses — editing can't create a link publishing would block.
            isAllowedUri: (url) => isSafeHref(url),
          },
        }),
        FinishKeys.configure({ onFinish: finishSoon }),
      ],
      autofocus: "end",
    });

    useTextEditSession.setState({ editor, finish });

    // Clicking anywhere else (canvas, panels, top bar) saves and leaves editing.
    // Capture phase, so this runs BEFORE whatever that click is about to do.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.("[data-editing], [data-text-toolbar]")) return;
      finish();
    };
    const frameDoc = el.ownerDocument;
    window.addEventListener("pointerdown", onPointerDown, true);
    frameDoc.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      frameDoc.removeEventListener("pointerdown", onPointerDown, true);
      useTextEditSession.setState({ editor: null, finish: null });
      editor.destroy();
    };
    // Mount once per editing session; the content is read only at the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  const Tag = props.tag;
  // React renders the tag EMPTY; Tiptap owns everything inside it.
  return <Tag {...rootProps} ref={ref as never} data-editing="" />;
}
