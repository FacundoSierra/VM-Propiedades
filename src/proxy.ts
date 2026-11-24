import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { PANEL_PREFIX, hostKind, panelHref, panelRelative, type PanelBase } from "@/lib/panelHost";
import { site } from "@/lib/site";
import { getSupabaseEnv, supabaseCookieOptions } from "@/lib/supabase/env";

/**
 * El proxy reparte por dominio (ADR-002) y protege el panel (REQ-001, 7.2).
 *
 * - `panel.vm-propiedades.es` (y `panel.localhost` en local): el panel, sin
 *   prefijo. `/<ruta>` se reescribe a `/admin/<ruta>`; `/api/admin/*`, `/_next/*`
 *   y los archivos pasan tal cual. Lo que llegue con `/admin` delante va (308) a
 *   la misma ruta sin él.
 * - `www.vm-propiedades.es` y `vm-propiedades.es`: la web. `/admin/*` va (308) al
 *   subdominio, por si alguien tiene guardada la dirección vieja, y
 *   `/api/admin/*` da 404. Lo demás ni siquiera pasa por aquí (ver `matcher`).
 * - Cualquier otro dominio (vistas previas de Vercel, `localhost`): el panel en
 *   `/admin/*`, tal cual, para poder probarlo.
 *
 * En el panel, en cada petición, `getClaims()` comprueba la sesión y refresca el
 * token si ha caducado (las cookies nuevas van en la respuesta). Nunca
 * `getSession()`: no comprueba nada. El proxy no mira la tabla `team`: lo hacen
 * las pantallas, las rutas y el RLS de la base.
 */

/** Se abren sin sesión: entrar y recuperar la contraseña. Rutas internas. */
const PUBLIC_PATHS = new Set([
  "/admin/login",
  "/admin/recuperar",
  "/admin/nueva-contrasena",
  "/api/admin/login",
  "/api/admin/password/forgot",
  "/api/admin/password/reset",
]);

const LOGIN_PATH = "/admin/login";
const NO_INDEX = "noindex, nofollow";

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function noIndex<T extends NextResponse>(response: T): T {
  response.headers.set("X-Robots-Tag", NO_INDEX);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const kind = hostKind(request.headers.get("host"));
  const isPanelPath = isUnder(pathname, PANEL_PREFIX);
  const isPanelApi = isUnder(pathname, "/api/admin");

  if (kind === "web") {
    if (isPanelPath) {
      return NextResponse.redirect(new URL(panelRelative(pathname) + search, site.panelUrl), 308);
    }
    if (isPanelApi) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.next();
  }

  if (kind === "panel") {
    if (isPanelPath) {
      return noIndex(NextResponse.redirect(new URL(panelRelative(pathname) + search, request.url), 308));
    }
    if (pathname.startsWith("/api/")) {
      return isPanelApi ? guard(request, pathname, null, "") : noIndex(NextResponse.next());
    }
    const internal = pathname === "/" ? PANEL_PREFIX : `${PANEL_PREFIX}${pathname}`;
    return guard(request, internal, new URL(internal + search, request.url), "");
  }

  if (isPanelPath || isPanelApi) return guard(request, pathname, null, PANEL_PREFIX);
  return NextResponse.next();
}

/**
 * Comprueba la sesión en una ruta del panel. `internal` es la ruta de verdad
 * (`/admin/…` o `/api/admin/…`); `rewriteTo`, adónde se reescribe en el
 * subdominio (o `null` para dejarla tal cual); `base`, el prefijo de los enlaces
 * en este dominio.
 */
async function guard(request: NextRequest, internal: string, rewriteTo: URL | null, base: PanelBase) {
  const isApi = internal.startsWith("/api/");
  const makeResponse = () =>
    rewriteTo ? NextResponse.rewrite(rewriteTo, { request }) : NextResponse.next({ request });

  // Entrar y recuperar la contraseña no necesitan sesión, y sus rutas escriben
  // las cookies ellas mismas: aquí no se toca nada.
  if (isApi && PUBLIC_PATHS.has(internal)) return noIndex(makeResponse());

  let response = makeResponse();
  let hasSession = false;
  try {
    const { url, publishableKey } = getSupabaseEnv();
    const supabase = createServerClient(url, publishableKey, {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // El token refrescado, para esta misma petición (las pantallas lo leen)…
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = makeResponse();
          // …y para el navegador.
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          // `@supabase/ssr` pide que una respuesta que cambia la sesión no se guarde en ninguna caché.
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    });
    const { data, error } = await supabase.auth.getClaims();
    hasSession = !error && typeof data?.claims?.sub === "string" && data.claims.sub.length > 0;
  } catch (e) {
    // Sin variables de Supabase, o la red: se trata como «sin sesión».
    console.error("[proxy] No se ha podido comprobar la sesión:", e);
  }

  const isPublic = PUBLIC_PATHS.has(internal);

  // Con sesión, la pantalla de entrar no hace falta.
  if (hasSession && internal === LOGIN_PATH) {
    return carryCookies(response, NextResponse.redirect(new URL(panelHref(base, "/"), request.url)));
  }

  if (!hasSession && !isPublic) {
    if (isApi) {
      return carryCookies(response, NextResponse.json({ error: "No autenticado" }, { status: 401 }));
    }
    const loginUrl = new URL(panelHref(base, "/login"), request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return carryCookies(response, NextResponse.redirect(loginUrl));
  }

  return noIndex(response);
}

/** Una respuesta nueva (redirección, 401) se lleva las cookies que haya escrito Supabase. */
function carryCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
  const cacheControl = from.headers.get("cache-control");
  if (cacheControl) to.headers.set("cache-control", cacheControl);
  return noIndex(to);
}

/**
 * - Las rutas del panel y de su API, en todos los dominios.
 * - En el subdominio del panel, todo lo demás menos `/_next/*`, el resto de
 *   `/api/*` y los archivos (`/logo.png`, `/robots.txt`…), que pasan tal cual.
 *   La web pública no pasa por el proxy: su caché no depende de él.
 *
 * Los valores tienen que ser constantes (Next los lee al compilar): si cambia
 * `site.panelUrl`, cambia también el dominio de aquí.
 */
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    {
      source:
        "/((?!_next/|api/|.*\\.(?:ico|png|jpe?g|gif|svg|webp|avif|txt|xml|html|json|webmanifest|js|css|map|woff2?)$).*)",
      has: [{ type: "host", value: "panel\\.(?:vm-propiedades\\.es|localhost)" }],
    },
  ],
};
