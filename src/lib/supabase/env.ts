/**
 * Datos de conexión con Supabase, compartidos por `public.ts`, `server.ts` y
 * `src/proxy.ts`.
 *
 * - Las variables se leen solo cuando se llama a `getSupabaseEnv()`, nunca al
 *   importar este archivo: así el build pasa sin ellas mientras ninguna página
 *   lea la base.
 * - Se leen por su nombre completo (`process.env.NEXT_PUBLIC_…`), que es lo
 *   único que Next sustituye al compilar. Por eso, si cambian en Vercel, hay
 *   que volver a desplegar.
 * - Los mensajes de error dicen qué variable falla, pero nunca su valor.
 */

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

const WHERE =
  "en .env.local (en local) o en Vercel → Settings → Environment Variables. Ver .env.local.example.";

export type SupabaseEnv = {
  /** `https://<ref>.supabase.co` */
  url: string;
  /** La clave publicable (`sb_publishable_…`): la protege el RLS. */
  publishableKey: string;
};

/**
 * Opciones de las cookies de la sesión. Tienen que ser las mismas en
 * `server.ts` y en `src/proxy.ts`, que también las escribe al refrescar el
 * token.
 *
 * - `httpOnly`: el panel no tiene cliente de Supabase en el navegador (solo
 *   habla con `/api/admin/*`), así que ningún JavaScript necesita leerlas.
 * - `SameSite=Lax`, la ruta `/` y la duración son las de `@supabase/ssr`: no
 *   se cambian.
 */
export const supabaseCookieOptions = { httpOnly: true } as const;

let keyFormatWarned = false;

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  const missing = [url ? null : URL_VAR, publishableKey ? null : KEY_VAR].filter(
    (name): name is string => name !== null,
  );
  if (missing.length === 1) {
    throw new Error(
      `Supabase: falta la variable de entorno ${missing[0]}. Ponla ${WHERE}`,
    );
  }
  if (missing.length === 2) {
    throw new Error(
      `Supabase: faltan las variables de entorno ${URL_VAR} y ${KEY_VAR}. Ponlas ${WHERE}`,
    );
  }

  if (!isValidProjectUrl(url)) {
    throw new Error(
      `Supabase: ${URL_VAR} no es una dirección válida. Tiene que ser https://<ref>.supabase.co, la «Project URL» de Supabase → Settings → API.`,
    );
  }

  if (isSecretKey(publishableKey)) {
    throw new Error(
      `Supabase: ${KEY_VAR} lleva una clave secreta. Aquí va la publicable (sb_publishable_…): la secreta se salta el RLS, y todo lo que empieza por NEXT_PUBLIC_ puede acabar en el navegador. Cámbiala y revoca la secreta en Supabase → Settings → API Keys.`,
    );
  }

  if (!publishableKey.startsWith("sb_publishable_") && !keyFormatWarned) {
    keyFormatWarned = true;
    console.warn(
      `Supabase: ${KEY_VAR} no empieza por sb_publishable_. Si es la clave «anon» antigua funcionará, pero la que toca es la publicable, de Supabase → Settings → API Keys.`,
    );
  }

  return { url, publishableKey };
}

function isValidProjectUrl(value: string): boolean {
  try {
    const { protocol, hostname } = new URL(value);
    if (protocol === "https:") return true;
    // Solo para un Supabase local (CLI), nunca para el proyecto de verdad.
    return (
      protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

/**
 * Una clave que se salta el RLS: la secreta nueva (`sb_secret_…`) o la
 * `service_role` antigua, que es un JWT con `"role": "service_role"`.
 */
function isSecretKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { role?: unknown };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}
