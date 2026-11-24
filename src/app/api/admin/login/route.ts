import { NextResponse } from "next/server";

import { MSG, normalizeEmail, translateLoginError } from "@/lib/authErrors";
import { jsonError, rejectCrossOrigin } from "@/lib/panelAuth";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Entrar en el panel con correo y contraseña (REQ-001, 7.4 y 8.2).
 *
 * Si la cuenta existe pero no es del equipo, se cierra la sesión y se responde
 * lo mismo que con la contraseña mal: no se dice qué cuentas existen.
 */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, MSG.badRequest);
  }

  const password = typeof body?.password === "string" ? body.password : "";
  const rawEmail = typeof body?.email === "string" ? body.email.trim() : "";
  if (!rawEmail || !password) return jsonError(400, MSG.missingCredentials);
  if (password.length > 1000) return jsonError(401, MSG.wrongCredentials);
  const email = normalizeEmail(rawEmail);
  if (!email) return jsonError(401, MSG.wrongCredentials);

  try {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const failure = translateLoginError(error);
      if (failure.log) console.error("[login] Supabase Auth:", failure.log);
      return jsonError(failure.status, failure.error);
    }

    const team = await supabase.rpc("is_team");
    if (team.error || team.data !== true) {
      if (team.error) console.error("[login] No se ha podido comprobar el equipo:", team.error);
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      return team.error ? jsonError(500, MSG.generic) : jsonError(401, MSG.wrongCredentials);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[login] Error inesperado:", e);
    return jsonError(500, MSG.generic);
  }
}
