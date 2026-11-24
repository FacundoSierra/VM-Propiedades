import { NextResponse } from "next/server";

import { MSG, normalizeEmail } from "@/lib/authErrors";
import { jsonError, rejectCrossOrigin } from "@/lib/panelAuth";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Pide el enlace para elegir una contraseña nueva (REQ-001, 7.4).
 *
 * - Responde siempre `{ ok: true }`, exista o no la cuenta: así nadie puede
 *   averiguar qué correos la tienen. Solo se dice otra cosa si el correo no
 *   tiene forma de correo (400) o si se piden demasiados (429).
 * - El correo lo manda Supabase con su plantilla, que lleva a
 *   `<Site URL>/nueva-contrasena?token_hash=…&type=recovery`.
 * - Con el cliente sin sesión: no hace falta guardar nada en cookies.
 */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, MSG.badRequest);
  }

  const email = normalizeEmail(body?.email);
  if (!email) return jsonError(400, MSG.invalidEmail);

  try {
    const supabase = createPublicClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" || error.status === 429) {
        return jsonError(429, MSG.emailRateLimit);
      }
      // Cualquier otro fallo va al log, y la respuesta es la de siempre.
      console.error("[password/forgot] Supabase Auth:", error.name, error.status, error.code, error.message);
    }
  } catch (e) {
    console.error("[password/forgot] Error inesperado:", e);
  }
  return NextResponse.json({ ok: true });
}
