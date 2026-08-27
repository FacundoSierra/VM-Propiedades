import { Resend } from "resend";
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

const DESTINATION_EMAIL = "gestion@vm-propiedades.es";

const FORM_TITLES: Record<string, string> = {
  contacto: "Nuevo mensaje de contacto",
  valoracion: "Nueva solicitud de valoración (vendedor)",
  "valoracion-comprador": "Nueva solicitud de valoración (comprador)",
};

const FIELD_LABELS: Record<string, string> = {
  formType: "Tipo de formulario",
  nombre: "Nombre",
  apellidos: "Apellidos",
  email: "Email",
  telefono: "Teléfono",
  asunto: "Asunto",
  mensaje: "Mensaje",
  tipoInmueble: "Tipo de inmueble",
  direccion: "Dirección o zona",
  metros: "Superficie aproximada (m²)",
  motivo: "Motivo",
  descripcion: "Descripción del inmueble",
  zona: "Zona de interés",
  presupuesto: "Presupuesto máximo",
  caracteristicas: "Características deseadas",
  marketing: "Autoriza contacto comercial",
  privacidad: "Acepta política de privacidad",
};

function buildEmailHtml(data: ContactPayload) {
  const title = FORM_TITLES[data.formType ?? ""] ?? "Nueva solicitud desde la web";
  const rows = Object.entries(data)
    .filter(([key, value]) => key !== "formType" && value !== undefined && value !== "")
    .map(([key, value]) => {
      const label = FIELD_LABELS[key] ?? key;
      const displayValue =
        typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
      return `<tr><td style="padding:6px 12px;font-weight:600;color:#1c1b19;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:6px 12px;color:#333;">${displayValue}</td></tr>`;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;">
      <h2 style="color:#ce0019;">${title}</h2>
      <table style="border-collapse:collapse;width:100%;">${rows}</table>
      <p style="margin-top:20px;color:#888;font-size:12px;">Enviado desde el formulario de vm-propiedades.es</p>
    </div>
  `;
}

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

  console.log("[contacto] Nueva solicitud:", JSON.stringify(data, null, 2));

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "[contacto] RESEND_API_KEY no configurada: el email no se ha enviado.",
    );
    return NextResponse.json(
      { error: "El servicio de email no está configurado todavía." },
      { status: 500 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || "VM Propiedades <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: DESTINATION_EMAIL,
      replyTo: String(data.email),
      subject: FORM_TITLES[data.formType ?? ""] ?? "Nueva solicitud desde la web",
      html: buildEmailHtml(data),
    });

    if (error) {
      console.error("[contacto] Error enviando email con Resend:", error);
      return NextResponse.json(
        { error: "No se pudo enviar el email" },
        { status: 502 },
      );
    }
  } catch (e) {
    console.error("[contacto] Error inesperado enviando email:", e);
    return NextResponse.json(
      { error: "No se pudo enviar el email" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
