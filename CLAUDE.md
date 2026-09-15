@AGENTS.md

# VM Propiedades — web corporativa

Web de VM Propiedades, agencia inmobiliaria en Madrid: presentación y servicios, formularios de captación y catálogo de inmuebles con un panel propio para publicarlos. Está en producción en https://www.vm-propiedades.es (Vercel). El brief de diseño está en `vm-propiedades-brief.md`.

## Stack
- Next.js 16 (App Router, dentro de `src/`) + React 19 + TypeScript
- Tailwind CSS 4 y Framer Motion
- Vercel Blob (fotos), Resend (formularios) y API de GitHub (datos de los inmuebles)
- Playwright instalado como dependencia de desarrollo

## Comandos
- Instalar: `npm ci`
- Desarrollo: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Estructura
- `src/app/`: páginas públicas (inicio, quiénes somos, compra-venta, alquiler, inmuebles y su ficha, gestoría, financiación, valoración, contacto y legales)
- `src/app/admin/`: panel (login, listado, nuevo y editar)
- `src/app/api/admin/`: `login`, `logout`, `properties` y `upload`; `src/app/api/contact/`: formulario de contacto
- `src/proxy.ts`: protege el panel (en Next.js 16 hace el papel del antiguo middleware)
- `src/lib/`: `adminAuth.ts` (contraseña única), `github.ts` (lee y escribe los inmuebles) y `site.ts`
- `src/data/properties.json`: catálogo de inmuebles
- `src/components/` (y `admin/`, `forms/`)

## Cómo funciona el panel
- Se entra con una única contraseña (`ADMIN_PASSWORD`), sin usuarios ni base de datos
- Los inmuebles viven en `src/data/properties.json`. El panel lo actualiza con commits a través de la API de GitHub (`GITHUB_TOKEN`), y esos commits redespliegan la web en Vercel
- Las fotos se suben desde el navegador directamente a Vercel Blob, para evitar el límite de 4,5 MB de las funciones
- ⚠️ Antes de tocar `properties.json` en local, haz `git pull`: el panel puede haber añadido commits

## Variables de entorno (ver `.env.local.example`)
`ADMIN_PASSWORD`, `GITHUB_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

## Reglas
- Lee `AGENTS.md` antes de programar: esta versión de Next.js tiene cambios incompatibles con versiones anteriores
- Hacer push a `main` publica la web
- Commits en español y descriptivos; si la tarea tiene requerimiento, añadir `[REQ-###]`
- Se trabaja desde Windows: no añadir dependencias ni archivos específicos de macOS
