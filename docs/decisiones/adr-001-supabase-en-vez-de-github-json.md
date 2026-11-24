# ADR-001: Los inmuebles pasan de un JSON en el repo a Supabase, y se entra con correo y contraseña

- Fecha: 2026-11-24
- Estado: aceptada (decidido por Facundo el 2026-11-24). Construcción en la rama `req-001-panel-con-supabase`. El punto 5 (el panel en `/admin`) lo sustituye [ADR-002](adr-002-panel-en-subdominio.md): el panel va en `panel.vm-propiedades.es`
- Requerimiento: REQ-001
- Especificación: [`docs/specs/req-001-panel-con-supabase.md`](../specs/req-001-panel-con-supabase.md)

## Contexto
Hasta ahora el panel `/admin` funcionaba así:
- Los inmuebles vivían en `src/data/properties.json`. Cada guardado era un commit por la API de GitHub (`GITHUB_TOKEN`) que volvía a desplegar la web, así que un cambio tardaba 1–2 minutos en verse. Dos guardados seguidos podían chocar (409 de GitHub).
- Se entraba con una contraseña única (`ADMIN_PASSWORD`), sin cuentas. No se podía recuperar ni cambiar sin Facundo.
- Las páginas públicas importaban el JSON al compilar.

Lo que se quiere del panel:
- entrar con correo y contraseña;
- recuperar la contraseña sola y cambiarla desde «Mi cuenta»;
- que lo que se guarda salga en la web al momento, sin desplegar.

Con un archivo en el repo no se puede: cada cambio necesita una compilación, y una contraseña en una variable de entorno no se puede recuperar. Además, `properties.json` está vacío en producción, así que no hay datos que migrar.

## Decisión
1. **Los inmuebles van a una tabla de Postgres en Supabase (plan gratuito)**, con RLS:
   - lo publicado (`disponible`, `reservado` y `vendido`) lo lee cualquiera;
   - todo lo demás, y escribir, solo las cuentas de la tabla `team`.
   
   Las reglas de `src/lib/propertyRules.ts` (qué hace falta para publicar, 4 destacadas como mucho, no volver a borrador, la dirección fija y borrar solo borradores y ocultos) **las garantiza la base** con disparadores. El TypeScript se queda para avisar en el formulario y para traducir los errores.
2. **Supabase Auth con correo y contraseña**. Las altas están cerradas. La contraseña se recupera con un enlace con `token_hash` que se gasta al guardar, no al abrirlo, y se cambia en «Mi cuenta» pidiendo la actual.
3. **La web lee la base con caché y etiqueta** (`unstable_cache` con la etiqueta `properties`), sin activar `cacheComponents`.
   - Cada escritura del panel invalida esa etiqueta con `revalidateTag('properties', { expire: 0 })`: la siguiente visita ya ve el cambio.
   - Si la base falla, la lectura lanza el error y Next sigue sirviendo la última versión buena. Nunca se sirve una lista vacía.
4. **Las fotos se quedan en Vercel Blob**, como hasta ahora. En la base solo se guardan sus direcciones, en orden, y la primera es la portada.
5. ~~**El panel se queda en `/admin`** del mismo dominio, con `noindex` en la cabecera.~~ Sustituido por [ADR-002](adr-002-panel-en-subdominio.md): el panel va en `panel.vm-propiedades.es`, en el mismo proyecto de Vercel.
6. **Las rutas `/api/admin/*` mantienen su contrato** (`{ ok: true, property } | { error }`) para que las pantallas no cambien: solo cambia lo que hay detrás.

## Alternativas consideradas
- **Dejar el JSON y poner solo Supabase Auth.** Se ganaba recuperar la contraseña, pero cada cambio seguiría tardando 1–2 minutos y llenando el historial de commits. Una base sin datos no ahorra trabajo.
- **Activar `cacheComponents` y usar `use cache` con `cacheTag`.**
  - Obliga a revisar todas las páginas de la web, no solo las de inmuebles.
  - Con `cacheComponents`, `generateStaticParams` tiene que devolver al menos un inmueble o el build falla. Hoy el catálogo está vacío.
  - En Vercel, la caché de `use cache` vive en la memoria de cada instancia y no se comparte entre peticiones (`node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`, «Runtime caching considerations»).
  
  El modelo anterior (`unstable_cache`) persiste entre peticiones y despliegues y se invalida por etiqueta. Se puede pasar a `use cache` más adelante sin tocar la base.
- **Server Actions con `updateTag` en vez de las rutas.** Obligaba a rehacer `src/lib/adminApi.ts` y su uso en las pantallas, recién hechas. `revalidateTag(tag, { expire: 0 })` da el mismo «la siguiente visita espera a los datos nuevos» desde una ruta (`revalidateTag.md`).
- **Supabase Storage para las fotos.** Se compara en la sección 5 de la especificación. Cuesta 2–3 h más, cambia la subida de las pantallas y gasta el cupo gratuito de 1 GB y 5 + 5 GB de transferencia, sin resolver mejor las fotos huérfanas.
- **El panel en un subdominio (`panel.`).** Hace falta un registro en el DNS del dominio, al que hoy no hay acceso, y un proxy que reparta por dominio (unas 2–3 h más), solo por estética. Se puede hacer más adelante sin tocar las pantallas.
- **Un gestor de contenidos externo (Sanity, Decap).** Es otro sistema que mantener, y es genérico. Decap exige que quien edita tenga cuenta de GitHub.

## Consecuencias
- **Se gana**:
  - lo publicado se ve en la primera recarga;
  - la clienta gestiona su contraseña sola;
  - ya no hay commits de datos en el repo, ni choques de dos guardados a la vez por el `sha`;
  - las reglas no se pueden saltar llamando a la API a mano.
- **Cuesta**:
  - Un proyecto de Supabase gratuito que **se pausa a la semana sin actividad**. Lo mantiene despierto una llamada diaria de Vercel Cron a `/api/salud`.
  - Una pieza más que vigilar (avisos de Supabase, cambios de permisos).
  - Las migraciones las ejecuta Facundo a mano.
- **El build lee la base**: `/`, `/inmuebles`, `/alquiler` y `sitemap.xml` se generan al compilar. Si la base no responde, el build falla y la versión anterior sigue en pie. Es lo que se quiere: nunca se publica un catálogo vacío por un fallo.
- **Las fotos y la base están en sitios distintos.** Una foto subida y no guardada, o quitada de un inmueble, queda suelta en Blob hasta que la borra el barrido que se hace después de cada guardado (sección 5.4 de la especificación).
- **Desaparecen** `GITHUB_TOKEN`, `ADMIN_PASSWORD`, `src/lib/github.ts`, `src/lib/adminAuth.ts` y `src/data/properties.json`. En Vercel no hay ninguna clave secreta de Supabase: todo pasa por la clave publicable y el RLS.
- La copia de seguridad de la base va aparte (la copia semanal de Facundo). Las fotos de Blob no entran en ella.
