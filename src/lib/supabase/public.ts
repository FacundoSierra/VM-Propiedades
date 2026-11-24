import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

/**
 * Cliente de Supabase sin sesión ni cookies, con la clave publicable: ve lo
 * mismo que un visitante (el RLS de `anon`).
 *
 * Para la lectura pública en caché (`unstable_cache` de `propertiesStore.ts`) y
 * para `/api/salud`. Al no leer cookies, no vuelve dinámica la página que lo usa.
 *
 * Uno nuevo en cada llamada: no guarda nada entre peticiones, así que ninguna
 * sesión puede quedarse pegada y verla la petición siguiente. Crearlo no hace
 * ninguna llamada a la red, y si faltan las variables, el error salta aquí.
 */
export function createPublicClient(): SupabaseClient {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
