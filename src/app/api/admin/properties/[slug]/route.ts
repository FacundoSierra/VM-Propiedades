import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, after } from "next/server";

import { isPropertyStatus, type PropertyStatus } from "@/data/properties";
import { MSG } from "@/lib/authErrors";
import { jsonError, requireTeam } from "@/lib/panelAuth";
import { cleanUpPhotos } from "@/lib/photoCleanup";
import {
  PROPERTY_COLUMNS,
  invalidatePublicCatalog,
  rowToProperty,
  toPropertyRow,
} from "@/lib/propertiesStore";
import { cannotDeleteMessage, translatePropertyError } from "@/lib/propertyErrors";
import { canDelete, pickEditable } from "@/lib/propertyRules";

interface Params {
  params: Promise<{ slug: string }>;
}

const NOT_FOUND = "Inmueble no encontrado";
/** El formato de un slug (el mismo `check` de la base). Otro no puede existir. */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type CurrentRow = { slug: string; status: PropertyStatus | null; images: string[] };

/** Lo que hace falta saber antes de cambiar o borrar: el estado y las fotos. */
async function readCurrent(
  supabase: SupabaseClient,
  slug: string,
): Promise<{ row: CurrentRow | null; error: { code?: string; message?: string } | null }> {
  const { data, error } = await supabase.from("properties").select("slug,status,images").eq("slug", slug).maybeSingle();
  if (error) return { row: null, error };
  if (!data) return { row: null, error: null };
  const raw = data as { slug: string; status: unknown; images: unknown };
  return {
    row: {
      slug: raw.slug,
      status: isPropertyStatus(raw.status) ? raw.status : null,
      images: Array.isArray(raw.images) ? raw.images.filter((u): u is string => typeof u === "string") : [],
    },
    error: null,
  };
}

/**
 * Cambia un inmueble (REQ-001, 8.1). Acepta el inmueble entero o una parte
 * (`{ status: "vendido" }`). El `slug` no cambia nunca: así los enlaces que ya
 * se han compartido siguen funcionando.
 */
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return jsonError(404, NOT_FOUND);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, MSG.badRequest);
  }

  const input = pickEditable(body);
  if (input.title !== undefined && !input.title.trim()) {
    return jsonError(422, "Ponle un título al inmueble.");
  }

  const { supabase } = auth;
  const current = await readCurrent(supabase, slug);
  if (current.error) {
    const failure = translatePropertyError(current.error);
    console.error("[admin/properties] No se ha podido leer antes de cambiar:", failure.log);
    return jsonError(failure.status, failure.error);
  }
  if (!current.row) return jsonError(404, NOT_FOUND);

  const row = toPropertyRow(input);
  // Nada que cambiar: se devuelve como está.
  const query =
    Object.keys(row).length === 0
      ? supabase.from("properties").select(PROPERTY_COLUMNS).eq("slug", slug).maybeSingle()
      : supabase.from("properties").update(row).eq("slug", slug).select(PROPERTY_COLUMNS).maybeSingle();
  const { data, error } = await query;

  if (error) {
    const failure = translatePropertyError(error, { status: current.row.status });
    console.error("[admin/properties] No se ha podido cambiar:", failure.log ?? "");
    return jsonError(failure.status, failure.error);
  }
  // Se ha borrado mientras tanto (desde otra pestaña).
  if (!data) return jsonError(404, NOT_FOUND);

  const property = rowToProperty(data as unknown as Record<string, unknown>);
  invalidatePublicCatalog();
  const removed = input.images ? current.row.images.filter((url) => !property.images.includes(url)) : [];
  after(() => cleanUpPhotos({ supabase, removed }));

  return NextResponse.json({ ok: true, property });
}

/**
 * Borra un inmueble y, después, sus fotos (REQ-001, 8.1 y 5.4). Solo borradores
 * y ocultos: lo que está en la web hay que ocultarlo antes.
 */
export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return jsonError(404, NOT_FOUND);

  const { supabase } = auth;
  const current = await readCurrent(supabase, slug);
  if (current.error) {
    const failure = translatePropertyError(current.error);
    console.error("[admin/properties] No se ha podido leer antes de borrar:", failure.log);
    return jsonError(failure.status, failure.error);
  }
  if (!current.row) return jsonError(404, NOT_FOUND);
  if (current.row.status && !canDelete({ status: current.row.status })) {
    return jsonError(409, cannotDeleteMessage(current.row.status));
  }

  const { data, error } = await supabase.from("properties").delete().eq("slug", slug).select("slug");
  if (error) {
    const failure = translatePropertyError(error, { status: current.row.status });
    console.error("[admin/properties] No se ha podido borrar:", failure.log ?? "");
    return jsonError(failure.status, failure.error);
  }
  if (!data || data.length === 0) return jsonError(404, NOT_FOUND);

  invalidatePublicCatalog();
  const removed = current.row.images;
  after(() => cleanUpPhotos({ supabase, removed }));

  return NextResponse.json({ ok: true });
}
