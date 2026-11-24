import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { MSG, newPasswordProblem, translateUpdatePasswordError, translateVerifyError } from "@/lib/authErrors";
import { jsonError, rejectCrossOrigin } from "@/lib/panelAuth";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Guarda la contraseña nueva con el enlace del correo (REQ-001, 7.4 y 8.2).
 *
 * 1. Primero se comprueba la contraseña (422), para no gastar el enlace con una
 *    que no vale.
 * 2. `verifyOtp({ type: 'recovery', token_hash })` gasta el enlace y deja la
 *    sesión en las cookies. Si ha caducado o ya se ha usado, 400 (y solo eso da 400).
 * 3. `updateUser({ password })`: una sesión de recuperación no necesita la
 *    contraseña actual.
 * 4. `signOut({ scope: 'others' })` cierra los demás dispositivos.
 *
 * Si el paso 3 falla (la misma contraseña de antes, por ejemplo), el enlace ya
 * está gastado pero la sesión de recuperación sigue en las cookies: al volver a
 * intentarlo con otra contraseña, se usa esa sesión en vez del enlace, siempre
 * que tenga menos de 15 minutos. Supabase solo deja cambiar la contraseña sin la
 * actual a una sesión de recuperación («Require current password» activado,
 * sección 7.5): a cualquier otra le pide la actual, y aquí eso es un 400.
 */
const RECENT_SESSION_S = 15 * 60;

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  let body: { tokenHash?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, MSG.badRequest);
  }

  const problem = newPasswordProblem(body?.password);
  if (problem) return jsonError(422, problem);
  const password = body.password as string;

  const tokenHash = typeof body?.tokenHash === "string" ? body.tokenHash.trim() : "";
  if (!tokenHash || tokenHash.length > 500) return jsonError(400, MSG.linkExpired);

  try {
    const supabase = await createSessionClient();
    let usedRecentSession = false;

    const verified = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (verified.error) {
      const failure = translateVerifyError(verified.error);
      if (failure.status === 400 && (await hasRecentSession(supabase))) {
        usedRecentSession = true;
      } else {
        if (failure.log) console.error("[password/reset] verifyOtp:", failure.log);
        return jsonError(failure.status, failure.error);
      }
    }

    const updated = await supabase.auth.updateUser({ password });
    if (updated.error) {
      const failure = translateUpdatePasswordError(updated.error);
      if (failure.log) console.error("[password/reset] updateUser:", failure.log);
      // Sin enlace válido y con una sesión que no es de recuperación: es el enlace lo que falla.
      if (usedRecentSession && updated.error.code?.startsWith("current_password")) {
        return jsonError(400, MSG.linkExpired);
      }
      return jsonError(failure.status, failure.error);
    }

    const others = await supabase.auth.signOut({ scope: "others" });
    if (others.error) console.error("[password/reset] signOut others:", others.error.code, others.error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[password/reset] Error inesperado:", e);
    return jsonError(500, MSG.generic);
  }
}

async function hasRecentSession(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getClaims();
  const iat = data?.claims?.iat;
  if (error || typeof data?.claims?.sub !== "string" || typeof iat !== "number") return false;
  return Date.now() / 1000 - iat < RECENT_SESSION_S;
}
