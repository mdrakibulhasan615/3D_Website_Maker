/**
 * Phase 1 persistence: the browser's localStorage.
 * In Phase 4 this file is swapped for Supabase calls — the store won't need to change.
 */
import { CURRENT_SCHEMA_VERSION, SiteDocumentSchema, type SiteDocument } from "@msb/schema";
import { createStarterDocument } from "@msb/components";

const STORAGE_KEY = "msb:document";

export function loadInitialDocument(): SiteDocument {
  if (typeof window === "undefined") return createStarterDocument();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Never trust stored data blindly — validate it against the schema.
      const parsed = SiteDocumentSchema.safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.schemaVersion === CURRENT_SCHEMA_VERSION) return parsed.data;
      console.warn("[editor] Saved document is invalid or outdated; loading the starter page.", parsed.error);
    }
  } catch (error) {
    console.warn("[editor] Could not read the saved document.", error);
  }
  return createStarterDocument();
}

export function saveDocument(doc: SiteDocument): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false; // e.g. storage full or disabled
  }
}
