import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FileStore } from "./file-store.ts";
import { SupabaseStore } from "./supabase-store.ts";
import type { Store } from "./store.ts";

/**
 * Wybór magazynu: jeśli ustawione SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY → Supabase (produkcja),
 * w przeciwnym razie plik JSON w server/.data/ (praca lokalna).
 * Klucz service role trzymamy WYŁĄCZNIE po stronie serwera.
 */
export function createStore(): Store {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return new SupabaseStore(url, key);
  const file = process.env.TRASHLY_DATA_FILE ?? join(dirname(fileURLToPath(import.meta.url)), "../../.data/trashly.json");
  return new FileStore(file);
}
