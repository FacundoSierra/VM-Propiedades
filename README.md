# VM Propiedades — web

Web corporativa de VM Propiedades (https://www.vm-propiedades.es) y su panel de inmuebles (https://panel.vm-propiedades.es). Next.js 16 con Supabase (inmuebles y cuentas), Vercel Blob (fotos) y Resend (formularios).

## Puesta en marcha
```bash
npm ci
cp .env.local.example .env.local   # rellénalo con los valores de Vercel y Supabase
npm run dev
```
- La web: http://localhost:3000
- El panel: http://panel.localhost:3000 (como en producción) o http://localhost:3000/admin (como en una vista previa)

## Comandos
- `npm run dev`: desarrollo
- `npm run build`: compila. Lee la base: si no responde, falla en vez de publicar un catálogo vacío
- `npm start`: sirve lo compilado
- `npm run lint`

## Variables de entorno
Están explicadas en `.env.local.example`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `CRON_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

En Vercel van en Settings → Environment Variables.

## Base de datos
Supabase. Las migraciones están en `supabase/migrations/` y se ejecutan a mano en el editor SQL. Después se pasa `supabase/comprobaciones/inmuebles.sql`, que tiene que dar `BIEN`.

| Migración | Qué hace |
|---|---|
| `20261124120000_inmuebles.sql` | Tablas `properties` y `team`, reglas, RLS y permisos |

Más en `docs/base-de-datos.md`.

## Despliegue
Un solo proyecto de Vercel con dos dominios (`www` y `panel`). Hacer push a `main` publica los dos. `vercel.json` fija la región (`dub1`), Fluid y el cron diario de `/api/salud`.

## Documentación
`CLAUDE.md`, `docs/arquitectura.md`, `docs/api.md`, `docs/base-de-datos.md`, `docs/decisiones/` y `docs/specs/`.
