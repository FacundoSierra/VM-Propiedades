import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { cache } from "react";

import { NO_PERMISSION } from "@/lib/propertyErrors";
import { panelBaseFor, type PanelBase } from "@/lib/panelHost";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Quién llama al panel (REQ-001, sección 7.3).
 *
 * - La sesión se comprueba con `getClaims()`, que verifica la firma del token.
 *   Nunca con `getSession()`, que en el servidor no comprueba nada.
 * - Tener sesión no basta: hay que estar en la tabla `team`. El RLS solo deja
 *   ver a cada cuenta su propia fila, así que la consulta responde por quien llama.
 * - Lo que de verdad protege los datos es el RLS de la base: esto sirve para
 *   responder bien (401, 403) y para no enseñar el panel a quien no es del equipo.
 */

export type PanelUser = { id: string; email: string | null; name: string };

export type PanelAccess =
  | { state: "ok"; user: PanelUser }
  | { state: "no-session" }
  | { state: "no-team" }
  | { state: "error" };

type Claims = { sub?: unknown; email?: unknown } & Record<string, unknown>;

async function readClaims(supabase: SupabaseClient): Promise<Claims | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    // Un token caducado o mal firmado es «sin sesión», no un fallo.
    return null;
  }
  const claims = (data?.claims ?? null) as Claims | null;
  return claims && typeof claims.sub === "string" && claims.sub ? claims : null;
}

async function readTeamRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("team").select("name").eq("user_id", userId).maybeSingle();
}

/** Para las pantallas del panel. Una sola vez por petición (`cache` de React). */
export const getPanelAccess = cache(async (): Promise<PanelAccess> => {
  try {
    const supabase = await createSessionClient();
    const claims = await readClaims(supabase);
    if (!claims) return { state: "no-session" };
    const userId = claims.sub as string;
    const { data, error } = await readTeamRow(supabase, userId);
    if (error) {
      console.error("[panel] No se ha podido leer la fila de team:", error);
      return { state: "error" };
    }
    if (!data) return { state: "no-team" };
    return {
      state: "ok",
      user: {
        id: userId,
        email: typeof claims.email === "string" && claims.email ? claims.email : null,
        name: typeof data.name === "string" ? data.name : "",
      },
    };
  } catch (e) {
    console.error("[panel] No se ha podido comprobar la sesión:", e);
    return { state: "error" };
  }
});

/** La cuenta del equipo que está dentro, o `null`. */
export async function getPanelUser(): Promise<PanelUser | null> {
  const access = await getPanelAccess();
  return access.state === "ok" ? access.user : null;
}

/** El prefijo de los enlaces del panel en el dominio de esta petición (ADR-002). */
export async function getPanelBase(): Promise<PanelBase> {
  const h = await headers();
  return panelBaseFor(h.get("x-forwarded-host") ?? h.get("host"));
}

// ─── Rutas de /api/admin ────────────────────────────────────────────────────

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Si la petición trae `Origin` y no es del propio dominio, 403. Lo que de verdad
 * protege de otra web es que las cookies de la sesión van con `SameSite=Lax`;
 * esto es una segunda barrera para las rutas que cambian algo.
 */
export function rejectCrossOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = null;
  }
  if (host && originHost && originHost.toLowerCase() === host.toLowerCase()) return null;
  console.warn("[panel] Petición rechazada por su origen:", origin);
  return jsonError(403, "No se ha podido hacer desde aquí. Abre el panel y vuelve a intentarlo.");
}

export type Authorized = { ok: true; supabase: SupabaseClient; userId: string };
export type Rejected = { ok: false; response: NextResponse };

/** Con sesión (para cambiar la contraseña): 403 de otro origen, 401 sin sesión. */
export async function requireSession(request: Request): Promise<Authorized | Rejected> {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return { ok: false, response: crossOrigin };
  try {
    const supabase = await createSessionClient();
    const claims = await readClaims(supabase);
    if (!claims) return { ok: false, response: jsonError(401, "No autenticado") };
    return { ok: true, supabase, userId: claims.sub as string };
  } catch (e) {
    console.error("[panel] No se ha podido comprobar la sesión:", e);
    return { ok: false, response: jsonError(500, "Algo ha fallado. Vuelve a intentarlo en un momento.") };
  }
}

/** Para las rutas que escriben: además de la sesión, ser del equipo (403 si no). */
export async function requireTeam(request: Request): Promise<Authorized | Rejected> {
  const session = await requireSession(request);
  if (!session.ok) return session;
  const { data, error } = await readTeamRow(session.supabase, session.userId);
  if (error) {
    console.error("[panel] No se ha podido leer la fila de team:", error);
    return { ok: false, response: jsonError(500, "Algo ha fallado. Vuelve a intentarlo en un momento.") };
  }
  if (!data) return { ok: false, response: jsonError(403, NO_PERMISSION) };
  return session;
}
