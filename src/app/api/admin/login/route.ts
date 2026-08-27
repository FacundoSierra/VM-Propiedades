import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  checkPassword,
  getExpectedSessionValue,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (typeof body.password !== "string" || !(await checkPassword(body.password))) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const sessionValue = await getExpectedSessionValue();
  if (!sessionValue) {
    return NextResponse.json(
      { error: "El panel no está configurado (falta ADMIN_PASSWORD)." },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
