import { Resend } from "resend";
import { NextResponse } from "next/server";
import { propertyStatusLabels, propertyTypeLabels, type Property } from "@/data/properties";
import { getProperty } from "@/lib/propertiesStore";
import { formatPrice, site } from "@/lib/site";

/**
 * Formularios de la web: contacto, valoración (vendedor y comprador) y la
 * consulta desde la ficha de un inmueble. Todos llegan a `DESTINATION_EMAIL`,
 * con el correo del cliente como «Responder a».
 *
 * - Solo se aceptan los campos conocidos (`FIELD_LABELS`), con un largo máximo,
 *   y todo lo que escribe el cliente se escapa antes de meterlo en el correo.
 * - En la consulta de un inmueble, el navegador solo manda su `slug`: los datos
 *   del piso (precio, zona, enlace…) se leen de la base, no de lo que llegue.
 *   Si la base no responde, el correo sale igual, con el título que se vio en
 *   la ficha: un cliente que escribe no se pierde nunca.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_FIELD = 5000;

const DESTINATION_EMAIL = "gestion@vm-propiedades.es";

const FORM_TITLES: Record<string, string> = {
  contacto: "Nuevo mensaje de contacto",
  inmueble: "Consulta por un inmueble",
  valoracion: "Nueva solicitud de valoración (vendedor)",
  "valoracion-comprador": "Nueva solicitud de valoración (comprador)",
};

const FIELD_LABELS: Record<string, string> = {
  nombre: "Nombre",
  apellidos: "Apellidos",
  email: "Correo",
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
  marketing: "Acepta comunicaciones comerciales",
  privacidad: "Acepta la política de privacidad",
};

type Fields = Record<string, string | boolean>;

/** Se queda solo con los campos conocidos, como texto corto o sí/no. */
function cleanFields(input: Record<string, unknown>): Fields {
  const out: Fields = {};
  for (const key of Object.keys(FIELD_LABELS)) {
    const value = input[key];
    if (typeof value === "boolean") out[key] = value;
    else if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim().slice(0, MAX_FIELD);
      if (text) out[key] = text;
    }
  }
  return out;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

/** Para el asunto: una sola línea y no muy larga. */
function oneLine(value: string, max = 90) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

const yesNo = (v: string | boolean | undefined) => (v === true ? "Sí" : "No");

function sentAt() {
  return new Date().toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "long",
    timeStyle: "short",
  });
}

// --- Piezas del correo -------------------------------------------------------

const BRAND = "#ce0019";
const INK = "#1c1b19";
const SOFT = "#55524b";

function row(label: string, valueHtml: string) {
  return `<tr><td style="padding:6px 12px 6px 0;color:${SOFT};white-space:nowrap;vertical-align:top;width:1%;">${label}</td><td style="padding:6px 0;color:${INK};vertical-align:top;">${valueHtml}</td></tr>`;
}

function section(title: string, rowsHtml: string) {
  return `<h3 style="margin:28px 0 8px;font-size:15px;color:${INK};border-bottom:1px solid #e3dfd6;padding-bottom:6px;">${title}</h3><table style="border-collapse:collapse;width:100%;font-size:14px;">${rowsHtml}</table>`;
}

function layout(title: string, intro: string, body: string) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;color:${INK};">
      <h2 style="margin:0 0 6px;color:${BRAND};font-size:20px;">${title}</h2>
      <p style="margin:0;color:${SOFT};font-size:14px;">${intro}</p>
      ${body}
      <p style="margin-top:28px;color:#888;font-size:12px;">Enviado el ${escapeHtml(sentAt())} (hora de Madrid) desde vm-propiedades.es. Para contestar, responde a este correo: le llega directamente al cliente.</p>
    </div>
  `;
}

/** Los datos del cliente, con el correo y el teléfono que se pueden pulsar. */
function clientRows(f: Fields) {
  const name = [f.nombre, f.apellidos].filter((v) => typeof v === "string").join(" ");
  const email = String(f.email ?? "");
  const phone = typeof f.telefono === "string" ? f.telefono : "";
  const phoneHref = phone.replace(/[^\d+]/g, "");
  return [
    row("Nombre", escapeHtml(name)),
    row("Correo", `<a href="mailto:${escapeHtml(email)}" style="color:${BRAND};">${escapeHtml(email)}</a>`),
    phone
      ? row("Teléfono", phoneHref ? `<a href="tel:${escapeHtml(phoneHref)}" style="color:${BRAND};">${escapeHtml(phone)}</a>` : escapeHtml(phone))
      : row("Teléfono", `<span style="color:${SOFT};">No lo ha dejado</span>`),
    typeof f.mensaje === "string"
      ? row("Mensaje", `<div style="white-space:pre-wrap;">${escapeHtml(f.mensaje)}</div>`)
      : "",
    row("Publicidad", f.marketing === true ? "Acepta recibir comunicaciones comerciales" : "No acepta comunicaciones comerciales"),
    row("Privacidad", f.privacidad === true ? "Ha aceptado la política de privacidad" : "No ha aceptado la política de privacidad"),
  ].join("");
}

function clientText(f: Fields) {
  const name = [f.nombre, f.apellidos].filter((v) => typeof v === "string").join(" ");
  return [
    `Nombre: ${name}`,
    `Correo: ${f.email ?? ""}`,
    `Teléfono: ${typeof f.telefono === "string" ? f.telefono : "no lo ha dejado"}`,
    typeof f.mensaje === "string" ? `Mensaje:\n${f.mensaje}` : "",
    `${FIELD_LABELS.marketing}: ${yesNo(f.marketing)}`,
    `${FIELD_LABELS.privacidad}: ${yesNo(f.privacidad)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** El bloque del inmueble. `property` puede faltar si la base no respondió. */
function propertyBlock(property: Property | undefined, fallbackTitle: string) {
  if (!property) {
    const title = escapeHtml(fallbackTitle || "(sin título)");
    return {
      html: section(
        "El inmueble",
        row("Inmueble", title) +
          row("", `<span style="color:${SOFT};">No se han podido leer sus datos ahora mismo: búscalo por el título en el panel.</span>`),
      ),
      text: `EL INMUEBLE\n${fallbackTitle}\n(No se han podido leer sus datos: búscalo por el título en el panel.)`,
    };
  }

  const pageUrl = `${site.url}/inmuebles/${property.slug}`;
  const panelUrl = `${site.panelUrl}/${property.slug}/editar`;
  const price = formatPrice(property.price, property.operation);
  const operation = property.operation === "venta" ? "En venta" : "En alquiler";
  const sizes = [
    property.sqm > 0 ? `${property.sqm} m²` : "",
    property.rooms > 0 ? `${property.rooms} ${property.rooms === 1 ? "habitación" : "habitaciones"}` : "",
    property.baths > 0 ? `${property.baths} ${property.baths === 1 ? "baño" : "baños"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const cover = property.images[0];

  const html =
    `<h3 style="margin:28px 0 8px;font-size:15px;color:${INK};border-bottom:1px solid #e3dfd6;padding-bottom:6px;">El inmueble</h3>` +
    (cover
      ? `<a href="${escapeHtml(pageUrl)}"><img src="${escapeHtml(cover)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;margin:0 0 12px;border:0;"></a>`
      : "") +
    `<table style="border-collapse:collapse;width:100%;font-size:14px;">` +
    row("Inmueble", `<a href="${escapeHtml(pageUrl)}" style="color:${BRAND};font-weight:bold;">${escapeHtml(property.title)}</a>`) +
    row("Precio", `${escapeHtml(price)} · ${operation}`) +
    row("Tipo", escapeHtml(propertyTypeLabels[property.type] ?? property.type)) +
    row("Zona", escapeHtml(property.zone)) +
    (property.address ? row("Dirección", escapeHtml(property.address)) : "") +
    (sizes ? row("Superficie", escapeHtml(sizes)) : "") +
    (property.status !== "disponible" ? row("Estado", escapeHtml(propertyStatusLabels[property.status])) : "") +
    row(
      "Enlaces",
      `<a href="${escapeHtml(pageUrl)}" style="color:${BRAND};">Ver la ficha en la web</a> · <a href="${escapeHtml(panelUrl)}" style="color:${BRAND};">Abrirlo en el panel</a>`,
    ) +
    `</table>`;

  const text = [
    "EL INMUEBLE",
    property.title,
    `Precio: ${price} (${operation.toLowerCase()})`,
    `Tipo: ${propertyTypeLabels[property.type] ?? property.type}`,
    `Zona: ${property.zone}`,
    property.address ? `Dirección: ${property.address}` : "",
    sizes ? `Superficie: ${sizes}` : "",
    property.status !== "disponible" ? `Estado: ${propertyStatusLabels[property.status]}` : "",
    `Ficha: ${pageUrl}`,
    `Panel: ${panelUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}

/** Los formularios que no son de un inmueble: una tabla con lo que se ha rellenado. */
function genericEmail(formType: string, f: Fields) {
  const title = FORM_TITLES[formType] ?? "Nueva solicitud desde la web";
  const otherKeys = Object.keys(f).filter(
    (k) => !["nombre", "apellidos", "email", "telefono", "mensaje", "marketing", "privacidad"].includes(k),
  );
  const detailRows = otherKeys
    .map((k) => row(FIELD_LABELS[k], `<div style="white-space:pre-wrap;">${escapeHtml(String(f[k]))}</div>`))
    .join("");
  const name = oneLine([f.nombre, f.apellidos].filter((v) => typeof v === "string").join(" "));

  return {
    subject: `${title} — ${name}`,
    html: layout(
      escapeHtml(title),
      `${escapeHtml(name)} ha rellenado un formulario de la web.`,
      (detailRows ? section("La solicitud", detailRows) : "") + section("El cliente", clientRows(f)),
    ),
    text: [
      title,
      "",
      otherKeys.map((k) => `${FIELD_LABELS[k]}: ${f[k]}`).join("\n"),
      "",
      "EL CLIENTE",
      clientText(f),
    ].join("\n"),
  };
}

async function propertyEmail(slug: string, f: Fields) {
  let property: Property | undefined;
  if (SLUG_RE.test(slug)) {
    try {
      property = await getProperty(slug);
    } catch (e) {
      // Sin la base, el correo sale igual con el título que vio el cliente.
      console.error("[contacto] No se ha podido leer el inmueble:", e);
    }
  }
  const fallbackTitle = typeof f.asunto === "string" ? f.asunto : "";
  const block = propertyBlock(property, fallbackTitle);
  const name = oneLine([f.nombre, f.apellidos].filter((v) => typeof v === "string").join(" "), 50);
  const title = property?.title ?? fallbackTitle;
  const priceForSubject = property ? ` (${formatPrice(property.price, property.operation)})` : "";

  return {
    subject: `Consulta por «${oneLine(title, 70)}»${priceForSubject} — ${name}`,
    html: layout(
      "Consulta por un inmueble",
      `${escapeHtml(name)} ha escrito desde la ficha de este inmueble.`,
      block.html + section("El cliente", clientRows(f)),
    ),
    text: ["Consulta por un inmueble", "", block.text, "", "EL CLIENTE", clientText(f)].join("\n"),
  };
}

export async function POST(request: Request) {
  let raw: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("no es un objeto");
    raw = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const formType = typeof raw.formType === "string" && raw.formType in FORM_TITLES ? raw.formType : "contacto";
  const fields = cleanFields(raw);
  const slug = typeof raw.inmueble === "string" ? raw.inmueble.trim().slice(0, 80) : "";

  if (typeof fields.nombre !== "string") {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (typeof fields.email !== "string" || !EMAIL_RE.test(fields.email)) {
    return NextResponse.json({ error: "Email no válido" }, { status: 400 });
  }
  if (fields.privacidad !== true) {
    return NextResponse.json(
      { error: "Debes aceptar la política de privacidad" },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[contacto] RESEND_API_KEY no configurada: el email no se ha enviado.");
    return NextResponse.json(
      { error: "El servicio de email no está configurado todavía." },
      { status: 500 },
    );
  }

  const email =
    formType === "inmueble" && slug ? await propertyEmail(slug, fields) : genericEmail(formType, fields);

  try {
    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || "VM Propiedades <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: DESTINATION_EMAIL,
      replyTo: fields.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      console.error("[contacto] Error enviando email con Resend:", error);
      return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 502 });
    }
  } catch (e) {
    console.error("[contacto] Error inesperado enviando email:", e);
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 500 });
  }

  // En el log solo el tipo y el inmueble: los datos del cliente van en el correo, no en los logs.
  console.info(`[contacto] Enviado: ${formType}${slug ? ` (${slug})` : ""}`);
  return NextResponse.json({ ok: true });
}
