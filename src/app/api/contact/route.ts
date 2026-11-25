import { Resend } from "resend";
import { NextResponse } from "next/server";
import { propertyStatusLabels, propertyTypeLabels, type Property } from "@/data/properties";
import { getProperty } from "@/lib/propertiesStore";
import { formatPrice, site } from "@/lib/site";

/**
 * Formularios de la web: contacto, valoración (vendedor y comprador) y la
 * consulta desde la ficha de un inmueble (REQ-002). Todos llegan a
 * `DESTINATION_EMAIL`, con el correo del cliente como «Responder a».
 *
 * - Solo se aceptan los campos conocidos (`FIELD_LABELS`), con un largo máximo,
 *   y todo lo que escribe el cliente se escapa antes de meterlo en el correo.
 * - En la consulta de un inmueble, el navegador solo manda su `slug`: los datos
 *   del piso (precio, zona, enlace…) se leen de la base, no de lo que llegue.
 *   Si la base no responde, el correo sale igual, con el título que se vio en
 *   la ficha: un cliente que escribe no se pierde nunca.
 * - El correo es HTML de tablas con los estilos en línea (lo que entienden
 *   Gmail y Outlook), con la marca de VM, y lleva también versión de texto.
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

/** Cómo se presenta cada formulario en la cabecera del correo. */
const FORM_INTROS: Record<string, string> = {
  contacto: "ha escrito desde el formulario de contacto de la web.",
  valoracion: "quiere vender y pide una valoración de su vivienda.",
  "valoracion-comprador": "busca vivienda y ha dejado lo que necesita.",
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

/** Los del cliente, que van en su propio bloque y no en la tabla de la solicitud. */
const CLIENT_KEYS = ["nombre", "apellidos", "email", "telefono", "mensaje", "marketing", "privacidad"];

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

/** «madrid» → «Madrid»: lo escrito en el panel, presentable. */
function capitalize(value: string) {
  return value ? value.charAt(0).toLocaleUpperCase("es-ES") + value.slice(1) : value;
}

function fullName(f: Fields) {
  return oneLine([f.nombre, f.apellidos].filter((v) => typeof v === "string").join(" "), 80);
}

function sentAt() {
  return new Date().toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "long",
    timeStyle: "short",
  });
}

// --- Diseño del correo --------------------------------------------------------
// Tablas y estilos en línea. Letras de sistema: Georgia para los títulos y las
// cifras (hace las veces de la serif de la web) y Arial para el texto. Botones
// rectos, sin iconos ni flechas, como en la web.

const C = {
  brand: "#ce0019",
  ink: "#1c1b19",
  soft: "#55524b",
  faint: "#8a867d",
  line: "#e3dfd6",
  cream: "#f7f5f1",
  page: "#efece5",
};
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Arial,Helvetica,sans-serif";

/** Un botón que funciona en todos los clientes de correo: un enlace con relleno. */
function button(href: string, label: string, variant: "brand" | "dark" | "outline" = "brand") {
  const bg = variant === "brand" ? C.brand : variant === "dark" ? C.ink : "#ffffff";
  const color = variant === "outline" ? C.ink : "#ffffff";
  const border = variant === "outline" ? C.ink : bg;
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;background:${bg};border:1px solid ${border};color:${color};font:bold 14px/18px ${SANS};text-decoration:none;">${label}</a>`;
}

function heading(text: string, size = 18) {
  return `<p style="margin:0 0 12px;font:normal ${size}px/1.3 ${SERIF};color:${C.ink};">${text}</p>`;
}

/** La página entera: fondo, tarjeta de 600 px, cabecera con el logo y pie. */
function shell({ preheader, eyebrow, body }: { preheader: string; eyebrow: string; body: string }) {
  const logo = `${site.url}/logo.png`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(eyebrow)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${C.line};">
  <tr><td style="padding:18px 28px;border-bottom:3px solid ${C.brand};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;"><a href="${escapeHtml(site.url)}"><img src="${escapeHtml(logo)}" alt="VM Propiedades" width="37" height="50" style="display:block;border:0;width:37px;height:50px;"></a></td>
      <td align="right" style="vertical-align:middle;font:13px/18px ${SANS};color:${C.soft};">${escapeHtml(eyebrow)}</td>
    </tr></table>
  </td></tr>
  ${body}
  <tr><td style="padding:20px 28px;background:${C.cream};border-top:1px solid ${C.line};font:12px/18px ${SANS};color:${C.faint};">
    Recibido el ${escapeHtml(sentAt())} (hora de Madrid) desde <a href="${escapeHtml(site.url)}" style="color:${C.faint};">la web de VM Propiedades</a>.<br>
    Si respondes a este correo, le llega directamente a quien ha escrito.
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** La cabecera de cada correo: el título grande y una línea de quién escribe. */
function introRow(title: string, line: string) {
  return `<tr><td style="padding:28px 28px 20px;">
    <p style="margin:0 0 6px;font:normal 26px/1.25 ${SERIF};color:${C.ink};">${title}</p>
    <p style="margin:0;font:15px/22px ${SANS};color:${C.soft};">${line}</p>
  </td></tr>`;
}

/** El bloque de quien escribe: datos, botones para contestarle y su mensaje. */
function clientRow(f: Fields, context: { replySubject: string; whatsappText: string }) {
  const name = fullName(f);
  const email = String(f.email ?? "");
  const phone = typeof f.telefono === "string" ? f.telefono : "";
  let phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length === 9) phoneDigits = `34${phoneDigits}`; // un móvil español sin prefijo

  const contactLines = [
    `<a href="mailto:${escapeHtml(email)}" style="color:${C.ink};text-decoration:underline;">${escapeHtml(email)}</a>`,
    phone
      ? `<a href="tel:+${escapeHtml(phoneDigits)}" style="color:${C.ink};text-decoration:underline;">${escapeHtml(phone)}</a>`
      : `<span style="color:${C.faint};">No ha dejado teléfono</span>`,
  ].join("<br>");

  const mailto = `mailto:${email}?subject=${encodeURIComponent(context.replySubject)}`;
  const buttons =
    button(mailto, "Responder por correo", "dark") +
    (phoneDigits
      ? button(`tel:+${phoneDigits}`, "Llamar", "outline") +
        button(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(context.whatsappText)}`, "Escribir por WhatsApp", "outline")
      : "");

  const message =
    typeof f.mensaje === "string"
      ? `<p style="margin:20px 0 8px;font:13px/18px ${SANS};color:${C.soft};">Su mensaje</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
           <td style="padding:16px 18px;background:${C.cream};border-left:3px solid ${C.brand};font:15px/23px ${SANS};color:${C.ink};white-space:pre-wrap;">${escapeHtml(f.mensaje)}</td>
         </tr></table>`
      : "";

  const consents = [
    f.marketing === true ? "Acepta recibir comunicaciones comerciales." : "No acepta comunicaciones comerciales.",
    f.privacidad === true ? "Ha aceptado la política de privacidad." : "No ha aceptado la política de privacidad.",
  ].join(" ");

  return `<tr><td style="padding:28px;border-top:1px solid ${C.line};">
    ${heading("Quién escribe")}
    <p style="margin:0 0 6px;font:bold 17px/24px ${SANS};color:${C.ink};">${escapeHtml(name)}</p>
    <p style="margin:0 0 18px;font:15px/24px ${SANS};color:${C.ink};">${contactLines}</p>
    <div>${buttons}</div>
    ${message}
    <p style="margin:18px 0 0;font:12px/18px ${SANS};color:${C.faint};">${consents}</p>
  </td></tr>`;
}

function clientText(f: Fields) {
  return [
    `Nombre: ${fullName(f)}`,
    `Correo: ${f.email ?? ""}`,
    `Teléfono: ${typeof f.telefono === "string" ? f.telefono : "no lo ha dejado"}`,
    typeof f.mensaje === "string" ? `Mensaje:\n${f.mensaje}` : "",
    `Publicidad: ${f.marketing === true ? "acepta" : "no acepta"} comunicaciones comerciales`,
    `Privacidad: ${f.privacidad === true ? "aceptada" : "no aceptada"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Las cifras del piso, en casillas como las de la ficha de la web. */
function statsTable(property: Property) {
  const stats = [
    property.sqm > 0 ? { value: `${property.sqm} m²`, label: "superficie" } : null,
    property.rooms > 0 ? { value: String(property.rooms), label: property.rooms === 1 ? "habitación" : "habitaciones" } : null,
    property.baths > 0 ? { value: String(property.baths), label: property.baths === 1 ? "baño" : "baños" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);
  if (stats.length === 0) return "";
  const width = Math.floor(100 / stats.length);
  const cells = stats
    .map(
      (s, i) => `<td width="${width}%" align="center" style="padding:14px 8px;border:1px solid ${C.line};${i > 0 ? "border-left:0;" : ""}">
        <span style="display:block;font:normal 20px/26px ${SERIF};color:${C.ink};">${escapeHtml(s.value)}</span>
        <span style="display:block;font:12px/16px ${SANS};color:${C.soft};">${escapeHtml(s.label)}</span>
      </td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

/** El bloque del inmueble. `property` puede faltar si la base no respondió. */
function propertyRows(property: Property | undefined, fallbackTitle: string) {
  if (!property) {
    return `<tr><td style="padding:0 28px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding:18px;background:${C.cream};border:1px solid ${C.line};">
          <p style="margin:0 0 4px;font:normal 20px/1.3 ${SERIF};color:${C.ink};">${escapeHtml(fallbackTitle || "Inmueble sin título")}</p>
          <p style="margin:0;font:14px/20px ${SANS};color:${C.soft};">No se han podido leer sus datos ahora mismo: búscalo por el título en el panel.</p>
        </td>
      </tr></table>
    </td></tr>`;
  }

  const pageUrl = `${site.url}/inmuebles/${property.slug}`;
  const panelUrl = `${site.panelUrl}/${property.slug}/editar`;
  const price = formatPrice(property.price, property.operation);
  const meta = [
    propertyTypeLabels[property.type] ?? property.type,
    capitalize(property.zone),
    property.operation === "venta" ? "En venta" : "En alquiler",
  ].join(" · ");
  const cover = property.images[0];
  const statusTag =
    property.status !== "disponible"
      ? `<span style="display:inline-block;margin:0 0 10px;padding:4px 8px;background:${property.status === "vendido" ? C.ink : "#b8860b"};color:#ffffff;font:bold 12px/16px ${SANS};">${escapeHtml(propertyStatusLabels[property.status])}</span><br>`
      : "";

  return `${
    cover
      ? `<tr><td style="padding:0;"><a href="${escapeHtml(pageUrl)}"><img src="${escapeHtml(cover)}" alt="${escapeHtml(property.title)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a></td></tr>`
      : ""
  }
  <tr><td style="padding:24px 28px 28px;">
    ${statusTag}
    <p style="margin:0 0 6px;font:normal 24px/1.25 ${SERIF};color:${C.ink};"><a href="${escapeHtml(pageUrl)}" style="color:${C.ink};text-decoration:none;">${escapeHtml(property.title)}</a></p>
    <p style="margin:0 0 14px;font:14px/20px ${SANS};color:${C.soft};">${escapeHtml(meta)}</p>
    <p style="margin:0;font:normal 28px/1.2 ${SERIF};color:${C.brand};">${escapeHtml(price)}</p>
    ${property.address ? `<p style="margin:8px 0 0;font:14px/20px ${SANS};color:${C.soft};">${escapeHtml(property.address)}</p>` : ""}
    ${statsTable(property)}
    <div style="margin-top:22px;">${button(pageUrl, "Ver la ficha en la web", "brand")}${button(panelUrl, "Abrir en el panel", "outline")}</div>
  </td></tr>`;
}

function propertyText(property: Property | undefined, fallbackTitle: string) {
  if (!property) {
    return `EL INMUEBLE\n${fallbackTitle}\n(No se han podido leer sus datos: búscalo por el título en el panel.)`;
  }
  const price = formatPrice(property.price, property.operation);
  const sizes = [
    property.sqm > 0 ? `${property.sqm} m²` : "",
    property.rooms > 0 ? `${property.rooms} ${property.rooms === 1 ? "habitación" : "habitaciones"}` : "",
    property.baths > 0 ? `${property.baths} ${property.baths === 1 ? "baño" : "baños"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return [
    "EL INMUEBLE",
    property.title,
    `${propertyTypeLabels[property.type] ?? property.type} · ${capitalize(property.zone)} · ${property.operation === "venta" ? "en venta" : "en alquiler"}`,
    `Precio: ${price}`,
    property.address ? `Dirección: ${property.address}` : "",
    sizes,
    property.status !== "disponible" ? `Estado: ${propertyStatusLabels[property.status]}` : "",
    `Ficha: ${site.url}/inmuebles/${property.slug}`,
    `Panel: ${site.panelUrl}/${property.slug}/editar`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Los formularios que no son de un inmueble: lo que se ha rellenado y quién escribe. */
function genericEmail(formType: string, f: Fields) {
  const title = FORM_TITLES[formType] ?? "Nueva solicitud desde la web";
  const name = fullName(f);
  const detailKeys = Object.keys(f).filter((k) => !CLIENT_KEYS.includes(k));
  const details = detailKeys
    .map(
      (k) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};font:13px/20px ${SANS};color:${C.soft};vertical-align:top;width:40%;">${FIELD_LABELS[k]}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};font:15px/22px ${SANS};color:${C.ink};vertical-align:top;white-space:pre-wrap;">${escapeHtml(capitalize(String(f[k])))}</td>
      </tr>`,
    )
    .join("");
  const detailRow = details
    ? `<tr><td style="padding:0 28px 28px;">${heading("La solicitud")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line};">${details}</table></td></tr>`
    : "";
  const intro = FORM_INTROS[formType] ?? "ha rellenado un formulario de la web.";

  return {
    subject: `${title} — ${name}`,
    html: shell({
      preheader: `${name} ${intro}`,
      eyebrow: "Formulario de la web",
      body:
        introRow(escapeHtml(title), `${escapeHtml(name)} ${escapeHtml(intro)}`) +
        detailRow +
        clientRow(f, {
          replySubject: "Tu solicitud en VM Propiedades",
          whatsappText: `Hola, ${f.nombre ?? ""}. Te escribo de VM Propiedades por la solicitud que nos has enviado desde la web.`,
        }),
    }),
    text: [
      title,
      "",
      detailKeys.map((k) => `${FIELD_LABELS[k]}: ${f[k]}`).join("\n"),
      "",
      "QUIÉN ESCRIBE",
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
  const title = property?.title ?? fallbackTitle;
  const name = fullName(f);
  const priceText = property ? formatPrice(property.price, property.operation) : "";

  return {
    subject: `Consulta por «${oneLine(title, 70)}»${priceText ? ` (${priceText})` : ""} — ${oneLine(name, 50)}`,
    html: shell({
      preheader: `${name} quiere información sobre ${title}${priceText ? ` (${priceText})` : ""}.`,
      eyebrow: "Consulta desde la web",
      body:
        introRow("Nueva consulta por un inmueble", `${escapeHtml(name)} quiere información sobre este inmueble.`) +
        propertyRows(property, fallbackTitle) +
        clientRow(f, {
          replySubject: `Sobre ${title}`,
          whatsappText: `Hola, ${f.nombre ?? ""}. Te escribo de VM Propiedades por tu consulta sobre «${title}».`,
        }),
    }),
    text: [
      "Nueva consulta por un inmueble",
      "",
      propertyText(property, fallbackTitle),
      "",
      "QUIÉN ESCRIBE",
      clientText(f),
    ].join("\n"),
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
