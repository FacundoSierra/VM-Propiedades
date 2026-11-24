/**
 * Dónde está el panel según el dominio (ADR-002). Funciones puras: las usan
 * `src/proxy.ts`, el servidor y los componentes del panel, así que aquí no se
 * lee ni la petición ni el navegador.
 *
 * - En `panel.vm-propiedades.es` (y `panel.localhost` en local) el panel va sin
 *   prefijo: `/`, `/login`, `/nuevo`, `/<slug>/editar`… El proxy lo reescribe a
 *   las rutas de verdad, que siguen en `src/app/admin/**`.
 * - En `www.vm-propiedades.es` y `vm-propiedades.es` no hay panel: `/admin/*`
 *   lleva al subdominio.
 * - En cualquier otro dominio (las vistas previas de Vercel, `localhost`) el
 *   panel se abre en `/admin/*`, tal cual, para poder probarlo.
 */
import { site } from "@/lib/site";

/** Donde están las rutas del panel dentro de la app. */
export const PANEL_PREFIX = "/admin";

/** El prefijo de los enlaces del panel: ninguno en su subdominio, `/admin` en los demás. */
export type PanelBase = "" | typeof PANEL_PREFIX;

export type HostKind = "panel" | "web" | "other";

const PANEL_HOSTS = new Set([new URL(site.panelUrl).hostname, "panel.localhost"]);
const webHostname = new URL(site.url).hostname;
const WEB_HOSTS = new Set([webHostname, webHostname.replace(/^www\./, "")]);

/** «panel.vm-propiedades.es» (sin `https://`), para enseñarlo en pantalla. */
export const panelDisplayHost = new URL(site.panelUrl).host;

/** El dominio sin el puerto y en minúsculas, como lo compara Next en el `matcher`. */
function hostnameOf(host: string | null | undefined) {
  return (host ?? "").split(":", 1)[0].trim().toLowerCase();
}

export function hostKind(host: string | null | undefined): HostKind {
  const hostname = hostnameOf(host);
  if (PANEL_HOSTS.has(hostname)) return "panel";
  if (WEB_HOSTS.has(hostname)) return "web";
  return "other";
}

export function panelBaseFor(host: string | null | undefined): PanelBase {
  return hostKind(host) === "panel" ? "" : PANEL_PREFIX;
}

function isUnderPrefix(pathname: string) {
  return pathname === PANEL_PREFIX || pathname.startsWith(`${PANEL_PREFIX}/`);
}

/**
 * Una ruta del panel sin el prefijo: `/admin/nuevo` → `/nuevo`, `/admin` → `/`.
 * Lo que ya viene sin prefijo se queda igual.
 */
export function panelRelative(path: string) {
  const cut = path.indexOf("?");
  const pathname = cut === -1 ? path : path.slice(0, cut);
  const query = cut === -1 ? "" : path.slice(cut);
  const relative = isUnderPrefix(pathname) ? pathname.slice(PANEL_PREFIX.length) : pathname;
  return `${relative || "/"}${query}`;
}

/**
 * El enlace a una pantalla del panel en el dominio en que se está. `path` va
 * sin prefijo y empieza por `/`: `panelHref("", "/nuevo")` → `/nuevo` y
 * `panelHref("/admin", "/nuevo")` → `/admin/nuevo`. Admite `?…` detrás, y
 * también una ruta que ya traiga el prefijo.
 */
export function panelHref(base: PanelBase, path: string) {
  const relative = panelRelative(path.startsWith("/") ? path : `/${path}`);
  if (!base) return relative;
  if (relative === "/") return base;
  if (relative.startsWith("/?")) return `${base}${relative.slice(1)}`;
  return `${base}${relative}`;
}

/**
 * La ruta a la que volver después de entrar (`?next=`), en la forma de este
 * dominio. Solo rutas del propio panel: nunca otra web (`//otra.com`) ni algo
 * que no empiece por `/`.
 */
export function safePanelNext(base: PanelBase, next: string | null | undefined) {
  const home = panelHref(base, "/");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return home;
  // Fuera de su subdominio, el panel solo vive bajo /admin.
  if (base && !isUnderPrefix(next.split("?", 1)[0])) return home;
  return panelHref(base, next);
}
