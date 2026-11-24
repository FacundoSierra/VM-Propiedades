import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { del, list } from "@vercel/blob";

/**
 * Borra de Vercel Blob las fotos que ya no están en ningún inmueble (REQ-001,
 * sección 5.4). La llaman las rutas de inmuebles dentro de `after()`, cuando la
 * respuesta ya ha salido: si algo falla, solo se escribe en el log.
 *
 * Qué se borra: lo que hay en el almacén bajo `inmuebles/` y no está en las
 * fotos de ningún inmueble (sea del estado que sea), si además:
 * - se acaba de quitar de un inmueble (`removed`: fotos quitadas al guardar, o
 *   las de un inmueble borrado), o
 * - tiene más de 48 horas. Las 48 horas protegen una foto recién subida que el
 *   formulario todavía no ha guardado.
 *
 * Qué no se borra nunca:
 * - una foto que esté en algún inmueble;
 * - nada, si no se ha podido leer la cartera entera o el almacén entero. Para
 *   saber que la cartera está entera, se comprueba antes que quien llama es del
 *   equipo (si no, el RLS devolvería una lista vacía sin error) y que se han
 *   leído tantas filas como dice la base.
 */

export const PHOTO_PREFIX = "inmuebles/";
export const ORPHAN_MIN_AGE_MS = 48 * 60 * 60 * 1000;
const PAGE = 1000;
const DELETE_BATCH = 100;

export type StoredPhoto = { url: string; pathname: string; uploadedAt: Date };

export type BlobApi = {
  list(options: { prefix: string; cursor?: string; limit?: number }): Promise<{
    blobs: StoredPhoto[];
    cursor?: string;
    hasMore: boolean;
  }>;
  del(urls: string[]): Promise<void>;
};

export type CleanupReport =
  | { done: true; deleted: string[] }
  | { done: false; reason: string; deleted: string[] };

/** Quita la parte que no identifica el archivo (`?download=1`, mayúsculas del dominio). */
function photoKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase()}${u.pathname}`;
  } catch {
    return url;
  }
}

/**
 * La decisión, sin red: qué fotos del almacén se borran. Pura, para poder
 * probarla sola.
 */
export function planPhotoCleanup({
  stored,
  inUse,
  removed = [],
  now = new Date(),
}: {
  stored: StoredPhoto[];
  inUse: Iterable<string>;
  removed?: Iterable<string>;
  now?: Date;
}): string[] {
  const used = new Set<string>();
  for (const url of inUse) used.add(photoKey(url));
  const justRemoved = new Set<string>();
  for (const url of removed) justRemoved.add(photoKey(url));

  return stored
    .filter((photo) => photo.pathname.startsWith(PHOTO_PREFIX))
    .filter((photo) => !used.has(photoKey(photo.url)))
    .filter((photo) => {
      if (justRemoved.has(photoKey(photo.url))) return true;
      const uploadedAt = photo.uploadedAt instanceof Date ? photo.uploadedAt : new Date(photo.uploadedAt);
      const age = now.getTime() - uploadedAt.getTime();
      return Number.isFinite(age) && age > ORPHAN_MIN_AGE_MS;
    })
    .map((photo) => photo.url);
}

/** Todas las fotos que hay en algún inmueble, o un motivo para no seguir. */
async function readPhotosInUse(supabase: SupabaseClient): Promise<{ urls: string[] } | { reason: string }> {
  const team = await supabase.rpc("is_team");
  if (team.error) return { reason: `no se ha podido comprobar el equipo (${team.error.code ?? "?"})` };
  if (team.data !== true) return { reason: "quien llama no es del equipo: no vería toda la cartera" };

  const urls: string[] = [];
  let expected: number | null = null;
  let read = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error, count } = await supabase
      .from("properties")
      .select("slug,images", { count: "exact" })
      .order("slug", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data) return { reason: `no se ha podido leer la cartera (${error?.code ?? "sin datos"})` };
    if (count === null || count === undefined) return { reason: "la base no ha dicho cuántos inmuebles hay" };
    if (expected === null) expected = count;
    for (const row of data as { images?: unknown }[]) {
      if (Array.isArray(row.images)) urls.push(...row.images.filter((u): u is string => typeof u === "string"));
    }
    read += data.length;
    if (data.length < PAGE || read >= expected) break;
  }
  if (read !== expected) return { reason: `se han leído ${read} inmuebles de ${expected}` };
  return { urls };
}

async function listStoredPhotos(blob: BlobApi): Promise<StoredPhoto[]> {
  const stored: StoredPhoto[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 1000; page += 1) {
    const result = await blob.list({ prefix: PHOTO_PREFIX, cursor, limit: PAGE });
    stored.push(...result.blobs);
    if (!result.hasMore) return stored;
    if (!result.cursor) throw new Error("Blob dice que hay más páginas, pero no da el cursor");
    cursor = result.cursor;
  }
  throw new Error("Demasiadas páginas en el almacén");
}

const vercelBlob: BlobApi = {
  list: (options) => list(options),
  del: (urls) => del(urls),
};

/** ¿Hay con qué hablar con Blob? En local, sin `BLOB_READ_WRITE_TOKEN`, no. */
function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function cleanUpPhotos({
  supabase,
  removed = [],
  blob,
  now = new Date(),
}: {
  /** El cliente con la sesión de quien ha guardado (del equipo: ve toda la cartera). */
  supabase: SupabaseClient;
  removed?: string[];
  /** Solo para las pruebas: por defecto, el Vercel Blob de verdad. */
  blob?: BlobApi;
  now?: Date;
}): Promise<CleanupReport> {
  const deleted: string[] = [];
  try {
    if (!blob && !blobConfigured()) {
      return { done: false, reason: "Blob no está configurado (falta BLOB_READ_WRITE_TOKEN)", deleted };
    }
    const api = blob ?? vercelBlob;

    // Primero el almacén y después la base: así, lo que se guarde mientras tanto
    // ya sale en la base, y lo recién subido lo protegen las 48 horas.
    const stored = await listStoredPhotos(api);
    const inUse = await readPhotosInUse(supabase);
    if ("reason" in inUse) {
      console.warn(`[fotos] No se borra nada: ${inUse.reason}.`);
      return { done: false, reason: inUse.reason, deleted };
    }

    const toDelete = planPhotoCleanup({ stored, inUse: inUse.urls, removed, now });
    for (let i = 0; i < toDelete.length; i += DELETE_BATCH) {
      const batch = toDelete.slice(i, i + DELETE_BATCH);
      await api.del(batch);
      deleted.push(...batch);
    }
    if (deleted.length > 0) console.info(`[fotos] Borradas ${deleted.length} fotos que no estaban en ningún inmueble.`);
    return { done: true, deleted };
  } catch (e) {
    console.error("[fotos] El barrido de fotos ha fallado (no pasa nada: se repite en el siguiente guardado):", e);
    return { done: false, reason: e instanceof Error ? e.message : "error inesperado", deleted };
  }
}
