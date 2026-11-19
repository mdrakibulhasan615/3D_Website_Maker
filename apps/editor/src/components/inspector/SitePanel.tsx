"use client";

/** Site-wide settings: page title and design tokens (colors + fonts). */
import { FONT_OPTIONS, isValidTokenName, type TokenKind } from "@msb/components";
import { useEditor } from "@/store/editorStore";
import { Group, INPUT, Row } from "./ui";
import { toHex } from "./style/values";

/** Unique default name like "color-3". */
function nextName(existing: Record<string, string>, prefix: string): string {
  let i = 1;
  while (`${prefix}-${i}` in existing) i++;
  return `${prefix}-${i}`;
}

/**
 * Editable token name. Uncontrolled input (defaultValue) + commit on blur, so typing
 * "brand-2" doesn't rename (and rewrite every reference) on each keystroke.
 */
function TokenName({ kind, name }: { kind: TokenKind; name: string }) {
  return (
    <input
      key={name}
      defaultValue={name}
      title="Lowercase letters, numbers and dashes"
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      onBlur={(e) => {
        const next = e.target.value.trim();
        if (next === name) return;
        if (!isValidTokenName(next) || !useEditor.getState().renameToken(kind, name, next)) {
          e.target.value = name; // invalid or taken → put the old name back
        }
      }}
      className={`${INPUT} font-mono`}
    />
  );
}

function DeleteButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button type="button" onClick={onClick} title={title} className="shrink-0 px-1 text-neutral-400 hover:text-red-600">
      ×
    </button>
  );
}

export function SitePanel() {
  const title = useEditor((s) => s.doc.meta.title);
  const colors = useEditor((s) => s.doc.tokens.colors);
  const fonts = useEditor((s) => s.doc.tokens.fonts);
  const { setTitle, setToken, deleteToken } = useEditor.getState();

  return (
    <div className="pb-8">
      <Group title="Page">
        <Row label="Site title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
        </Row>
      </Group>

      <Group title="Color tokens">
        <p className="text-[11px] leading-snug text-neutral-400">
          Elements that use a token (◆) update everywhere when you change it here.
        </p>
        {Object.entries(colors).map(([name, value]) => (
          <div key={name} className="flex items-center gap-1">
            <input
              type="color"
              value={toHex(value)}
              onChange={(e) => setToken("colors", name, e.target.value)}
              className="h-7 w-8 shrink-0 cursor-pointer rounded border border-neutral-200 bg-white p-0.5"
            />
            <TokenName kind="colors" name={name} />
            {/* Wrapper sets the width: INPUT includes w-full, which would override a w-20 on the input itself. */}
            <div className="w-20 shrink-0">
              <input value={value} onChange={(e) => setToken("colors", name, e.target.value)} className={`${INPUT} font-mono`} />
            </div>
            <DeleteButton
              title="Delete token (elements keep the color as a plain value)"
              onClick={() => deleteToken("colors", name)}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setToken("colors", nextName(colors, "color"), "#6366f1")}
          className="self-start text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
        >
          + Add color
        </button>
      </Group>

      <Group title="Font tokens">
        <p className="text-[11px] leading-snug text-neutral-400">
          <b>heading</b> styles h1–h4 and <b>body</b> styles everything else, unless an element picks its own font.
          Google fonts load only when used.
        </p>
        {Object.entries(fonts).map(([name, value]) => (
          <div key={name} className="flex items-center gap-1">
            <div className="w-24 shrink-0">
              <TokenName kind="fonts" name={name} />
            </div>
            <select value={value} onChange={(e) => setToken("fonts", name, e.target.value)} className={INPUT}>
              {FONT_OPTIONS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
              {!FONT_OPTIONS.some((f) => f.value === value) && <option value={value}>Custom: {value}</option>}
            </select>
            <DeleteButton title="Delete token" onClick={() => deleteToken("fonts", name)} />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setToken("fonts", nextName(fonts, "font"), FONT_OPTIONS[0]!.value)}
          className="self-start text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
        >
          + Add font
        </button>
      </Group>
    </div>
  );
}
