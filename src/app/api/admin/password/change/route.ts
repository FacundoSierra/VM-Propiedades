import { NextResponse } from "next/server";

import { MSG, newPasswordProblem, translateUpdatePasswordError } from "@/lib/authErrors";
import { jsonError, requireSession } from "@/lib/panelAuth";

/**
 * Cambiar la contraseña desde «Mi cuenta», con la actual (REQ-001, 7.4 y 8.2).
 *
 * Quien comprueba la actual es Supabase, con «Require current password when
 * changing password» activado (sección 7.5). Si ese ajuste estuviera apagado,
 * Supabase no miraría la actual: lo detecta la comprobación (i) de B3.
 * La sesión sigue abierta en este dispositivo y en los demás.
 */
export async function POST(request: Request) {
  const auth = await requireSession(request);
  if (!auth.ok) return auth.response;

  let body: { current?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, MSG.badRequest);
  }

  const current = typeof body?.current === "string" ? body.current : "";
  if (!current || current.length > 1000) return jsonError(422, MSG.wrongCurrent);
  const problem = newPasswordProblem(body?.password);
  if (problem) return jsonError(422, problem);
  const password = body.password as string;
  if (password === current) return jsonError(422, MSG.samePassword);

  try {
    const { error } = await auth.supabase.auth.updateUser({ password, current_password: current });
    if (error) {
      const failure = translateUpdatePasswordError(error);
      if (failure.log) console.error("[password/change] updateUser:", failure.log);
      return jsonError(failure.status, failure.error);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[password/change] Error inesperado:", e);
    return jsonError(500, MSG.generic);
  }
}
