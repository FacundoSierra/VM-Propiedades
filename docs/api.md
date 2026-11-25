# API

Las rutas del servidor de la web y del panel de inmuebles. El diseño completo está en la [especificación de REQ-001](specs/req-001-panel-con-supabase.md) (secciones 7 y 8); el porqué, en [ADR-001](decisiones/adr-001-supabase-en-vez-de-github-json.md) y [ADR-002](decisiones/adr-002-panel-en-subdominio.md).

## Dónde vive cada cosa
- **La web**: `https://www.vm-propiedades.es`. Lee los inmuebles de Supabase como visitante (clave publicable, sin cookies), en caché.
- **El panel**: `https://panel.vm-propiedades.es`, en el mismo proyecto de Vercel. `src/proxy.ts` reescribe `/<ruta>` a `/admin/<ruta>`, así que dentro del código las pantallas siguen en `src/app/admin/**` y la API en `src/app/api/admin/**`.
  - En `www`, `/admin/*` lleva (308) al subdominio y `/api/admin/*` da 404.
  - En las vistas previas de Vercel y en `localhost`, el panel se abre en `/admin/*`, tal cual. En local, también en `http://panel.localhost:3000` (Chrome lo resuelve solo).
- **Todo lo que no es `www`** (el panel, las vistas previas, `localhost`) lleva `X-Robots-Tag: noindex, nofollow`.

## Autenticación
- **Cuentas de Supabase Auth** con correo y contraseña. Las altas están cerradas: las cuentas las crea Facundo (pasos en `docs/base-de-datos.md`, «Dar de alta una cuenta del panel»).
- **La sesión va en cookies de `@supabase/ssr`**, `HttpOnly`, `SameSite=Lax` y sin `Domain`: solo las recibe el dominio del panel, nunca la web.
- **`src/proxy.ts`**, en cada petición del panel, comprueba la sesión con `getClaims()` y refresca el token si ha caducado. Sin sesión: las rutas de la API responden `401 { "error": "No autenticado" }` y las pantallas llevan a `/login?next=<ruta>`.
- **Tener sesión no basta**: las rutas que escriben exigen además estar en la tabla `team` (`requireTeam` de `src/lib/panelAuth.ts`), y la base lo vuelve a exigir con su RLS.
- **Otra web no puede usar la sesión**: además de `SameSite=Lax`, las rutas que cambian algo responden 403 si llega una cabecera `Origin` que no es el propio dominio.
- **Sin sesión** se pueden usar `login`, `password/forgot` y `password/reset`.

Todas las respuestas son JSON. Las que escriben devuelven `{ "ok": true, … }` o `{ "error": "<frase en español>" }`: la frase se puede enseñar tal cual, y los detalles técnicos solo van al log del servidor. El cliente es `src/lib/adminApi.ts`.

## Endpoints

### Acceso
| Método | Ruta | Entrada | Bien | Errores | Auth |
|---|---|---|---|---|---|
| POST | `/api/admin/login` | `{ email, password }` | `200 { ok: true }`, con las cookies de la sesión | 400 «Escribe tu correo y tu contraseña.» · 401 «El correo o la contraseña no son correctos.» (también si la cuenta no es del equipo: se cierra su sesión y no se dice qué cuentas existen) · 429 «Demasiados intentos. Espera unos minutos y vuelve a probar.» · 500 | No |
| POST | `/api/admin/logout` | — | `200 { ok: true }`. Sale solo en este dispositivo (`scope: 'local'`). Si Supabase no contesta, borra igual las cookies | 401 sin sesión | Sesión |
| POST | `/api/admin/password/forgot` | `{ email }` | `200 { ok: true }` **siempre**, exista o no la cuenta. Supabase manda el correo con su plantilla | 400 «Escribe un correo válido.» · 429 «Espera un minuto antes de pedir otro enlace.» | No |
| POST | `/api/admin/password/reset` | `{ tokenHash, password }` | `200 { ok: true }`, con la sesión iniciada y los demás dispositivos fuera (`scope: 'others'`) | 422 de longitud («al menos 10» / «como mucho 72 caracteres»), sin gastar el enlace · 400 «El enlace ha caducado o ya se ha usado. Pide otro.» (solo eso da 400) · 422 «La contraseña nueva tiene que ser distinta de la anterior.» · 422 «Esa contraseña es demasiado fácil. Elige otra.» · 429 · 500 | No |
| POST | `/api/admin/password/change` | `{ current, password }` | `200 { ok: true }` | 401 · 403 (otro origen) · 422 «La contraseña actual no es correcta.» · 422 de longitud, igual o débil · 429 · 500 | Sesión |

- **`password/reset`**: el enlace del correo (`/nueva-contrasena?token_hash=…&type=recovery`) no hace nada al abrirlo; se gasta aquí, con `verifyOtp`, después de comprobar la longitud. Si la contraseña nueva falla después de gastarlo (la misma de antes, por ejemplo), el segundo intento usa la sesión de recuperación que ya está en las cookies, si tiene menos de 15 minutos.
- **`password/change`**: la contraseña actual la comprueba Supabase, con «Require current password when changing password» activado. El código de error de Supabase es `current_password_invalid`.

### Inmuebles
| Método | Ruta | Entrada | Bien | Errores | Auth |
|---|---|---|---|---|---|
| POST | `/api/admin/properties` | `Partial<PropertyInput>` (pasa por `pickEditable`) | `200 { ok: true, property: Property }` | 400 · 401 · 403 · 422 «Ponle un título al inmueble.» y los de la base (abajo) · 500 | Equipo |
| PUT | `/api/admin/properties/[slug]` | `Partial<PropertyInput>`: el inmueble entero o una parte (`{ status: "vendido" }`) | `200 { ok: true, property }` | 400 · 401 · 403 · 404 «Inmueble no encontrado» · 422 · 500 | Equipo |
| DELETE | `/api/admin/properties/[slug]` | — | `200 { ok: true }` | 401 · 403 · 404 · 409 «Este inmueble está {estado} y sale en la web. Para borrarlo, ocúltalo antes: así nunca se borra nada por error.» · 500 | Equipo |
| POST | `/api/admin/upload` | El cuerpo de `handleUpload` de `@vercel/blob/client` | Lo que devuelve `handleUpload` (el token de un solo uso) | 401 · 403 · 400 «No se pudo preparar la subida» | Equipo |

- **El `slug`** lo manda `POST` con `slugify(title)`, y la base lo hace único (`-2`, `-3`…). No cambia nunca.
- **Las reglas** (qué hace falta para publicar, 4 destacadas como mucho, no volver a borrador, fotos solo de Blob, borrar solo borradores y ocultos) las comprueba la base. Sus errores los traduce `src/lib/propertyErrors.ts`:

| Viene de la base | HTTP | Frase |
|---|---|---|
| `vm:faltan:<lista>` | 422 | «Para que salga en la web falta el precio y al menos una foto.» (con lo que falte, en orden) |
| `vm:no_vuelve_a_borrador` | 422 | «Un inmueble que ya ha salido en la web no vuelve a borrador. Para quitarlo de la web, ocúltalo.» |
| `vm:destacadas_llenas` | 422 | «Ya hay 4 inmuebles en la portada. Quita uno antes de destacar este.» |
| `vm:no_se_puede_borrar` | 409 | La del 409 de arriba |
| `vm:fotos_no_validas` | 422 | «Alguna foto no se ha subido bien. Quítala y vuelve a subirla.» |
| `vm:caracteristicas` | 422 | «Revisa las características: como mucho 40, y cada una de 120 caracteres como mucho.» |
| `vm:slug_fijo` | 422 | «La dirección de un inmueble en la web no se puede cambiar.» |
| `23514` (un `check`) y `22…` | 422 | «Hay un dato que no es válido. Revisa el formulario.» |
| `42501` | 403 | «Tu cuenta no tiene permiso para cambiar inmuebles.» |
| Lo demás | 500 | «No se ha podido guardar. Vuelve a intentarlo en un momento.» |

- **Después de cada `POST`, `PUT` y `DELETE` que va bien**:
  - `revalidateTag('properties', { expire: 0 })`, antes de responder: la siguiente visita a la web ya ve el cambio, también la ficha que antes daba 404;
  - el barrido de fotos huérfanas de Blob, dentro de `after()`, cuando la respuesta ya ha salido (`src/lib/photoCleanup.ts`). Borra lo que no está en ningún inmueble y, o bien se acaba de quitar (las fotos quitadas al guardar, las de un inmueble borrado), o bien tiene más de 48 horas. Si no puede leer la cartera entera o el almacén entero, no borra nada.
- **Subir fotos**: el navegador comprime la foto y la sube directamente a Blob (`uploadPhoto` de `adminApi.ts`) con el token de `/api/admin/upload`: solo bajo `inmuebles/`, JPEG, PNG o WebP, 15 MB como mucho, con sufijo al azar y un año de caché. La URL se guarda en la base al pulsar «Guardar».

### Mantenimiento
| Método | Ruta | Entrada | Bien | Errores | Auth |
|---|---|---|---|---|---|
| GET | `/api/salud` | Cabecera `Authorization: Bearer <CRON_SECRET>` | `200 { ok: true, visibles: n }` (cuántos inmuebles se ven en la web) | 401 sin la cabecera, con otra o si `CRON_SECRET` no existe · 503 `{ ok: false }` si la base no responde | `CRON_SECRET` |

La llama Vercel Cron una vez al día (`vercel.json`, `0 6 * * *`) para que el proyecto gratuito de Supabase no se pause. Solo en producción.

### Formularios de la web
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/api/contact` | Formularios de contacto y valoración, por Resend. Sin cambios en REQ-001 | No |

## Lectura de la web (no son rutas)
`src/lib/propertiesStore.ts`, `server-only`:
- `getPublicProperties()`, `getProperty(slug)`, `getFeatured()` y `getZones()`: lo publicado, con la clave publicable, en la caché de Next con la etiqueta `properties` (y una hora como red de seguridad). Si la base falla, lanzan el error: nunca una lista vacía.
- `readPropertiesList()` y `readProperty(slug)`: para el panel, con la sesión, sin caché.

## Webhooks e integraciones
- **Supabase**: Postgres con RLS (la base) y Auth (las cuentas). En Vercel solo están la URL y la clave publicable: ninguna clave secreta de Supabase.
- **Vercel Blob**: las fotos, en un almacén **público**, con el sistema sin clave (`BLOB_STORE_ID` y las credenciales OIDC de Vercel; no hay `BLOB_READ_WRITE_TOKEN`). `/api/admin/upload` pide con `issueSignedToken` un permiso solo para esa foto, y lo devuelve firmado con `handleUploadPresigned`. El navegador sube con `uploadPresigned`. `list` y `del`, para las huérfanas, usan las mismas credenciales. Sin `onUploadCompleted`: Vercel no llama de vuelta a ninguna ruta.
- **Resend**: los formularios de la web (`RESEND_API_KEY`) y, aparte, el SMTP de Supabase Auth con su propia clave, guardada en Supabase y no en Vercel.
- **Vercel Cron**: `/api/salud`, una vez al día.
- No hay webhooks entrantes.
