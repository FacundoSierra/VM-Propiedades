/**
 * Reglas del panel de inmuebles. Son funciones puras: las usan las rutas de
 * /api/admin para limpiar lo que llega y el formulario para avisar antes de
 * enviar.
 *
 * Lo que de verdad no deja guardar nada que rompa la web es la base: el
 * disparador `properties_before_write` de Supabase comprueba lo mismo que
 * `missingForPublish`, las 4 destacadas, el slug fijo, no volver a borrador y
 * las fotos (ADR-001). Sus errores los traduce `src/lib/propertyErrors.ts`.
 */
import {
  isPropertyStatus,
  propertyTypeLabels,
  type Operation,
  type Property,
  type PropertyType,
} from "@/data/properties";

/**
 * Los dominios de los que se aceptan fotos de inmuebles: solo nuestro almacén
 * de Vercel Blob, como el disparador de la base. Unsplash sigue en
 * `images.remotePatterns` de next.config.ts porque lo usan otras páginas de la
 * web, no los inmuebles.
 */
const IMAGE_HOSTS = [/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/];

export function isAllowedImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && IMAGE_HOSTS.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

export function slugify(text: string) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** «a», «a y b», «a, b y c». */
export function joinEs(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** Lo que le falta a un inmueble para salir en la web, dicho como en el panel. */
export function missingForPublish(p: Partial<Property>): string[] {
  const missing: string[] = [];
  if (!p.title?.trim()) missing.push("el título");
  if (!p.zone?.trim()) missing.push("la zona");
  if (!p.address?.trim()) missing.push("la dirección");
  if (!(Number(p.price) > 0)) missing.push("el precio");
  if (!(Number(p.sqm) > 0)) missing.push("la superficie");
  if (!p.description?.trim()) missing.push("la descripción");
  if (!p.images?.length) missing.push("al menos una foto");
  return missing;
}

/** Acepta números y también texto escrito a la española: «1.850.000» o «165,5». */
function parseNumber(value: unknown): number {
  if (typeof value !== "string") return Number(value);
  const s = value.replace(/\s|€|m²/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, "").replace(",", "."));
  return Number(s.replace(",", "."));
}

function toCount(value: unknown, max: number): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = parseNumber(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(Math.round(n), max);
}

function toText(value: unknown, max: number): string | undefined {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

/**
 * Se queda solo con los campos que el panel puede cambiar, ya limpios.
 * El `slug`, `updatedAt` y `publishedAt` no se aceptan nunca desde fuera.
 */
export function pickEditable(input: unknown): Partial<Property> {
  if (!input || typeof input !== "object") return {};
  const i = input as Record<string, unknown>;
  const out: Partial<Property> = {};

  const title = toText(i.title, 120);
  if (title !== undefined) out.title = title;
  if (typeof i.type === "string" && i.type in propertyTypeLabels) out.type = i.type as PropertyType;
  if (i.operation === "venta" || i.operation === "alquiler") out.operation = i.operation as Operation;
  if (isPropertyStatus(i.status)) out.status = i.status;

  const price = toCount(i.price, 999_999_999);
  if (price !== undefined) out.price = price;
  const sqm = toCount(i.sqm, 100_000);
  if (sqm !== undefined) out.sqm = sqm;
  const rooms = toCount(i.rooms, 50);
  if (rooms !== undefined) out.rooms = rooms;
  const baths = toCount(i.baths, 20);
  if (baths !== undefined) out.baths = baths;

  const zone = toText(i.zone, 80);
  if (zone !== undefined) out.zone = zone;
  const address = toText(i.address, 160);
  if (address !== undefined) out.address = address;
  const description = toText(i.description, 5000);
  if (description !== undefined) out.description = description;

  if (Array.isArray(i.features)) {
    out.features = i.features
      .filter((f): f is string => typeof f === "string")
      .map((f) => f.trim().slice(0, 120).trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  if (Array.isArray(i.images)) {
    // Solo fotos de nuestro almacén: una URL de otro sitio rompería el build de la web.
    out.images = [...new Set(i.images.filter(isAllowedImageUrl))].slice(0, 60);
  }
  if (typeof i.featured === "boolean") out.featured = i.featured;

  return out;
}

/** Solo se borra lo que no está en la web, para no borrar nada por error. */
export function canDelete(p: Pick<Property, "status">) {
  return p.status === "borrador" || p.status === "oculto";
}
