import { NextResponse, after } from "next/server";

import { MSG } from "@/lib/authErrors";
import { jsonError, requireTeam } from "@/lib/panelAuth";
import { cleanUpPhotos } from "@/lib/photoCleanup";
import {
  PROPERTY_COLUMNS,
  invalidatePublicCatalog,
  rowToProperty,
  toPropertyRow,
} from "@/lib/propertiesStore";
import { translatePropertyError } from "@/lib/propertyErrors";
import { pickEditable, slugify } from "@/lib/propertyRules";

/**
 * Da de alta un inmueble (REQ-001, 8.1). Devuelve `{ ok: true, property }`, con
 * su `slug`, que ya no cambia.
 *
 * La ruta manda `slugify(title)` y la base lo hace único (`-2`, `-3`…). Las
 * reglas (qué hace falta para publicar, las destacadas, las fotos) las comprueba
 * la base, y sus errores los traduce `propertyErrors.ts`.
 */
export async function POST(request: Request) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, MSG.badRequest);
  }

  const input = pickEditable(body);
  const title = input.title?.trim() ?? "";
  if (!title) return jsonError(422, "Ponle un título al inmueble.");

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...toPropertyRow(input), slug: slugify(title) || "inmueble" })
    .select(PROPERTY_COLUMNS)
    .single();

  if (error || !data) {
    const failure = translatePropertyError(error);
    console.error("[admin/properties] No se ha podido crear:", failure.log ?? "sin datos");
    return jsonError(failure.status, failure.error);
  }

  const property = rowToProperty(data as unknown as Record<string, unknown>);
  invalidatePublicCatalog();
  after(() => cleanUpPhotos({ supabase }));

  return NextResponse.json({ ok: true, property });
}
