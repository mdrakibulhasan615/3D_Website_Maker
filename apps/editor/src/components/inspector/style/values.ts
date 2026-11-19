/** Pure helpers for reading and writing CSS values. No React, no store. */
import type { StyleValue } from "@msb/schema";

const LENGTH_RE = /^(-?\d*\.?\d+)(px|rem|em|%|vh|vw|deg)?$/;

/** 24 → {24,""}, "2rem" → {2,"rem"}, "auto" → null. (A bare number means px for lengths.) */
export function parseLength(value: StyleValue | undefined): { num: number; unit: string } | null {
  if (value === undefined) return null;
  if (typeof value === "number") return { num: value, unit: "" };
  const m = LENGTH_RE.exec(value.trim());
  return m ? { num: Number(m[1]), unit: m[2] ?? "" } : null;
}

/** Back to a style value: px/unitless stay numbers (the compiler adds "px" where needed). */
export function formatLength(num: number, unit: string): StyleValue {
  const n = Math.round(num * 100) / 100;
  return unit === "" || unit === "px" ? n : `${n}${unit}`;
}

/** Text typed into a field → style value. "24" → 24, "2rem" → "2rem", "" → undefined (reset). */
export function parseStyleInput(raw: string): StyleValue | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  return /^-?\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : trimmed;
}

/** Split on commas that are NOT inside parentheses: "a, rgb(1,2,3), b" → ["a", "rgb(1,2,3)", "b"]. */
export function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export type Gradient = { angle: number; from: string; to: string };

export function parseGradient(value: unknown): Gradient | null {
  if (typeof value !== "string") return null;
  const m = /^linear-gradient\((.*)\)$/.exec(value.trim());
  if (!m) return null;
  const [angle, from, to] = splitTopLevel(m[1]!);
  const deg = angle ? /^(-?\d+(?:\.\d+)?)deg$/.exec(angle) : null;
  if (!deg || !from || !to) return null;
  return { angle: Number(deg[1]), from, to };
}

export const gradientCss = (g: Gradient) => `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;

/** A color for <input type="color">, which only accepts #rrggbb. */
export function toHex(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : "#000000";
}
