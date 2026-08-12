import { NextResponse } from "next/server";

interface ContactPayload {
  formType?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  privacidad?: boolean;
  [key: string]: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let data: ContactPayload;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!data.nombre || typeof data.nombre !== "string") {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (!data.email || !EMAIL_RE.test(String(data.email))) {
    return NextResponse.json({ error: "Email no válido" }, { status: 400 });
  }
  if (data.privacidad !== true) {
    return NextResponse.json(
      { error: "Debes aceptar la política de privacidad" },
      { status: 400 },
    );
  }

  // TODO: conectar con un servicio de email (Resend, Formspree…) o CRM.
  console.log("[contacto] Nueva solicitud:", JSON.stringify(data, null, 2));

  return NextResponse.json({ ok: true });
}
