import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { rejectCrossOrigin } from "@/lib/panelAuth";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Salir del panel en este dispositivo (`scope: 'local'`): los demás siguen
 * dentro. Responde `{ ok: true }` siempre. Si Supabase no contesta, las cookies
 * de la sesión se borran igual: en este dispositivo se sale pase lo que pase.
 */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  let failed = false;
  try {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      failed = true;
      console.error("[logout] Supabase Auth:", error.name, error.status, error.code, error.message);
    }
  } catch (e) {
    failed = true;
    console.error("[logout] Error inesperado:", e);
  }

  if (failed) {
    // Las cookies de `@supabase/ssr`: sb-<ref>-auth-token, sus trozos (.0, .1…) y el code-verifier.
    const store = await cookies();
    for (const { name } of store.getAll()) {
      if (name.startsWith("sb-") && name.includes("-auth-token")) store.delete(name);
    }
  }
  return NextResponse.json({ ok: true });
}
