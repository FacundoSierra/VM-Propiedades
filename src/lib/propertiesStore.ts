import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";

import {
  MAX_FEATURED,
  isPropertyStatus,
  propertyTypeLabels,
  publicStatuses,
  type Operation,
  type Property,
  type PropertyType,
} from "@/data/properties";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Lectura de los inmuebles (REQ-001, sección 6.2).
 *
 * - **La web** lee con la clave publicable y sin cookies (`createPublicClient`),
 *   así que ve lo mismo que un visitante: lo publicado. Va en la caché de Next
 *   con la etiqueta `properties`, que cada guardado del panel invalida.
 * - **El panel** lee con la sesión de quien entra (`createSessionClient`), sin
 *   caché: el RLS le deja ver los cinco estados si es del equipo.
 * - **Si la base falla, se lanza el error**, nunca una lista vacía: la caché no
 *   guarda lo que lanza y Next sigue sirviendo la última versión buena. En el
 *   build, el error lo hace fallar (y sigue en pie la versión anterior).
 * - **Las columnas, siempre con nombre**: `select('*')` daría `42501`, porque
 *   nadie puede leer `created_at` (permisos por columna de la migración).
 */

/** La etiqueta de la caché de la web. La invalidan las rutas de /api/admin/properties. */
export const PROPERTIES_TAG = "properties";

/** Las columnas de `Property`, con los nombres del modelo. */
export const PROPERTY_COLUMNS =
  "slug,title,type,operation,status,price,zone,address,sqm,rooms,baths,description,features,images,featured," +
  "updatedAt:updated_at,publishedAt:published_at";

/** Un error de lectura con una frase que se puede enseñar en el panel (sin detalles internos). */
export class PropertiesReadError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
    this.name = "PropertiesReadError";
  }
}

type DbError = { code?: string | null; message?: string | null; details?: string | null; hint?: string | null };

function readError(where: string, error: DbError | null): PropertiesReadError {
  const code = error?.code || null;
  console.error(`[inmuebles] No se ha podido leer (${where}):`, error ?? "sin datos");
  if (code === "PGRST205" || code === "42P01") {
    return new PropertiesReadError(
      "Falta preparar la base de datos (la migración de los inmuebles).",
      code,
    );
  }
  return new PropertiesReadError(
    code ? `La base de datos no ha respondido bien (código ${code}).` : "La base de datos no ha respondido.",
    code,
  );
}

type PropertyRow = Record<string, unknown>;

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Una fila de `properties` (con `PROPERTY_COLUMNS`) → `Property`. */
export function rowToProperty(row: PropertyRow): Property {
  const type = String(row.type ?? "");
  const property: Property = {
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    type: (type in propertyTypeLabels ? type : "piso") as PropertyType,
    operation: (row.operation === "alquiler" ? "alquiler" : "venta") as Operation,
    status: isPropertyStatus(row.status) ? row.status : "borrador",
    // numeric(12,2): PostgREST lo manda como número; por si llega como texto.
    price: toNumber(row.price),
    zone: String(row.zone ?? ""),
    address: String(row.address ?? ""),
    sqm: toNumber(row.sqm),
    rooms: toNumber(row.rooms),
    baths: toNumber(row.baths, 1),
    description: String(row.description ?? ""),
    features: toStringList(row.features),
    images: toStringList(row.images),
    featured: row.featured === true,
  };
  if (typeof row.updatedAt === "string") property.updatedAt = row.updatedAt;
  if (typeof row.publishedAt === "string") property.publishedAt = row.publishedAt;
  return property;
}

// ─── Web pública: lo publicado, en caché ────────────────────────────────────

/** `projectUrl` no se usa dentro: está para que cada base tenga su propia entrada en la caché. */
async function readPublic(projectUrl: string): Promise<Property[]> {
  void projectUrl;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_COLUMNS)
    // El RLS de `anon` ya filtra lo publicado; se repite por si un día se
    // llamara con otro cliente.
    .in("status", publicStatuses)
    .order("published_at", { ascending: false })
    .order("slug", { ascending: true });
  if (error || !data) throw readError("web", error);
  return (data as unknown as PropertyRow[]).map(rowToProperty);
}

const readPublicCached = unstable_cache(readPublic, ["properties-public"], {
  tags: [PROPERTIES_TAG],
  // Red de seguridad: si una invalidación no llegara, se rehace en una hora.
  revalidate: 3600,
});

/**
 * Los inmuebles que salen en la web (disponibles, reservados y vendidos), los
 * más recientes primero. Una sola consulta en caché: las demás funciones de la
 * web salen de esta lista. La caché guarda como mucho 2 MB por entrada (unos
 * 100 inmuebles): si un día se pasa, se parte.
 *
 * Ojo con la caché de Next: dura entre builds y despliegues, y si al
 * revalidar la base falla, sigue dando lo último bueno. Por eso:
 * - las variables se comprueban aquí, fuera de la caché: si faltan, falla
 *   siempre, también el build;
 * - la dirección de la base va en la clave: otra base (o una que no responde)
 *   no aprovecha lo guardado de esta, y el build falla en vez de publicar nada.
 */
export async function getPublicProperties(): Promise<Property[]> {
  const { url } = getSupabaseEnv();
  return readPublicCached(url);
}

/** Un inmueble de la web. Un borrador, un oculto o un slug que no existe dan `undefined`. */
export async function getProperty(slug: string): Promise<Property | undefined> {
  const list = await getPublicProperties();
  return list.find((p) => p.slug === slug);
}

/** Los de la portada: destacados y disponibles, como mucho `MAX_FEATURED`. */
export async function getFeatured(): Promise<Property[]> {
  const list = await getPublicProperties();
  return list.filter((p) => p.featured && p.status === "disponible").slice(0, MAX_FEATURED);
}

/** Las zonas de lo publicado, sin repetir y en orden alfabético. */
export async function getZones(): Promise<string[]> {
  const list = await getPublicProperties();
  return [...new Set(list.map((p) => p.zone.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

// ─── Panel: todo, con la sesión y sin caché ─────────────────────────────────

/** La cartera completa (los cinco estados), lo último guardado primero. */
export async function readPropertiesList(client?: SupabaseClient): Promise<{ list: Property[] }> {
  const supabase = client ?? (await createSessionClient());
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_COLUMNS)
    .order("updated_at", { ascending: false })
    .order("slug", { ascending: true });
  if (error || !data) throw readError("panel", error);
  return { list: (data as unknown as PropertyRow[]).map(rowToProperty) };
}

// ─── Escribir (rutas de /api/admin/properties) ──────────────────────────────

/**
 * Después de guardar o borrar: la web deja de servir el catálogo de antes.
 *
 * `revalidateTag(…, { expire: 0 })`: la siguiente visita a cualquier página que
 * lea los inmuebles (también el 404 guardado de una ficha que todavía no estaba
 * publicada, que lleva la misma etiqueta) espera a los datos nuevos, en vez de
 * ver los de antes. Se llama antes de responder, y solo si la base ha guardado.
 *
 * No se añade `revalidatePath` de la ficha: marca la página como «vieja pero
 * servible», y la primera visita después de publicar volvía a dar el 404
 * guardado (comprobado en B3, sección 6.4 de la spec).
 */
export function invalidatePublicCatalog() {
  revalidateTag(PROPERTIES_TAG, { expire: 0 });
}

/** Las columnas que el panel puede escribir: las de `grant insert`/`grant update` de la migración. */
type WritableRow = Partial<{
  title: string;
  type: PropertyType;
  operation: Operation;
  status: Property["status"];
  price: number;
  zone: string;
  address: string;
  sqm: number;
  rooms: number;
  baths: number;
  description: string;
  features: string[];
  images: string[];
  featured: boolean;
}>;

/**
 * Lo que sale de `pickEditable` → la fila que se manda a la base, solo con lo
 * que ha llegado (un cambio parcial no toca lo demás). El `slug`, `updatedAt` y
 * `publishedAt` no se mandan nunca: los pone la base.
 */
export function toPropertyRow(input: Partial<Property>): WritableRow {
  const row: WritableRow = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.type !== undefined) row.type = input.type;
  if (input.operation !== undefined) row.operation = input.operation;
  if (input.status !== undefined) row.status = input.status;
  if (input.price !== undefined) row.price = input.price;
  if (input.zone !== undefined) row.zone = input.zone;
  if (input.address !== undefined) row.address = input.address;
  if (input.sqm !== undefined) row.sqm = input.sqm;
  if (input.rooms !== undefined) row.rooms = input.rooms;
  if (input.baths !== undefined) row.baths = input.baths;
  if (input.description !== undefined) row.description = input.description;
  if (input.features !== undefined) row.features = input.features;
  if (input.images !== undefined) row.images = input.images;
  if (input.featured !== undefined) row.featured = input.featured;
  return row;
}

/** Un inmueble del panel, en cualquier estado. `null` si no existe (o no se puede ver). */
export async function readProperty(slug: string, client?: SupabaseClient): Promise<Property | null> {
  const supabase = client ?? (await createSessionClient());
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw readError("panel, un inmueble", error);
  return data ? rowToProperty(data as unknown as PropertyRow) : null;
}
