import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseEnv, supabaseCookieOptions } from "./env";

/**
 * Cliente de Supabase con la sesión de quien entra, leída de las cookies de
 * `@supabase/ssr`. Cada consulta pasa por el RLS como ese usuario: es el del
 * panel y el de las rutas de `/api/admin/*`.
 *
 * - **Uno nuevo por petición**, nunca compartido: lleva la sesión de una persona.
 * - **Quién llama, con `auth.getClaims()`**, que comprueba la firma del token.
 *   Nunca `getSession()` en el servidor: no comprueba nada.
 * - **Lee las cookies**, así que la página o la ruta que lo use es dinámica. La
 *   web pública usa `createPublicClient()` de `./public`.
 *
 * En una ruta (`route.ts`) escribe las cookies de la sesión (entrar, salir,
 * recuperar la contraseña). En un Server Component no puede, porque la
 * respuesta ya ha empezado: el error se ignora y la sesión la refresca
 * `src/proxy.ts` en la petición siguiente. `proxy.ts` también es quien pone en
 * la respuesta las cabeceras sin caché que `@supabase/ssr` pide al escribir la
 * sesión; aquí no se puede, y las rutas que leen cookies ya son dinámicas.
 */
export async function createSessionClient(): Promise<SupabaseClient> {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component: no puede escribir cookies (ver arriba).
        }
      },
    },
  });
}
