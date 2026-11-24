# Arquitectura

## Visión general
Una sola app de Next.js 16 en un solo proyecto de Vercel, con dos dominios:
- `www.vm-propiedades.es`: la web;
- `panel.vm-propiedades.es`: el panel de inmuebles.

Los inmuebles y las cuentas están en Supabase; las fotos, en Vercel Blob; los formularios, en Resend.

El porqué está en [ADR-001](decisiones/adr-001-supabase-en-vez-de-github-json.md) y [ADR-002](decisiones/adr-002-panel-en-subdominio.md). El diseño completo, en la [especificación de REQ-001](specs/req-001-panel-con-supabase.md).

## Módulos
| Módulo | Responsabilidad |
|---|---|
| `src/app/**` (menos `admin` y `api`) | Páginas públicas. Leen los inmuebles con `propertiesStore.ts`, en caché |
| `src/app/admin/**` | Pantallas del panel (`login`, `recuperar`, `nueva-contrasena` y `(panel)/` con la lista, el editor y «Mi cuenta») |
| `src/app/api/admin/**` | Acceso, contraseña, inmuebles y subida de fotos (ver `api.md`) |
| `src/app/api/salud` | El cron diario que mantiene viva la base |
| `src/proxy.ts` y `src/lib/panelHost.ts` | Reparto por dominio y sesión del panel |
| `src/lib/propertiesStore.ts` | Lectura de la base: pública y en caché, o del panel y sin caché |
| `src/lib/propertyRules.ts` y `propertyErrors.ts` | Las reglas, en el formulario, y la traducción de los errores de la base |
| `src/lib/panelAuth.ts` | Comprueba la sesión y que la cuenta esté en `team` en las rutas que escriben |
| `src/lib/photoCleanup.ts` | Barrido de fotos huérfanas de Blob |
| `src/lib/supabase/` | Los clientes de Supabase (rechazan una clave secreta) |
| `supabase/` | La migración y su comprobación |

## Flujos principales
- **Publicar un inmueble**:
  1. El equipo guarda en el panel.
  2. La ruta escribe en Supabase con la sesión, y el RLS y los disparadores lo validan.
  3. `revalidateTag('properties', { expire: 0 })` invalida la caché de la web.
  4. La web lo ve en la primera recarga.
  5. `after()` barre las fotos huérfanas.
- **Subir una foto**:
  1. El navegador la comprime.
  2. Pide un token a `/api/admin/upload`.
  3. La sube directamente a Blob.
  4. La URL se guarda al pulsar «Guardar».
- **Recuperar la contraseña**: Supabase manda el correo (por Resend) con un enlace a `/nueva-contrasena?token_hash=…`. El enlace se gasta al guardar, no al abrirlo.
- **Mantener viva la base**: Vercel Cron llama cada día a `/api/salud`.

## Integraciones externas
- **Supabase**: Postgres, RLS y Auth.
- **Vercel Blob**: las fotos.
- **Resend**: los formularios y el SMTP de Auth, con claves distintas.
- **Vercel Cron**: la llamada diaria a `/api/salud`.

## Seguridad
- **Cuentas**: Supabase Auth, con las altas cerradas. La sesión va en cookies `HttpOnly`, `SameSite=Lax` y sin `Domain`, así que la web no las recibe.
- **Escribir** exige estar en `team`, y lo vuelve a exigir el RLS de la base.
- **La web** lee como visitante y solo ve `disponible`, `reservado` y `vendido`.
- **Claves**: en Vercel no hay ninguna clave secreta de Supabase.
- **Indexación**: el panel y todo lo que no es `www` llevan `X-Robots-Tag: noindex, nofollow`.
