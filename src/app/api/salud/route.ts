import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";

/**
 * Mantiene viva la base (REQ-001, 8.5 y 9). Vercel Cron la llama una vez al día
 * (`vercel.json`) con `Authorization: Bearer <CRON_SECRET>`: sin el secreto, o
 * si la variable no existe, 401.
 *
 * Hace una lectura mínima como visitante (cuántos inmuebles se ven en la web) y
 * responde `{ ok: true, visibles }`, o `503 { ok: false }` con el error en el log.
 */
export const dynamic = "force-dynamic";

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const supabase = createPublicClient();
    const { count, error } = await supabase
      .from("properties")
      .select("slug", { count: "exact", head: true });
    if (error) {
      console.error("[salud] La base no responde bien:", error.code, error.message);
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    return NextResponse.json({ ok: true, visibles: count ?? 0 });
  } catch (e) {
    console.error("[salud] La base no responde:", e);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
