/** Inserting section templates from the library. */
import { getPage } from "@msb/schema";
import { TEMPLATE_BY_ID, buildFragment } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { getNodeElement } from "@/interactions/frameBridge";

/** Insert a template at an exact spot (drag-and-drop). Returns the new section's id. */
export function insertTemplateAt(templateId: string, parentId: string, index: number): string | null {
  const template = TEMPLATE_BY_ID[templateId];
  if (!template) return null;
  // A fresh fragment every time: build() creates new nodes with new ids.
  const id = useEditor.getState().insertFragment(buildFragment(template.build()), parentId, index);
  if (id) revealOnCanvas(id);
  return id;
}

/**
 * Click-to-insert: sections belong at the TOP level of the page, so place it right
 * after the top-level section that contains the current selection (or at the end).
 */
export function insertTemplate(templateId: string) {
  const { doc, pageId, selectedId } = useEditor.getState();
  const rootId = getPage(doc, pageId).rootNodeId;
  const topLevel = doc.nodes[rootId]!.children;

  let current = selectedId;
  while (current && doc.nodes[current]?.parentId && doc.nodes[current]!.parentId !== rootId) {
    current = doc.nodes[current]!.parentId;
  }
  const index = current && topLevel.includes(current) ? topLevel.indexOf(current) + 1 : topLevel.length;
  insertTemplateAt(templateId, rootId, index);
}

/** Scroll the new section into view once React has rendered it into the iframe. */
function revealOnCanvas(id: string) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => getNodeElement(id)?.scrollIntoView({ behavior: "smooth", block: "start" })),
  );
}
