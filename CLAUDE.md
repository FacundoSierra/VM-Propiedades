@AGENTS.md

# VM Propiedades — web corporativa

Web de VM Propiedades, agencia inmobiliaria en Madrid: presentación y servicios, formularios de captación y catálogo de inmuebles con un panel propio para publicarlos (`panel.vm-propiedades.es`). Está en producción en https://www.vm-propiedades.es (Vercel). El brief de diseño está en `vm-propiedades-brief.md`.

## Stack
- Next.js 16 (App Router, dentro de `src/`) + React 19 + TypeScript
- Tailwind CSS 4 y Framer Motion
- Supabase (Postgres con RLS y Auth: los inmuebles y las cuentas del panel), Vercel Blob (fotos) y Resend (formularios)
- Vercel Cron: llama cada día a `/api/salud` para que la base gratuita no se pause
- Playwright instalado como dependencia de desarrollo

## Comandos
- Instalar: `npm ci`
- Desarrollo: `npm run dev` (la web en `http://localhost:3000`; el panel en `http://panel.localhost:3000` o en `http://localhost:3000/admin`)
- Build: `npm run build` (lee la base: si no responde, falla en vez de publicar un catálogo vacío)
- Lint: `npm run lint`

## Estructura
- `src/app/`: páginas públicas (inicio, quiénes somos, compra-venta, alquiler, inmuebles y su ficha, gestoría, financiación, valoración, contacto y legales)
- `src/app/admin/`: el panel. Se sirve en `panel.vm-propiedades.es` sin el prefijo `/admin`. Pantallas: `login`, `recuperar`, `nueva-contrasena` y, con sesión, `(panel)/` (lista, `nuevo`, `[slug]/editar` y `cuenta`)
- `src/app/api/admin/`: `login`, `logout`, `password/{forgot,reset,change}`, `properties`, `properties/[slug]` y `upload`. `src/app/api/salud/`: el cron diario. `src/app/api/contact/`: formulario de contacto
- `src/proxy.ts`: reparte por dominio (panel o web) y protege el panel con la sesión de Supabase (en Next.js 16 hace el papel del antiguo middleware)
- `src/lib/`:
  - `propertiesStore.ts`: lectura de la web, en caché;
  - `propertyRules.ts` y `propertyErrors.ts`: reglas y errores;
  - `panelAuth.ts`: comprueba la sesión y `team`;
  - `panelHost.ts`: enlaces por dominio;
  - `photoCleanup.ts`: barrido de fotos huérfanas;
  - `adminApi.ts`: cliente del panel;
  - `photos.ts`: comprimir fotos en el navegador;
  - `supabase/` y `site.ts`.
- `src/data/properties.ts`: el modelo `Property`, los estados y `MAX_FEATURED`
- `src/components/` (y `admin/`, `forms/`). `PropertyDetail.tsx` es la ficha, que comparten la web y la vista previa del panel
- `supabase/migrations/` y `supabase/comprobaciones/`: la base y su prueba
- `vercel.json`: región `dub1`, Fluid y el cron
- `docs/`: arquitectura, API, base de datos, ADR y la especificación de REQ-001 (`docs/specs/`)

## Cómo funciona el panel
- **Dónde vive**: en `https://panel.vm-propiedades.es`, un solo proyecto de Vercel con dos dominios (ADR-002).
  - `src/proxy.ts` reescribe `/<ruta>` a `/admin/<ruta>`.
  - En `www`, `/admin/*` redirige (308) al panel.
  - En las vistas previas y en local se abre en `/admin`, o en `http://panel.localhost:3000`.
- **Cuentas**: se entra con correo y contraseña (Supabase Auth). Las altas están cerradas: las cuentas las crea Facundo y se apuntan en la tabla `team`. Tener sesión no basta, hace falta estar en `team`. La contraseña se recupera y se cambia sin ayuda («Mi cuenta»).
- **Inmuebles y reglas**: viven en Supabase (`properties`), con cinco estados: borrador, publicado (`disponible`), reservado, vendido y oculto. Las reglas las garantiza la base con disparadores, y `propertyRules.ts` solo avisa en el formulario:
  - para publicar hacen falta título, zona, dirección, precio, superficie, descripción y una foto;
  - 4 destacadas como mucho;
  - un publicado no vuelve a borrador;
  - el `slug` no cambia;
  - solo se borran borradores y ocultos.
- **La web**: lee en caché (`unstable_cache`, etiqueta `properties`).
  - Cada guardado la invalida con `revalidateTag('properties', { expire: 0 })`, y sale en la primera recarga, sin redesplegar.
  - No usar `revalidatePath` (ver spec 6.4).
  - Si la base falla, la lectura lanza el error: nunca sirve un catálogo vacío.
- **Fotos**: siguen en Vercel Blob. **El almacén tiene que ser público** (*Access: Public*): uno privado rechaza las subidas, y en la consola sale como un error de CORS (pasó el 2026-11-25). El navegador las comprime (JPEG de 1800 px) y las sube directamente. Tras cada guardado, `photoCleanup.ts` borra las huérfanas, y no borra nada si no ha podido leer la cartera entera.
- **Claves**: en Vercel solo están la URL y la clave publicable de Supabase. Nunca poner la `sb_secret_` ni la `service_role`: se saltan el RLS, y el código se niega a arrancar con ellas.
- **La base despierta**: Vercel Cron llama cada día a `/api/salud` (con `CRON_SECRET`), para que la base gratuita no se pause.
- **Columnas**: toda lectura de la base nombra sus columnas, también después de `insert` o `update`. `select('*')` da 42501 por `created_at`.
- **Datos fuera del repo**: los inmuebles ya no están en él. No hay `properties.json` ni hace falta `git pull` antes de tocar nada.

## Variables de entorno (ver `.env.local.example`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `CRON_SECRET` (solo Production), `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

## Reglas
- Lee `AGENTS.md` antes de programar: esta versión de Next.js tiene cambios incompatibles con versiones anteriores
- Hacer push a `main` publica la web y el panel (un solo proyecto de Vercel)
- **Migraciones**: las de `supabase/migrations/` las ejecuta Facundo a mano en el editor SQL, después de revisarlas, y luego pasa `supabase/comprobaciones/inmuebles.sql`, que tiene que dar `BIEN`. Una regla de negocio se cambia en la base y en `propertyRules.ts` a la vez.
- **`MAX_FEATURED`**: el de `src/data/properties.ts` y el límite de la base van juntos. Si cambia uno, migración nueva.
- **Si cambia el dominio del panel**, hay que cambiar a la vez:
  - `site.panelUrl`;
  - el `matcher` de `src/proxy.ts` (es constante);
  - la Site URL y la Redirect URL de Supabase Auth;
  - el dominio en Vercel.
- **Documentación de este cambio**: `docs/specs/req-001-panel-con-supabase.md`, ADR-001 y ADR-002.
- Commits en español y descriptivos; si la tarea tiene requerimiento, añadir `[REQ-###]`
- Se trabaja desde Windows: no añadir dependencias ni archivos específicos de macOS
