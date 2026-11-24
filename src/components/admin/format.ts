/**
 * Cómo se dicen en el panel las fechas, los recuentos y los precios. Las fechas
 * van siempre en la hora de Madrid, para que el servidor y el navegador digan
 * lo mismo.
 */
import type { Operation, Property, PropertyStatus } from "@/data/properties";
import { joinEs } from "@/lib/propertyRules";

const TIME_ZONE = "Europe/Madrid";

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const shortDate = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
});
const shortDateWithYear = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const clock = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

/** Días enteros (en Madrid) entre dos fechas: 0 si es el mismo día. */
function daysBetween(from: Date, to: Date) {
  const toDay = (d: Date) => {
    const [y, m, day] = dayKey.format(d).split("-").map(Number);
    return Date.UTC(y, m - 1, day) / 86_400_000;
  };
  return toDay(to) - toDay(from);
}

function parse(iso: string | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** «Hoy», «Ayer», «Hace 3 días», «12 nov» o «12 nov 2025». «—» si no hay fecha. */
export function relativeDay(iso: string | undefined, now = new Date()) {
  const date = parse(iso);
  if (!date) return "—";
  const days = daysBetween(date, now);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  const sameYear = dayKey.format(date).slice(0, 4) === dayKey.format(now).slice(0, 4);
  return (sameYear ? shortDate : shortDateWithYear).format(date);
}

/** «Guardado hoy a las 10:42», «Guardado ayer a la 1:05», «Guardado el 12 nov a las 9:30». */
export function savedAt(iso: string | undefined, now = new Date()) {
  const date = parse(iso);
  if (!date) return null;
  const time = clock.format(date);
  const at = time.startsWith("1:") ? `a la ${time}` : `a las ${time}`;
  const days = daysBetween(date, now);
  if (days <= 0) return `Guardado hoy ${at}`;
  if (days === 1) return `Guardado ayer ${at}`;
  const sameYear = dayKey.format(date).slice(0, 4) === dayKey.format(now).slice(0, 4);
  return `Guardado el ${(sameYear ? shortDate : shortDateWithYear).format(date)} ${at}`;
}

const numberEs = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

/** Como en la web: «1.850.000» (y «1500», sin punto, como escribe la RAE los de cuatro cifras). */
export function formatAmount(value: number | string) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? numberEs.format(n) : "";
}

export function formatPanelPrice(price: number, operation: Operation) {
  return `${formatAmount(price)} €${operation === "alquiler" ? "/mes" : ""}`;
}

const summaryWords: Record<PropertyStatus, [string, string]> = {
  disponible: ["publicado en la web", "publicados en la web"],
  reservado: ["reservado", "reservados"],
  vendido: ["vendido", "vendidos"],
  borrador: ["borrador", "borradores"],
  oculto: ["oculto", "ocultos"],
};

/** «3 publicados en la web, 1 reservado y 1 borrador»: solo lo que no es cero. */
export function summaryLine(properties: Pick<Property, "status">[]) {
  const parts: string[] = [];
  for (const status of Object.keys(summaryWords) as PropertyStatus[]) {
    const n = properties.filter((p) => p.status === status).length;
    if (n > 0) parts.push(`${n} ${summaryWords[status][n === 1 ? 0 : 1]}`);
  }
  return joinEs(parts);
}

export function countLabel(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Para buscar sin que importen las tildes ni las mayúsculas. */
export function normalizeForSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Las zonas que ya se han usado, para sugerirlas al escribir. */
export function zonesOf(properties: Pick<Property, "zone">[]) {
  return [...new Set(properties.map((p) => p.zone.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}
