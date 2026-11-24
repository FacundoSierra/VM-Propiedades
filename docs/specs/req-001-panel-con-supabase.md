# REQ-001: panel de inmuebles con Supabase

- Fecha: 2026-11-24
- Estado: en construcción. Hechos F0, F1, B1, B2 (migración ejecutada), R1, B3, S1 y R2 (2026-11-25); falta P1 con sesión en la vista previa (sección 11, «Cómo quedó B3») y publicar (sección 12, pasos 5 a 9). Rama `req-001-panel-con-supabase`; commits `tipo(ámbito): descripción [REQ-001]`
- Decisiones de arquitectura: [ADR-001](../decisiones/adr-001-supabase-en-vez-de-github-json.md) y [ADR-002](../decisiones/adr-002-panel-en-subdominio.md) (el panel en `panel.vm-propiedades.es`)
- Alcance:
  - el panel en su propia dirección, `panel.vm-propiedades.es` (ADR-002);
  - entrar con correo y contraseña;
  - recuperar la contraseña sola y cambiarla desde «Mi cuenta»;
  - que lo que se guarda en el panel salga en la web al momento.
  
  La web pública no cambia de aspecto.

---

## 0. Datos del proyecto de Supabase

El proyecto se creó el 2026-11-24. Los datos, recogidos el 2026-11-24 y el 2026-11-25:

| Dato | Valor | Qué supone |
|---|---|---|
| Organización | **De la clienta**: Supabase y Vercel están en su cuenta, y Facundo entra con ella | Facundo puede guardar los ajustes de Auth (URL, SMTP, plantillas), y ya lo ha hecho (sección 7.5) |
| Región | `eu-west-1` (Irlanda) | Las funciones de Vercel, en `dub1` (sección 3.3) |
| Ref y URL | `https://pmjtrcvdeqnnvglwkoyw.supabase.co` (migración ejecutada el 2026-11-24) | Va en `NEXT_PUBLIC_SUPABASE_URL` |
| Papel de esta base | La única: hace de pruebas hasta publicar y después es la de producción | Ver sección 3.4 |
| Plan del proyecto de Vercel | **Hobby**, en la cuenta de la clienta (decidido por Facundo) | Blob y Cron con los límites de Hobby (sección 14) |
| SMTP de Auth | Resend, guardado por Facundo el 2026-11-25 | El correo de recuperar la contraseña sale por Resend (sección 7.5) |
| Dominio del panel | `panel.vm-propiedades.es`, añadido al proyecto de Vercel con su CNAME en IONOS (2026-11-25) | ADR-002 y sección 3.5. Hasta publicar esta rama sirve la web vieja |

---

## 1. La idea en cinco líneas

1. **Los inmuebles pasan de `properties.json` a una tabla de Supabase con RLS**: lo publicado lo lee cualquiera y solo las cuentas del equipo escriben. Las reglas de `propertyRules.ts` las garantizan los disparadores de la base.
2. **Supabase Auth** da el correo y la contraseña, recuperarla con un enlace que se gasta al guardar, no al abrirlo, y cambiarla pidiendo la actual.
3. **La web lee la base en caché con la etiqueta `properties`**, y cada escritura del panel la invalida (`revalidateTag(..., { expire: 0 })`): sale en la siguiente recarga, sin desplegar. Si la base falla, se lanza el error y sigue en pie la última versión buena.
4. **Las fotos siguen en Vercel Blob** y **el panel pasa a `panel.vm-propiedades.es`** (ADR-002), en el mismo proyecto de Vercel. Por dentro, las rutas siguen en `/admin` y `/api/admin/*`, con su mismo contrato: las pantallas solo cambian sus enlaces, y lo demás está detrás de `src/lib/adminApi.ts`.
5. **Por qué así**: es lo más corto desde lo que ya hay. No hay datos que migrar y no hay ninguna clave secreta de Supabase en Vercel. Del DNS solo hace falta el CNAME del panel (ya puesto). Se aprovecha el modelo, las reglas y las pantallas que ya están hechos.

---

## 2. Lo que ya está hecho (no se rehace)

- **Modelo y reglas**, sin commit:
  - `src/data/properties.ts`:
    - cinco estados: `borrador`, `disponible` («Publicado» en el panel), `reservado`, `vendido` y `oculto`;
    - `MAX_FEATURED = 4`;
    - `updatedAt` y `publishedAt`;
    - la web solo ve `disponible`, `reservado` y `vendido`.
  - `src/lib/propertyRules.ts`: `missingForPublish`, `pickEditable`, `applyChange`, `canDelete`, `slugify`, `joinEs` y la lista blanca de dominios de fotos.
- **Rutas** `POST /api/admin/properties`, `PUT` y `DELETE /api/admin/properties/[slug]`, que devuelven `{ ok: true, property } | { error }` con el error en español.
- **Pantallas del panel**, en marcha por el `frontend`: `src/app/admin/(panel)/`, `src/app/admin/login/` y `src/components/admin/*`.
  - Todas las llamadas al servidor están en `src/lib/adminApi.ts`.
  - La compresión de fotos (JPEG de 1800 px) está en `src/lib/photos.ts`, y la cola de subida en `src/components/admin/photoQueue.ts`.
  - Lo que depende del motor está en `src/components/admin/settings.ts`: `accounts`, `recoverPasswordHref` y los textos de «Guardado».

---

## 3. Arquitectura

### 3.1 Las piezas

```
 Visitante ──► www.vm-propiedades.es ─────────────┐  Vercel, un proyecto, dos dominios, una app de Next 16
 Vale ───────► panel.vm-propiedades.es ───────────┤  proxy.ts reparte por dominio (ADR-002)
                                                  │
              ┌───────────────────────────────────┴───────────────┐
              ▼                                                   ▼
   Supabase (gratuito)                                   Vercel Blob (el almacén de hoy)
   ├─ Auth: correo y contraseña                          └─ fotos públicas, JPEG de 1800 px
   └─ Postgres con RLS: properties y team
              ▲
   Resend (SMTP de Auth): el correo de recuperar la contraseña
   Vercel Cron: /api/salud una vez al día, para que la base no se pause
```

- **Web pública**: lee la base con la clave publicable, sin cookies, dentro de `unstable_cache`. Sus páginas son estáticas con revalidación (ISR).
- **Panel**: la sesión va en cookies de `@supabase/ssr`, y cada lectura y escritura pasa por el RLS con el usuario de quien entra. Las rutas de `/api/admin/*` usan esa misma sesión: **no hay clave secreta de Supabase en ningún sitio**.
- **Fotos**: el navegador las comprime y las sube directamente a Blob con un token de un solo uso que firma `/api/admin/upload`, después de comprobar la sesión. En la base se guardan sus URL.

### 3.2 Entornos

| Entorno de Vercel | Base | Almacén de Blob | Para qué |
|---|---|---|---|
| Production (`main`) | la del proyecto creado | el de hoy | La web de verdad |
| Preview (ramas) | **la misma** | el mismo | Ver la rama con los datos reales. Antes de publicar está vacía, y en ella se hace la prueba completa (sección 11) |
| Development (local) | la misma (ver 3.4) | el mismo | Desarrollo |

Las vistas previas usan la base de producción a propósito:
- su build lee la base, y con una base de pruebas pausada fallaría cada vista previa;
- así se ven las fichas reales antes de publicar un cambio.

La regla, desde que la clienta tenga inmuebles: **en una vista previa no se borra ni se oculta nada de verdad**. Para probar con calma, una base de pruebas (3.4).

### 3.3 Región

Las funciones de Vercel, en la región de la base: es el viaje que se repite en cada consulta. Se pone en `vercel.json` (`"regions"`) **y** en Vercel → Settings → Functions.

| Supabase | Vercel |
|---|---|
| `eu-west-1` (Irlanda) | `dub1` |
| `eu-west-2` (Londres) | `lhr1` |
| `eu-west-3` (París) | `cdg1` |
| `eu-central-1` (Fráncfort) | `fra1` |
| `eu-central-2` (Zúrich) | `fra1` |

**Decidido (2026-11-25)**: la base está en `eu-west-1`, así que `vercel.json` lleva `"regions": ["dub1"]`, y Facundo ha puesto la misma en Vercel → Settings → Functions.

### 3.4 ¿Hace falta una segunda base, de pruebas?

**No, para este requerimiento.** La base que ya existe hace de pruebas mientras se construye:
- está vacía;
- la web de producción no la lee hasta el push a `main`;
- lo que se cree para probar se borra desde el propio panel antes de publicar.

Al publicar, esa misma base pasa a ser la de producción, sin copiar nada.

Una base de pruebas aparte (gratuita, unos 15 minutos con las mismas migraciones) solo compensa **cuando haya inmuebles reales de la clienta que proteger** y haya que probar una migración que toque datos o el panel con calma. Mientras no pase, sería:
- una segunda configuración de Auth (que, si la organización es de la clienta, tiene que guardar ella);
- una segunda copia de cada migración;
- un proyecto que se pausa cada semana y hay que despertar a mano.

~~**Única excepción**: si el proyecto creado está en la organización de FSMTECH y se decide que producción vaya en la de la clienta.~~ Ya no aplica: el proyecto está en la cuenta de la clienta (sección 0).

### 3.5 El panel va en `panel.vm-propiedades.es` (ADR-002)

**Cambiado el 2026-11-24.** Antes decía «el panel se queda en `/admin`», porque no se sabía dónde estaba el dominio. Está en IONOS y Facundo puede tocar su DNS, así que el panel tiene su propia dirección. El porqué y las alternativas, en [ADR-002](../decisiones/adr-002-panel-en-subdominio.md).

- **Un solo proyecto de Vercel con dos dominios** (`www` y `panel`), y una sola app de Next. Se publica todo junto y no hay variables, despliegues ni almacenes de Blob que duplicar. Dos proyectos obligarían a compartir el modelo y las reglas entre dos apps.
- **Las rutas no se mueven**: siguen en `src/app/admin/**` y `src/app/api/admin/**`. Las reparte `src/proxy.ts` según el dominio (sección 7.2):
  - en `panel.vm-propiedades.es`, `/<ruta>` se reescribe a `/admin/<ruta>`, con direcciones limpias: `/`, `/login`, `/nuevo`, `/<slug>/editar`, `/cuenta`, `/recuperar` y `/nueva-contrasena`. Lo que llegue con `/admin` delante va (308) a la misma ruta sin él;
  - en `www.vm-propiedades.es` y `vm-propiedades.es`, `/admin/*` va (308) al panel, por si la clienta tiene guardada la dirección vieja, y `/api/admin/*` da 404;
  - en cualquier otro dominio (las vistas previas `*.vercel.app` y `localhost`), el panel se abre en `/admin/*`, tal cual, para poder probarlo.
- **Los enlaces del panel salen ya en la forma de cada dominio**, sin pasar por el 308: el prefijo (ninguno o `/admin`) se calcula en el servidor con el dominio de la petición, y los componentes lo leen con `usePanelHref()` (`src/components/admin/PanelLinks.tsx`, `src/lib/panelHost.ts`).
- **Las cookies de la sesión no llevan `Domain`**: solo las recibe el panel. La web no las ve nunca, y su caché no se toca: el proxy ni siquiera pasa por las páginas de `www`.
- **La cabecera, el pie y el botón de WhatsApp de la web** se esconden en el panel mirando el segmento de la ruta (`useSelectedLayoutSegment()`), no la dirección: en `panel.` la dirección no lleva `/admin`.
- **No sale en Google**: `X-Robots-Tag: noindex, nofollow` en todo lo que no sea `www` (sección 8.4).
- **La dirección del panel** está en `site.panelUrl` de `src/lib/site.ts`, junto a `site.url`.
- **Hecho (2026-11-25)**: el dominio está añadido al proyecto de Vercel, con su CNAME `panel` en IONOS. Hasta que se publique esta rama sirve la web vieja.

## 4. Modelo de datos

Una migración, `supabase/migrations/<AAAAMMDDHHMMSS>_inmuebles.sql`, y su comprobación repetible, `supabase/comprobaciones/inmuebles.sql`. Las columnas van en inglés y en `snake_case`, como el modelo de TypeScript, para que la lectura no necesite traducción: `updated_at` y `published_at` se piden con alias (`updatedAt:updated_at`).

### 4.1 `public.properties`

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | No cambia. Para lo que venga (visitas, estadísticas) |
| `slug` | `text not null unique` | `check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80)`. Lo manda la ruta con `slugify(title)`, y **la base lo hace único** (`-2`, `-3`…). **No cambia nunca**, ni en borrador, como hoy en `applyChange` |
| `title` | `text not null` | `check (char_length(btrim(title)) between 1 and 120)` |
| `type` | `text not null default 'piso'` | `check (type in ('piso','atico','chalet','loft','apartamento','local'))`. Los mismos seis de `PropertyType` |
| `operation` | `text not null default 'venta'` | `check (operation in ('venta','alquiler'))` |
| `status` | `text not null default 'borrador'` | `check (status in ('borrador','disponible','reservado','vendido','oculto'))` |
| `price` | `numeric(12,2) not null default 0` | `check (price >= 0 and price <= 999999999)`. En alquiler, al mes |
| `zone` | `text not null default ''` | `check (char_length(zone) <= 80)`. Texto libre |
| `address` | `text not null default ''` | `check (char_length(address) <= 160)`. Se ve en la ficha |
| `sqm` | `integer not null default 0` | `check (sqm between 0 and 100000)` |
| `rooms` | `smallint not null default 0` | `check (rooms between 0 and 50)` |
| `baths` | `smallint not null default 1` | `check (baths between 0 and 20)` |
| `description` | `text not null default ''` | `check (char_length(description) <= 5000)` |
| `features` | `text[] not null default '{}'` | Como mucho 40, cada una de 1 a 120 caracteres sin espacios a los lados (disparador) |
| `images` | `text[] not null default '{}'` | Como mucho 60, sin repetir, todas de Vercel Blob (disparador). **La primera es la portada** |
| `featured` | `boolean not null default false` | Solo con `status = 'disponible'`, y como mucho 4 (disparador) |
| `published_at` | `timestamptz` | La primera vez que sale en la web. Desde entonces no vuelve a borrador |
| `created_at` | `timestamptz not null default now()` | |
| `updated_at` | `timestamptz not null default now()` | Lo pone el disparador. Es el `lastmod` del sitemap |

Sin más índices que los de `id` y `slug`: con decenas de inmuebles no hacen falta.

**Añadido en B2**:
- Las restricciones llevan nombre (`properties_<campo>_valido`), para que el `23514` diga cuál en el log.
- Dos `check` más, que el disparador ya cumple siempre, por si alguien escribe con los disparadores apagados (una restauración, por ejemplo):
  - `properties_destacada_solo_disponible`: `not featured or status = 'disponible'`;
  - `properties_publicado_con_fecha`: lo que está en la web tiene `published_at`.

**Las fotos van en un `text[]` y no en una tabla aparte, a propósito.**
- Es lo que ya usan el modelo (`images: string[]`), el formulario y `adminApi.ts`.
- Guardar el inmueble guarda sus fotos y su orden de una vez.
- «Publicar exige una foto» es comprobar `cardinality(images) >= 1`.

Una tabla `photos` solo compensaría con datos por foto (medidas, texto alternativo propio), y hoy no hacen falta: las fichas usan `next/image` con `fill`.

### 4.2 `public.team`: quién puede escribir

| Columna | Tipo |
|---|---|
| `user_id` | `uuid primary key references auth.users(id) on delete cascade` |
| `name` | `text not null` |
| `created_at` | `timestamptz not null default now()` |

- Solo se escribe desde el editor SQL, al dar de alta una cuenta.
- No basta con tener sesión: si algún día se abrieran las altas por error, una cuenta nueva no podría tocar nada.

### 4.3 Funciones y disparadores

**`public.is_team() returns boolean`**:
- `language sql stable security definer set search_path = ''`;
- `select exists (select 1 from public.team where user_id = (select auth.uid()))`;
- `revoke execute … from public, anon` y `grant execute … to authenticated`.

**`properties_before_write`**, `before insert or update`, en este orden:
1. **Lo que no se cambia desde fuera.**
   - En `update`: `new.id := old.id`, `new.created_at := old.created_at` y `new.published_at := old.published_at`. Si `new.slug <> old.slug`, el error `vm:slug_fijo`.
   - En `insert`: `new.published_at := null`, `new.created_at := now()` y el `slug` libre: mientras exista, `left(base, 76) || '-' || n`, con `n` desde 2.
   - **Cambiado en B2**, el `slug` libre:
     - `base` es el `slug` que llega o, si llega vacío o no llega, `inmueble`;
     - mientras exista, `rtrim(left(base, 79 - cifras de n), '-') || '-' || n`. Con `left(base, 76)`, una base con un guion en la posición 76 daba `…--2`, que no cumple el `check` del slug, y con `n` de cuatro cifras pasaba de 80;
     - antes, `pg_advisory_xact_lock(hashtext('properties.slug'))`: sin él, dos altas a la vez con el mismo título se llevarían el mismo slug, y la segunda daría `23505` (un 500).
2. `new.updated_at := now()`.
3. **Las listas**:
   - `features`: como mucho 40, y cada una igual a su `btrim`, con 1 a 120 caracteres. Si no, `vm:caracteristicas`.
   - `images`: como mucho 60, sin repetir, y cada una con `^https://[a-z0-9-]+\.public\.blob\.vercel-storage\.com/`, sin distinguir mayúsculas (`!~*`): el id del almacén lo pone Blob y todavía no se ha visto ninguno real. Si no, `vm:fotos_no_validas`.
4. **No vuelve a borrador**: si `new.status = 'borrador'` y `new.published_at is not null`, `vm:no_vuelve_a_borrador`.
5. **Publicar**: si `new.status in ('disponible','reservado','vendido')`, se reúne lo que falta, en este orden:
   - `titulo` (vacío tras `btrim`);
   - `zona`;
   - `direccion`;
   - `precio` (≤ 0);
   - `superficie` (≤ 0);
   - `descripcion`;
   - `fotos` (ninguna).
   
   Si falta algo, `vm:faltan:<lista separada por comas>`. Si no, `new.published_at := coalesce(new.published_at, now())`. Es exactamente `missingForPublish` de hoy: ni el tipo ni las habitaciones son obligatorios.
6. **Destacadas**:
   - si `new.status <> 'disponible'`, `new.featured := false`;
   - si `new.featured` y antes no lo estaba (en `insert`, o si `old.featured and old.status = 'disponible'` era falso): `pg_advisory_xact_lock(hashtext('properties.featured'))`, contar las demás con `featured and status = 'disponible'` y, si son 4 o más, `vm:destacadas_llenas`.
   
   El 4 es `MAX_FEATURED` de `properties.ts`: **si cambia uno, cambia el otro**.

**`properties_before_delete`**, `before delete`: si `old.status not in ('borrador','oculto')`, `vm:no_se_puede_borrar`.

Los errores se lanzan con `raise exception` (código `P0001`) y el mensaje empieza siempre por `vm:`. Los dos disparadores son `security invoker`: la clienta, que es del equipo, ve todas las filas, así que el slug libre y la cuenta de destacadas son correctos. Las funciones no se ejecutan desde la API: `revoke execute … from public, anon`. Si la comprobación (4.6) demuestra que `authenticated` necesita `execute` para que salten, se le da.

**Decidido en B2**: las funciones de los disparadores se quitan también a `authenticated` (`revoke all … from public, anon, authenticated`). Postgres solo comprueba ese permiso al crear el disparador, no cuando salta. Lo demuestra la comprobación: en los casos 1 y 4, el equipo da de alta inmuebles. Si saliera `42501 permission denied for function properties_before_write`, el plan B es `grant execute` de las dos a `authenticated`, en una migración nueva y cambiando la sección 6 de la migración y la comprobación 12.4. Las tres funciones llevan `set search_path = ''`.

### 4.4 Quién ve qué y quién escribe qué (RLS)

RLS activado en las dos tablas.

| Tabla | `anon` (visitante) | `authenticated` fuera de `team` | `team` |
|---|---|---|---|
| `properties` | `select` si `status in ('disponible','reservado','vendido')` | nada | `select`, `insert`, `update` y `delete` (borrar solo borradores y ocultos: lo para el disparador con un error claro, no el RLS, que fallaría en silencio) |
| `team` | nada | `select` de su propia fila (`user_id = (select auth.uid())`) | lo mismo |

Las políticas usan `(select public.is_team())` y `(select auth.uid())`, para que Postgres las calcule una vez por consulta y no una por fila.

En la migración son seis, una por papel y orden: «Visitante: lo publicado» (`select`, `anon`), «Equipo: lee todo», «Equipo: crea», «Equipo: cambia» y «Equipo: borra» (`authenticated`), y en `team`, «Cada cuenta ve su fila». La del visitante no llama a `is_team()`, que `anon` no puede ejecutar.

### 4.5 Permisos de tabla (`grant`)

Se escriben todos:
- Supabase no los da solos a las tablas nuevas desde 2026 (fuente 7).
- Un proyecto recién creado puede traer todavía los de antes: **primero `revoke all … from public, anon, authenticated`**, y después solo lo que haga falta.

```sql
grant select (id, slug, title, type, operation, status, price, zone, address, sqm, rooms, baths,
              description, features, images, featured, published_at, updated_at)
  on public.properties to anon, authenticated;
grant insert (slug, title, type, operation, status, price, zone, address, sqm, rooms, baths,
              description, features, images, featured)
  on public.properties to authenticated;
grant update (title, type, operation, status, price, zone, address, sqm, rooms, baths,
              description, features, images, featured)
  on public.properties to authenticated;
grant delete on public.properties to authenticated;
grant select on public.team to authenticated;
grant all on public.properties, public.team to service_role;
```

- **`select` por columnas**: el RLS filtra filas, no columnas. Una columna privada que se añada mañana (el propietario, unas notas) no queda abierta sin querer. Por eso **toda lectura nombra sus columnas: nunca `select('*')`**, que fallaría con `42501`.
  - **También al escribir** (para B3): `.insert(…).select('<columnas>')` y `.update(…).select('<columnas>')`. Un `.select()` sin columnas es `select=*`, pide también `created_at` y da `42501`.
- **`insert` y `update` por columnas**: desde la API nadie puede escribir `slug` (después de crearlo), `published_at`, `updated_at`, `created_at` ni `id`. El disparador lo vuelve a garantizar para quien entre por SQL.

### 4.6 Comprobación (`supabase/comprobaciones/inmuebles.sql`)

Un script dentro de `begin … rollback` que crea sus propios usuarios y filas de prueba, cambia de papel con `set local role` y `set local request.jwt.claims`, y termina con una fila `BIEN` o con lo que ha fallado. Casos:

1. `anon` ve un inmueble `disponible`, uno `reservado` y uno `vendido`, y no ve uno `borrador` ni uno `oculto`.
2. `anon`:
   - con las columnas nombradas, lee;
   - con `select *`, falla (`42501`);
   - al escribir, falla (`42501`).
3. `authenticated` fuera de `team` no ve nada y no puede insertar.
4. `team`:
   - inserta un borrador con solo el título;
   - otro con el mismo título sale con `-2`;
   - cambiar el `slug` falla.
5. Publicar sin precio ni fotos da `vm:faltan:precio,fotos` (con un título, una zona, una dirección, una superficie y una descripción puestos).
6. Publicar completo pone `published_at`. Volver a `borrador` da `vm:no_vuelve_a_borrador`. Pasar a `oculto` y volver a `disponible` funciona y conserva el `published_at`.
7. La quinta destacada da `vm:destacadas_llenas`. Una destacada que pasa a `reservado` deja de estarlo.
8. Borrar una `disponible` da `vm:no_se_puede_borrar`, y borrar una `oculto` funciona.
9. Una foto de otro dominio, o repetida, da `vm:fotos_no_validas`. 41 características dan `vm:caracteristicas`.
10. `authenticated` no puede escribir `published_at` ni `updated_at` (`42501`).
11. `anon` no puede ejecutar `is_team()`.
12. La lista de permisos sale de `information_schema.role_column_grants` y `role_table_grants`, y coincide con 4.5.

**Cómo quedó en B2** (cómo ejecutarla y qué tiene que salir, en `docs/base-de-datos.md`):
- **Cuatro papeles**: el visitante (`anon`), una cuenta fuera del equipo, una del equipo y el dueño de la base, para lo que solo puede venir por SQL. Las tres cuentas de prueba se crean en `auth.users` (con correos `@prueba.invalid`) y se deshacen con todo lo demás.
- **No deja nada aunque se quite el `rollback` del final**: el bloque que escribe termina siempre en un error que lo deshace, y los resultados se apuntan después.
- **Cambiar el `slug`** (caso 4): desde la API es `42501`, porque `authenticated` no tiene `update` en esa columna. `vm:slug_fijo` solo sale por SQL, y se prueba como dueño de la base.
- **«Conserva el `published_at`»** (caso 6): dentro de una transacción `now()` no cambia, así que publicar dos veces da la misma hora. Lo que de verdad lo demuestra es el caso 10: ni el dueño de la base puede cambiar `published_at` ni `created_at`.
- **Las destacadas** (caso 7): cuenta las que ya hay y crea las que falten hasta 4. Así se puede repetir con inmuebles de verdad sin tocarlos.
- **Más casos** de los doce, dentro de cada uno: el `-3`, el slug de 80 caracteres, el `inmueble` cuando no llega slug, `team` cerrado a todos, solo la fila propia de `team`, una publicada que se queda sin descripción, `http`, un dominio que solo empieza como el de Blob, 60 fotos y 40 características que sí valen, los `check` (`23514`), y en el 12, las funciones, el RLS, las políticas, los disparadores y las restricciones.
- **El resultado**: una sola fila `BIEN` con el número de comprobaciones, o una fila `MAL` por cada fallo.

### 4.7 Qué hace la base con cada error, y qué dice el panel

`src/lib/propertyErrors.ts` traduce. Los mensajes son los de `applyChange` de hoy.

| Viene de la base | HTTP | Mensaje |
|---|---|---|
| `vm:faltan:<lista>` | 422 | `Para que salga en la web falta ${joinEs(...)}.`, con `titulo` → «el título», `zona` → «la zona», `direccion` → «la dirección», `precio` → «el precio», `superficie` → «la superficie», `descripcion` → «la descripción» y `fotos` → «al menos una foto» |
| `vm:no_vuelve_a_borrador` | 422 | «Un inmueble que ya ha salido en la web no vuelve a borrador. Para quitarlo de la web, ocúltalo.» |
| `vm:destacadas_llenas` | 422 | «Ya hay 4 inmuebles en la portada. Quita uno antes de destacar este.» |
| `vm:no_se_puede_borrar` | 409 | El de hoy: «Este inmueble está {estado} y sale en la web. Para borrarlo, ocúltalo antes: así nunca se borra nada por error.» |
| `vm:fotos_no_validas` | 422 | «Alguna foto no se ha subido bien. Quítala y vuelve a subirla.» |
| `vm:caracteristicas` | 422 | «Revisa las características: como mucho 40, y cada una de 120 caracteres como mucho.» |
| `vm:slug_fijo` | 422 | «La dirección de un inmueble en la web no se puede cambiar.» |
| `23514` (un `check`) | 422 | «Hay un dato que no es válido. Revisa el formulario.» (y el nombre de la restricción, al log) |
| `42501` | 403 | «Tu cuenta no tiene permiso para cambiar inmuebles.» |
| Lo demás | 500 | «No se ha podido guardar. Vuelve a intentarlo en un momento.» (y el error, al log) |

---

## 5. Fotos

### 5.1 Vercel Blob o Supabase Storage

| | **Vercel Blob (recomendado)** | Supabase Storage |
|---|---|---|
| Coste | Con el proyecto en un equipo Pro, sale del crédito mensual incluido. Unos 0,5 GB y unos GB de descarga al mes son céntimos (en el ejemplo de Vercel: 0,023 $/GB-mes de almacenamiento y 0,05 $/GB de transferencia en `iad1`). En Hobby: 1 GB, 10 GB de transferencia, 10.000 operaciones simples y 2.000 avanzadas al mes gratis, pero Hobby no admite uso comercial (fuente 1) | 0 € dentro del plan gratuito (fuente 2) |
| Límites | Ninguno práctico en Pro (pago por uso). En Hobby, si se pasa, Blob deja de funcionar 30 días | 1 GB de archivos y 5 + 5 GB de transferencia al mes, **compartidos con la base**. Si se pasa una y otra vez, Supabase restringe el proyecto entero, panel incluido |
| Trabajo | **Ninguno en pantallas**: `uploadPhoto` de `adminApi.ts` no cambia. En el servidor, `/api/admin/upload` comprueba la sesión (0,5 h) | **2–3 h más**: el *bucket* y sus políticas en la migración, `uploadPhoto` reescrita con un cliente de Supabase en el navegador, y el dominio nuevo en `remotePatterns` y en `isAllowedImageUrl` |
| Quién puede subir | `/api/admin/upload`, después de comprobar la sesión y `team`. `BLOB_READ_WRITE_TOKEN` (ya está en Vercel) firma la subida | El RLS de `storage.objects`. Sin secretos en Vercel |
| Fotos huérfanas | Las mismas causas con los dos (subir y no guardar, quitar una foto, borrar un inmueble). Se borran desde el servidor (5.4). Cuestan céntimos | Las mismas. Supabase no borra archivos desde SQL: también se borran desde la aplicación. Se pueden listar con SQL, pero gastan el cupo gratuito |
| Dónde están | En el equipo de Vercel, junto a la web | En la organización de Supabase, junto a los datos |

**Blob, porque**:
- ya funciona;
- no obliga a rehacer nada de lo que está haciendo el `frontend`;
- no gasta el cupo gratuito de Supabase, que es lo que tiene que durar años;
- las huérfanas se resuelven igual en los dos.

Storage se elegiría si se quisiera **cero secretos en Vercel** o **todo en la organización de la clienta**. Hoy no compensa las 2–3 h ni el riesgo de agotar el cupo.

### 5.2 Cómo se suben (casi como hoy)

1. El navegador comprime la foto (`compressPhoto`, de `src/lib/photos.ts`).
2. La sube con `upload()` de `@vercel/blob/client`. Pide el token a `/api/admin/upload`, que antes de dárselo:
   - comprueba la sesión y `team`; si no, 401;
   - exige que la ruta empiece por `inmuebles/`;
   - acepta `image/jpeg`, `image/png` e `image/webp`, como mucho de 15 MB;
   - usa `addRandomSuffix: true` y `cacheControlMaxAge: 31536000` (un año), porque el nombre no se repite nunca.
3. La URL que devuelve se añade a la lista de fotos del formulario. **Se guarda en la base al pulsar «Guardar»**, con el resto del inmueble.

Se quita `onUploadCompleted`, que solo escribía en el log: sin él, Vercel no llama de vuelta a la ruta, y la ruta se puede proteger entera.

### 5.3 Fotos en la web

Siguen con `next/image` y el `remotePatterns` de hoy. `isAllowedImageUrl` deja de aceptar `images.unsplash.com` para los inmuebles: así el TypeScript y la base dicen lo mismo. Unsplash sigue en `remotePatterns`, porque lo usan `/` y `/quienes-somos`.

### 5.4 Fotos huérfanas

- **Al borrar un inmueble** (`DELETE`), después de borrar la fila, `del()` de todas sus fotos.
- **Barrido después de cada escritura** (`POST`, `PUT` y `DELETE`, dentro de `after()` de `next/server`, que en una ruta puede usar las cookies):
  - lista el almacén con `list({ prefix: 'inmuebles/' })`, página a página;
  - lee las `images` de **todos** los inmuebles con la sesión (`team` los ve todos);
  - borra con `del()` lo que no esté en ningún inmueble y tenga más de 48 horas (`uploadedAt`). Las 48 horas protegen una foto recién subida que todavía no se ha guardado.
  
  Si falla, solo se escribe en el log: el guardado ya se ha hecho.
- **Lo que queda**: las fotos de una subida abandonada, hasta el siguiente guardado. Cuestan céntimos y no son datos personales.
- **Coste**: una operación avanzada por cada 1.000 fotos y guardado. Borrar es gratis (fuente 1).

**Cómo quedó en B3** (`src/lib/photoCleanup.ts`): el borrado al quitar fotos y al borrar un inmueble y el barrido son una sola pasada, la misma en las tres rutas, dentro de `after()`:
1. Lista el almacén bajo `inmuebles/`, página a página. Si falla, no borra nada.
2. Comprueba con `is_team()` que quien ha guardado es del equipo. **Si no lo es, no borra nada**: el RLS le devolvería una cartera vacía sin dar error, y se borraría todo.
3. Lee las `images` de todos los inmuebles, de 1.000 en 1.000 y con la cuenta exacta (`count: 'exact'`). **Si no ha leído tantos como dice la base, no borra nada.**
4. Borra lo que no está en ningún inmueble (sea del estado que sea) y, o bien se acaba de quitar (las fotos que ese `PUT` ha quitado, las de un inmueble borrado), o bien tiene más de 48 horas. Una foto que esté en otro inmueble no se borra nunca, aunque se haya quitado de este.

Sin `BLOB_READ_WRITE_TOKEN` (en local) no lo intenta. Probado con un Blob de mentira (pruebas unitarias y el recorrido de B3).

**Hasta publicar**: el almacén de Blob es el mismo que usa el panel viejo de producción, que guarda sus fotos también bajo `inmuebles/`. Una foto que la clienta subiera ahí, guardada en `properties.json` y no en la base, la borraría el barrido de un guardado en la vista previa a las 48 horas. Hoy `properties.json` está vacío: basta con que la clienta no use el panel viejo hasta la publicación (como dice ya la sección 13).

---

## 6. Lectura pública y caché

### 6.1 Sin `cacheComponents`

`next.config.ts` no lo tiene, y no se activa. Se usa el modelo «anterior», documentado y vigente en Next 16 (fuente 3):
- **`cacheComponents` obliga a repasar todas las páginas de la web.** Con él, `generateStaticParams` tiene que devolver al menos un parámetro, o el build falla (`generate-static-params.md`, «With Cache Components»), y hoy el catálogo está vacío.
- **En Vercel, la caché de `use cache` vive en la memoria de cada instancia.** Sus entradas no duran entre peticiones (`use-cache.md`, «Runtime caching considerations»). `unstable_cache` persiste entre peticiones y despliegues (`unstable_cache.md`).
- **La documentación marca `unstable_cache` como sustituido por `use cache`.** Se acepta: pasar a `use cache` más adelante es cambiar `src/lib/propertiesStore.ts` y `next.config.ts`, sin tocar la base.

### 6.2 La capa de lectura: `src/lib/propertiesStore.ts`

Es `server-only`.

```ts
// Web pública: clave publicable, sin cookies, en caché con la etiqueta 'properties'
export const PROPERTIES_TAG = "properties";
export async function getPublicProperties(): Promise<Property[]>;              // disponible, reservado y vendido
export async function getProperty(slug: string): Promise<Property | undefined>; // de la lista anterior
export async function getFeatured(): Promise<Property[]>;                       // featured y disponible, ≤ MAX_FEATURED
export async function getZones(): Promise<string[]>;                            // las de los públicos, ordenadas

// Panel: con la sesión (RLS), sin caché
export async function readPropertiesList(): Promise<{ list: Property[] }>;       // los cinco estados, por updated_at desc
export async function readProperty(slug: string): Promise<Property | null>;
```

- **`getPublicProperties`** es `unstable_cache(leer, ['properties-public'], { tags: ['properties'], revalidate: 3600 })`.
  - Hace **una sola consulta**, con las columnas nombradas y los alias `updatedAt:updated_at,publishedAt:published_at`, ordenada por `published_at desc`.
  - `getProperty`, `getFeatured` y `getZones` salen de esa lista.
  - Con decenas de inmuebles la entrada pesa decenas de KB. **El límite de la caché de datos es de 2 MB**, y por encima Next no la guarda y solo lo avisa en el log. Si el catálogo pasara de unos 100 inmuebles, se parte.
- **Si la base devuelve un error, o `data` no llega, se lanza**, nunca `[]`. `unstable_cache` no guarda lo que lanza, y una regeneración que falla deja servir la última versión buena (`incremental-static-regeneration.md`, línea 467).
- **`readPropertiesList`** mantiene el nombre y la forma (`{ list }`) de la función de `github.ts`, que ya usa `src/app/admin/(panel)/page.tsx`: allí solo cambia el `import`.

**Comprobado en B3: la caché de `unstable_cache` dura entre builds** (`.next/cache`, «across requests and deployments»), y al revalidar una entrada vieja, si la base falla, sigue dando lo último bueno. Con una lectura ya guardada, el build ni siquiera va a la base. Por eso:
- `getPublicProperties()` comprueba las variables **fuera** de la caché (`getSupabaseEnv()`): si faltan, falla siempre, también el build;
- la URL de la base va en la clave de la caché: otra base, o una dirección que no responde, no aprovecha lo guardado de esta, y el build falla (comprobación k).

Lo que queda: con la misma base caída y una lectura guardada, el build pasa con el último catálogo bueno, nunca con uno vacío.

Las escrituras usan dos piezas más del mismo archivo: `toPropertyRow()` (de `pickEditable` a las columnas que se pueden escribir) e `invalidatePublicCatalog()` (6.4).

### 6.3 Las páginas

| Archivo | Cambio |
|---|---|
| `src/app/page.tsx` | `async` y `await getFeatured()`. `export const revalidate = 3600` |
| `src/app/inmuebles/page.tsx` | `await getPublicProperties()` y `await getZones()`. `revalidate = 3600` |
| `src/app/inmuebles/[slug]/page.tsx` | `generateStaticParams` devuelve `[]`: cada ficha se genera en su primera visita y se guarda, y el build no depende de cuántas haya. `await getProperty(slug)` en la página y en `generateMetadata`. `revalidate = 3600`. Un borrador, un oculto o un slug que no existe dan `notFound()`, un 404 de verdad |
| `src/app/alquiler/page.tsx` | `await getPublicProperties()` filtrado por `operation === 'alquiler'`. `revalidate = 3600` |
| `src/app/sitemap.ts` | `async`, y las fichas con `lastModified: p.updatedAt`, la fecha real. Las rutas fijas no se tocan aquí (las lleva el `seo`). `revalidate = 3600` |
| `src/data/properties.ts` | Fuera el `import` del JSON, `normalizeProperty` y los `properties`, `zones`, `getProperty` y `getFeatured` síncronos. Se quedan los tipos, las etiquetas, `isPublic`, `publicStatuses`, `isPropertyStatus` y `MAX_FEATURED` |

Las 3.600 s son la red de seguridad: si una invalidación no llegara, la página se rehace sola en una hora como mucho. La invalidación normal es inmediata (6.4).

### 6.4 Invalidar al guardar

- Cada `POST`, `PUT` y `DELETE` de inmuebles, si va bien, llama a `revalidateTag('properties', { expire: 0 })` **antes de responder**. Con `{ expire: 0 }`, la siguiente visita espera a los datos nuevos en vez de ver los de antes (`revalidateTag.md`, «Revalidation Behavior»). `updateTag` haría lo mismo, pero solo vale en Server Actions, y aquí son rutas (`updateTag.md`).
- **Comprobación obligatoria en B3**: un borrador publicado tiene que pasar de 404 a 200 en la **primera** recarga de su ficha. Si el 404 se quedara guardado, se añade `revalidatePath('/inmuebles/<slug>')` en los cambios de estado.
- **Resultado (B3, con `next start` y un Supabase de mentira en local)**:
  - el 404 de una ficha que todavía no existe **sí** se guarda (`x-nextjs-cache: HIT`), y lleva la etiqueta `properties`, porque la página ha leído el catálogo;
  - **solo con `revalidateTag`**, la primera recarga después de publicar ya da 200 (`MISS`: espera a los datos nuevos);
  - **con `revalidatePath` además, la primera recarga volvía a dar el 404** (`STALE`): `revalidatePath` marca la página como vieja pero servible, y gana.

  Así que **no se usa `revalidatePath`**: el plan B de arriba lo estropea. Lo mismo al ocultar: 404 en la primera recarga. En Vercel, la caché es otra (la suya, no `.next/cache`): se vuelve a comprobar en P1.

### 6.5 Los textos del panel

En `src/components/admin/settings.ts`:
- `accounts: true`;
- los `savedNotices` dejan de decir «en un par de minutos»: «Guardado. Ya se ve en la web.», «Guardado.» y «Publicado. Ya está en la web.».

---

## 7. Acceso (Supabase Auth)

### 7.1 Clientes de Supabase

| Archivo | Para qué |
|---|---|
| `src/lib/supabase/env.ts` | Lee `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` por su nombre completo, y lanza un error claro si faltan. Avisa también si la clave no empieza por `sb_publishable_` |
| `src/lib/supabase/public.ts` | `createClient` de `@supabase/supabase-js` con `auth: { persistSession: false, autoRefreshToken: false }`. Sin cookies, para la caché y `/api/salud` |
| `src/lib/supabase/server.ts` | `createServerClient` de `@supabase/ssr` con las cookies de `next/headers` (`getAll` y `setAll`; en un Server Component, el `setAll` se traga el error y la sesión la refresca `proxy.ts`). Uno nuevo por petición |

No hay cliente de navegador: el panel solo habla con `/api/admin/*`.

Dependencias:
- `@supabase/ssr` 0.12 o superior;
- `@supabase/supabase-js` 2.102 o superior, la primera con `current_password` en `updateUser` (fuente 4).

### 7.2 `src/proxy.ts`

**Cambiado en B3** por el panel en su subdominio (3.5 y ADR-002). El proxy reparte por el dominio (`Host`) y protege el panel.

- **El `matcher`**: `/admin/:path*` y `/api/admin/:path*` en todos los dominios, y, solo en `panel.(vm-propiedades.es|localhost)` (con `has: [{ type: 'host' }]`), todo menos `/_next/*`, el resto de `/api/*` y los archivos (`/logo.png`, `/robots.txt`…). Las páginas de `www` no pasan por el proxy: su caché no depende de él.
- **En `panel.`**: `/<ruta>` se reescribe a `/admin/<ruta>`; lo que llegue con `/admin` delante, 308 a la misma ruta sin él.
- **En `www` y `vm-propiedades.es`**: `/admin/*`, 308 a `https://panel.vm-propiedades.es/<ruta>`; `/api/admin/*`, 404.
- **En cualquier otro dominio** (vistas previas, `localhost`): el panel en `/admin/*`, tal cual.
- **En cada petición del panel**: `createServerClient` con las cookies de la petición y de la respuesta, y `getClaims()`, que refresca el token si ha caducado. Nunca `getSession()` en el servidor: no comprueba nada. Las cookies nuevas, y las cabeceras que `@supabase/ssr` pide al escribirlas, van en la respuesta (también en las redirecciones).
- **Libres**, sin sesión (rutas internas):
  - `/admin/login`, `/admin/recuperar` y `/admin/nueva-contrasena`;
  - `/api/admin/login`, `/api/admin/password/forgot` y `/api/admin/password/reset`. En estas tres el proxy ni siquiera crea el cliente: escriben las cookies ellas mismas.
- **Sin sesión**: `/api/admin/*` responde 401 `{ error: "No autenticado" }`, y las pantallas llevan a `/login?next=<ruta>` (en `panel.`) o a `/admin/login?next=<ruta>` (en los demás).
- **Con sesión en la pantalla de entrar**: lleva a la portada del panel (`/` o `/admin`).
- **`X-Robots-Tag: noindex, nofollow`** en todas sus respuestas del panel.
- Las redirecciones salen con `Location` relativo (Next lo hace solo cuando es el mismo dominio), así que en el navegador se quedan en el dominio en que se está.
- El proxy no mira `team`: lo hacen las pantallas, las rutas y la base.

Con las claves de firma asimétricas del proyecto (Settings → JWT Keys), `getClaims()` comprueba la firma en local, sin ir a la red.

### 7.3 Comprobar quién llama: `src/lib/panelAuth.ts`

- `getPanelUser()`, envuelta en `cache()` de React:
  - `getClaims()`;
  - si hay `sub`, su fila de `team` (el RLS solo le deja ver la suya);
  - devuelve `{ id, email, name } | null`.
  
  La usan el layout de `(panel)`, que lleva a `/admin/login` si es `null`, y «Mi cuenta», que enseña el correo.

  **Cómo quedó en B3**: debajo está `getPanelAccess()` (también con `cache()`), que distingue `ok`, `no-session`, `no-team` y `error`. El layout de `(panel)` lleva a entrar si no hay sesión, y si la sesión no es del equipo (o no se ha podido comprobar) enseña un aviso con «Salir» en vez de llevar a entrar: llevar a entrar daría un bucle, porque la pantalla de entrar con sesión lleva a la portada. **Cada página del panel vuelve a mirar `getPanelUser()`** (sin consulta extra, por `cache()`): Next pinta las páginas a la vez que el layout, y un layout que no enseña `children` no impide que la página se ejecute ni que salga en el RSC Payload (`authentication.md`, «Layouts and auth checks»). Comprobado: sin esa línea, la lista vacía de una cuenta fuera del equipo iba en el HTML. `getPanelBase()` da el prefijo de los enlaces según el dominio.
- `requireTeam(request)`, para las rutas que escriben:
  - 401 sin sesión, 403 si no es de `team`;
  - **403 si la cabecera `Origin` existe y no es el propio dominio** (`rejectCrossOrigin`, que usan también `login`, `logout` y las tres de la contraseña). `requireSession(request)` hace lo mismo sin mirar `team`, para cambiar la contraseña.
  
  Lo que de verdad protege de otra web es que las cookies de `@supabase/ssr` van con `SameSite=Lax` de serie: no se cambia.

### 7.4 Los flujos

**Cuentas**: las altas están cerradas («Allow new users to sign up» apagado).
- Facundo crea cada cuenta en Authentication → Users → *Add user* → *Create new user*, con su correo, una contraseña al azar que no guarda y *Auto Confirm* marcado. Después añade su fila en `team` (sección 12, paso 4).
- La primera contraseña la elige la clienta con «¿Has olvidado la contraseña?». Así no hace falta montar invitaciones, y de paso se prueba el flujo de recuperar.

**Entrar**:
- `signInWithPassword` y después `is_team`.
- Si no es del equipo, `signOut()` y el mismo mensaje que con la contraseña mal. No se dice qué cuentas existen.

**Recuperar**:
1. En `/recuperar` del panel, el correo. `POST /api/admin/password/forgot` llama a `resetPasswordForEmail(email)` (con el cliente sin sesión: no hace falta guardar nada en cookies) y **responde siempre lo mismo**, exista o no la cuenta. Solo dice otra cosa con un correo sin forma de correo (400) o con el límite de envíos (429).
2. El correo lleva a `https://panel.vm-propiedades.es/nueva-contrasena?token_hash=…&type=recovery` (plantilla en 7.5).
3. **La página no hace nada al cargar.** Los antivirus del correo abren los enlaces, y si el enlace se gastara al abrirlo, no serviría.
4. Al pulsar «Guardar», `POST /api/admin/password/reset`:
   - **primero comprueba la contraseña** (10 caracteres o más, 72 o menos), para no gastar el enlace con una contraseña que no vale;
   - después `verifyOtp({ type: 'recovery', token_hash })`, que deja la sesión en las cookies;
   - después `updateUser({ password })`. Una sesión de recuperación no necesita la contraseña actual aunque esté activado «Require current password»: el código de Supabase Auth lo salta con `session.IsRecovery()` (fuente 5);
   - por último, `signOut({ scope: 'others' })`, que cierra los demás dispositivos.

   **Añadido en B3**: si `updateUser` falla después de gastar el enlace (la misma contraseña de antes, por ejemplo), la sesión de recuperación ya está en las cookies. Al volver a intentarlo con otra, `verifyOtp` da «gastado», y entonces se usa esa sesión si tiene menos de 15 minutos. Supabase solo deja cambiar la contraseña sin la actual a una sesión de recuperación (con «Require current password» activado): a cualquier otra le pide la actual, y aquí eso es el 400 del enlace.
5. Lleva a la portada del panel.

**Cambiar la contraseña** (`/admin/cuenta`):
- `updateUser({ password, current_password })`, con «Require current password when changing password» activado. **Comprobado en B3** en el código de Supabase Auth: la contraseña actual mal da el código `current_password_invalid` (no `current_password_mismatch`, como decía la 8.2), y sin ella, `current_password_required`. Se aceptan los tres. Si el ajuste estuviera apagado, Supabase no miraría la actual: lo detecta la comprobación (i).
- «Require reauthentication» apagado: si no, mandaría un código por correo (fuente 4).

**Salir**: `signOut({ scope: 'local' })`, solo este dispositivo.

### 7.5 Ajustes de Auth del proyecto

**Guardados por Facundo el 2026-11-25**, con la cuenta de la clienta (sección 0). Comprobado desde fuera: las altas están cerradas (`disable_signup: true`).

| Ajuste | Valor |
|---|---|
| Sign In / Providers → Email | Activado, con contraseña |
| Allow new users to sign up | **Apagado** |
| Longitud mínima de la contraseña | 10 |
| Require current password when changing password | **Activado** |
| Require reauthentication when changing password | Apagado |
| Email OTP expiration | 3600 s (el texto del panel dice «el enlace vale una hora») |
| URL Configuration → Site URL | `https://panel.vm-propiedades.es` (ADR-002) |
| Redirect URLs | `https://panel.vm-propiedades.es/nueva-contrasena` (la plantilla no usa `redirectTo`, pero se deja la única válida) |
| JWT Keys | Clave de firma asimétrica como actual. Si sale la HS256 de siempre, pasar a la asimétrica |
| SMTP | Resend: `smtp.resend.com`, puerto 465 (SSL implícito), usuario `resend`, contraseña = **una clave de API nueva solo para esto** («Sending access», limitada al dominio `vm-propiedades.es`), remitente `no-responder@vm-propiedades.es` y nombre «VM Propiedades» (fuentes 8 y 9) |
| Rate Limits → correos por hora | Los 30 de serie con SMTP propio: de sobra |
| Plantilla «Reset password» | La de abajo |

La plantilla:
- **Asunto**: «Cambia la contraseña del panel de VM Propiedades».
- **Cuerpo**, en español y sin `{{ .ConfirmationURL }}`:

```html
<p>Hola:</p>
<p>Has pedido una contraseña nueva para el panel de VM Propiedades. Pulsa el enlace para elegirla. Vale durante una hora y una sola vez.</p>
<p><a href="{{ .SiteURL }}/nueva-contrasena?token_hash={{ .TokenHash }}&type=recovery">Elegir una contraseña nueva</a></p>
<p>Si no lo has pedido tú, no hagas nada: tu contraseña sigue siendo la misma.</p>
```

**¿Sirve el Resend de la web como SMTP de Auth?** Sí: Supabase lo admite y Resend da SMTP con la misma cuenta. Hay dos condiciones:
- **El dominio tiene que estar verificado en Resend.** Si el `RESEND_FROM_EMAIL` de Vercel ya es de `@vm-propiedades.es`, lo está, porque Resend no envía desde un dominio sin verificar. Si es `onboarding@resend.dev`, hay que añadir sus registros DKIM y SPF en el DNS. Van en el subdominio `send.` y no tocan el correo que ya tiene el dominio.
- **Una clave aparte para Supabase**, no la de los formularios, para poder revocarla sin romper nada.

El plan gratuito de Resend da 100 correos al día y 3.000 al mes, compartidos con los formularios: unos pocos de contraseña al año no se notan.

**Mientras no haya SMTP**: el de Supabase solo entrega a los correos de los miembros de la organización y a 2 por hora (fuente 8). Vale para que Facundo pruebe, y para la clienta solo si su correo del panel es el de su cuenta de Supabase.

**Probar en local o en una vista previa**: el enlace del correo lleva siempre a `panel.vm-propiedades.es`, que hasta publicar sirve la web vieja. Se copia su `token_hash` en `http://panel.localhost:3000/nueva-contrasena?token_hash=…&type=recovery` (en local) o en `<vista previa>/admin/nueva-contrasena?token_hash=…&type=recovery`: el token vale igual en cualquier dirección.

---

## 8. Contratos

Todas las rutas responden JSON. Las que escriben, con `{ ok: true, … }` o `{ error: string }`, con el error ya en español. `src/lib/adminApi.ts` ya trata así las respuestas (`AdminApiError`).

### 8.1 Inmuebles (el contrato de hoy, sin cambios)

| Ruta | Entrada | Bien | Errores |
|---|---|---|---|
| `POST /api/admin/properties` | `Partial<PropertyInput>`, que pasa por `pickEditable` | `200 { ok: true, property: Property }` | 400 cuerpo inválido · 401 · 403 · 422 «Ponle un título al inmueble.» (lo mira la ruta antes de ir a la base) y los de 4.7 · 500 |
| `PUT /api/admin/properties/[slug]` | `Partial<PropertyInput>`: el inmueble entero o una parte (`{ status: "vendido" }`) | `200 { ok: true, property }` | 400 · 401 · 403 · 404 «Inmueble no encontrado» · 422 (4.7) · 500 |
| `DELETE /api/admin/properties/[slug]` | | `200 { ok: true }` | 401 · 403 · 404 · 409 (el mensaje de hoy, con su estado) · 500 |
| `POST /api/admin/upload` | El cuerpo de `handleUpload` | Lo que devuelve `handleUpload` | 401 · 403 · 400 «No se pudo preparar la subida» |

- **`POST`**: `insert` con `slug: slugify(title) || 'inmueble'`, devolviendo las columnas de `Property`.
- **`PUT`**:
  - lee la fila (404 si no está);
  - `update … where slug = $1`, devolviendo las columnas;
  - si cambió la lista de fotos, `del()` de las que ya no están (después de guardar, en `after()`).
- **`DELETE`**:
  - lee la fila;
  - si `canDelete` es falso, el 409 de hoy;
  - borra la fila y después sus fotos (en `after()`).
- **Las tres**: `revalidateTag('properties', { expire: 0 })` y el barrido de 5.4 en `after()`.
- `applyChange` y `RuleResult` salen de `propertyRules.ts`: la base hace lo mismo. Sus casos pasan a la comprobación de 4.6.
- Se quedan `missingForPublish` (el formulario avisa antes de guardar), `pickEditable`, `slugify`, `joinEs`, `canDelete` e `isAllowedImageUrl`.

### 8.2 Acceso

| Ruta | Entrada | Bien | Errores |
|---|---|---|---|
| `POST /api/admin/login` | `{ email: string, password: string }` | `200 { ok: true }`, con las cookies de sesión | 400 sin correo o sin contraseña · 401 «El correo o la contraseña no son correctos.» (también si la cuenta no es de `team`) · 429 «Demasiados intentos. Espera unos minutos y vuelve a probar.» |
| `POST /api/admin/logout` | | `200 { ok: true }` | |
| `POST /api/admin/password/forgot` | `{ email: string }` | `200 { ok: true }` **siempre** | 400 «Escribe un correo válido.» · 429 «Espera un minuto antes de pedir otro enlace.» |
| `POST /api/admin/password/reset` | `{ tokenHash: string, password: string }` | `200 { ok: true }`, con la sesión iniciada | 422 «La contraseña tiene que tener al menos 10 caracteres.» (o «como mucho 72») · 400 «El enlace ha caducado o ya se ha usado. Pide otro.» · 422 «La contraseña nueva tiene que ser distinta de la anterior.» · 422 «Esa contraseña es demasiado fácil. Elige otra.» |
| `POST /api/admin/password/change` | `{ current: string, password: string }` | `200 { ok: true }` | 401 · 422 «La contraseña actual no es correcta.» · 422 de longitud, igual o débil (como arriba) · 429 |

Los errores de Auth se distinguen por `error.code` de `AuthError`: `invalid_credentials`, `otp_expired`, `current_password_mismatch`, `same_password`, `weak_password`, `over_email_send_rate_limit` y `over_request_rate_limit`. **Corregido en B3**: la contraseña actual mal no es `current_password_mismatch` sino `current_password_invalid` (`internal/api/apierrors/errorcode.go` de Supabase Auth; `@supabase/auth-js` 2.119 todavía no lo tiene en su lista). La traducción está en `src/lib/authErrors.ts` y acepta los dos. **El `backend` los confirma** en `node_modules/@supabase/auth-js` (`error-codes`) antes de escribir la traducción. Lo que no esté en la lista, 500 «Algo ha fallado. Vuelve a intentarlo en un momento.», y al log.

### 8.3 Lo que añade `src/lib/adminApi.ts`

```ts
export async function login(credentials: { email: string; password: string }): Promise<void>; // el correo pasa a ser obligatorio
export async function requestPasswordReset(email: string): Promise<void>;
export async function resetPassword(tokenHash: string, password: string): Promise<void>;
export async function changePassword(current: string, password: string): Promise<void>;
```

- Las tres nuevas usan el mismo `request()`, y por tanto `AdminApiError`.
- `resetPassword` va a una ruta libre: su 401 no es «se ha cerrado la sesión». Se excluye de esa frase igual que `/api/admin/login`.
- `uploadPhoto`, `createProperty`, `updateProperty`, `deleteProperty` y `logout` no cambian.

### 8.4 Cabeceras e indexación

**Cambiado en B3** por el panel en su subdominio (ADR-002):
- `next.config.ts` → `headers()`:
  - `X-Robots-Tag: noindex, nofollow` en **todo** lo que llegue a un dominio que no sea `www.vm-propiedades.es` ni `vm-propiedades.es` (`missing: [{ type: 'host' }]`): el panel, las vistas previas y `localhost`;
  - y en `/admin/:path*` y `/api/admin/:path*`, en cualquier dominio.
- El proxy pone la misma cabecera en sus respuestas del panel, también en las redirecciones y los 401.
- El `layout` de `/admin` lleva `robots: { index: false, follow: false }`.
- `/robots.txt` en `panel.` es el mismo de la web, sin reescribir: con el `noindex` en cada respuesta basta, y así no sale un 404 raro.
- `robots.ts` deja de llevar `disallow: "/admin"`: en `www` ya no hay panel, y con el `Disallow`, Google no podría leer el `noindex` de la redirección. Lo cambia el `seo` (paso S1).

### 8.5 `/api/salud`

- `GET`, con `export const dynamic = 'force-dynamic'`.
- Exige `Authorization: Bearer <CRON_SECRET>`; si no, 401.
- Hace una lectura mínima con el cliente público: `from('properties').select('slug', { count: 'exact', head: true })`.
- Responde `200 { ok: true, visibles: n }` o `503 { ok: false }`, y deja el error en el log.

---

## 9. Mantener viva la base

- El plan gratuito **pausa el proyecto a los 7 días sin actividad** (fuente 2). Con la web en caché y la clienta sin entrar una semana, podría pasar. La documentación no dice qué cuenta como actividad.
- **Vercel Cron**, en `vercel.json`: `{ "path": "/api/salud", "schedule": "0 6 * * *" }`, una vez al día. Vale en todos los planes; en Hobby, una vez al día y a cualquier minuto de esa hora.
  - Vercel manda `Authorization: Bearer <CRON_SECRET>` solo si la variable existe.
  - Solo se ejecuta en producción.
  - No reintenta si falla (fuente 10).
- Se ve en Vercel → Schedules → Cron Jobs → *View Logs*.
- **Si aun así se pausa**:
  - la web sigue sirviendo sus páginas en caché;
  - el panel no deja entrar;
  - un despliegue nuevo fallaría en el build.
  
  Se restaura desde el panel de Supabase, y lo hace quien tenga el papel para ello en la organización (sección 14).

---

## 10. Variables de entorno

| Variable | Production | Preview | Development (`.env.local`) | ¿Secreta? |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | la misma | la misma | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | la misma | la misma | No (va en el navegador y la protege el RLS) |
| `BLOB_READ_WRITE_TOKEN` | ya está | ya está | ya está | Sí |
| `CRON_SECRET` | 32 letras y números al azar | — | — | Sí |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | sin cambios (formularios) | | | Sí / No |
| `ADMIN_PASSWORD`, `GITHUB_TOKEN` | **se borran** después de comprobar producción (sección 13) | se borran | se borran | |

- No hay `SUPABASE_SECRET_KEY` ni la cadena de conexión en Vercel.
- `.env.local.example` ya lleva esta lista. `ADMIN_PASSWORD` y `GITHUB_TOKEN` no están: el código ya no los lee.
- **Hecho (2026-11-25)**: las dos de Supabase en los tres entornos y `CRON_SECRET` en Production. `BLOB_READ_WRITE_TOKEN` ya estaba, con el almacén conectado.
- La dirección del panel no es una variable: está en `site.panelUrl` (`src/lib/site.ts`).

---

## 11. El plan, por pasos y por agentes

Rama `req-001-panel-con-supabase`. Los agentes no hacen commit ni push.

| # | Agente | Qué hace | Archivos | Depende de | Cómo se sabe que está bien | Horas |
|---|---|---|---|---|---|---|
| F0 | `frontend` (en marcha) | Terminar las pantallas con el contrato de hoy | `src/app/admin/**`, `src/components/admin/**`, `src/lib/adminApi.ts`, `src/lib/photos.ts` | — | Lo que ya se le pidió. **Antes de B3**: así no tocan a la vez `(panel)/page.tsx` ni las rutas | (ya contadas) |
| B1 | `backend` | Las dependencias, los tres archivos de `src/lib/supabase/`, `vercel.json` (`regions` según 3.3, `fluid: true` y el cron), las cabeceras de 8.4 en `next.config.ts` y `.env.local.example`. No cambia nada de lo que se ve | `package.json`, `package-lock.json`, `src/lib/supabase/{env,public,server}.ts`, `vercel.json`, `next.config.ts`, `.env.local.example` | — | `npm run build` y `npm run lint` pasan. `curl -I http://localhost:3000/admin/login` (con `npm start`) lleva `X-Robots-Tag: noindex, nofollow`. Sin las dos variables de Supabase, el mensaje dice cuál falta | 1 |
| B2 | `backend` | La migración de la sección 4 y su comprobación (4.6). Rellena `docs/base-de-datos.md` | `supabase/migrations/<AAAAMMDDHHMMSS>_inmuebles.sql`, `supabase/comprobaciones/inmuebles.sql`, `docs/base-de-datos.md` | — | La migración se puede ejecutar dos veces seguidas sin error (`if not exists`, `create or replace`, `drop policy if exists`). La comprobación, ejecutada por Facundo después de la migración, da `BIEN` con los 12 casos | 3,5 |
| R1 | `revisor-migraciones` | Revisar B2 antes de que Facundo la ejecute | | B2 | Sin bloqueos, o arreglados | 0,5 |
| — | **Facundo** | Ejecutar la migración y la comprobación, y crear las cuentas (sección 12, pasos 2 y 3) | | R1 | `BIEN`. Dos filas en `team` | 0,5 |
| B3 | `backend` | La capa de datos (6.2), las páginas públicas y el sitemap (6.3), las rutas de inmuebles y de fotos (8.1, 5.2 y 5.4), el acceso (7.2–7.4 y 8.2), `/api/salud` (8.5) y la traducción de errores (4.7). Quita `applyChange`, Unsplash de `isAllowedImageUrl`, `github.ts`, `adminAuth.ts` y `properties.json`. Cambia el `import` de `readPropertiesList` en `(panel)/page.tsx`. Rellena `docs/api.md`. **Añadido**: el panel en `panel.vm-propiedades.es` (ADR-002: proxy por dominio, enlaces del panel con `usePanelHref()`, la cabecera y el pie de la web por segmento, cabeceras por dominio, ADR-002 y esta spec), y `"regions": ["dub1"]` | `src/lib/{propertiesStore,propertyErrors,panelAuth,photoCleanup}.ts`, `src/proxy.ts`, `src/app/api/admin/{login,logout,upload}/route.ts`, `src/app/api/admin/password/{forgot,reset,change}/route.ts`, `src/app/api/admin/properties/route.ts`, `src/app/api/admin/properties/[slug]/route.ts`, `src/app/api/salud/route.ts`, `src/app/{page,sitemap}.ts(x)`, `src/app/inmuebles/page.tsx`, `src/app/inmuebles/[slug]/page.tsx`, `src/app/alquiler/page.tsx`, `src/data/properties.ts`, `src/lib/propertyRules.ts`, `docs/api.md`. **Añadidos**: `src/lib/{panelHost,authErrors,site}.ts`, `src/components/admin/PanelLinks.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/(panel)/**`, los enlaces de `src/components/admin/*`, `src/components/{Header,Footer,WhatsAppButton}.tsx`, `next.config.ts`, `vercel.json`, `.env.local.example`, `docs/decisiones/adr-002-panel-en-subdominio.md` | F0, B1, la migración ejecutada | `npm run build` y `npm run lint` pasan. Contra la base, con `npm run build && npm start`: **(a)** sin sesión, `/admin` lleva a `/admin/login` y `POST /api/admin/properties` da 401; **(b)** se entra con la cuenta de Facundo; **(c)** un borrador no sale en `/inmuebles` y su ficha da 404; **(d)** al publicarlo, sale en `/inmuebles`, su ficha da 200 y el sitemap lo lleva **en la primera recarga**; **(e)** publicar sin foto devuelve «Para que salga en la web falta al menos una foto.»; **(f)** la quinta destacada da el error de 4.7; **(g)** ocultarlo devuelve 404 en la siguiente recarga, y borrarlo borra sus fotos de Blob; **(h)** recuperar la contraseña: llega el correo, abrir la página no gasta el enlace y guardar sí; **(i)** cambiar la contraseña con la actual mal da «La contraseña actual no es correcta.»; **(j)** `curl -H "Authorization: Bearer <secreto>" localhost:3000/api/salud` da `{ ok: true }`, y sin cabecera, 401; **(k)** con `NEXT_PUBLIC_SUPABASE_URL` apuntando a una dirección que no responde, `npm run build` **falla** en vez de publicar un catálogo vacío; **(l)** en `panel.localhost:3000`, `/` lleva a `/login`, los enlaces salen sin `/admin` y `/admin/*` hace 308 a la ruta sin él; con `Host: www.vm-propiedades.es`, `/admin/*` hace 308 a `https://panel.vm-propiedades.es/…` y `/api/admin/*` da 404; el panel lleva `noindex` y la web no | 6 |
| F1 | `frontend` | `accounts: true` y los textos de 6.5; el formulario de entrar con el correo; las funciones de 8.3; tres pantallas nuevas: **Recuperar** (`/admin/recuperar`: un campo, un botón y la misma respuesta exista o no el correo), **Nueva contraseña** (`/admin/nueva-contrasena`: lee `token_hash` de la dirección, no hace nada al cargar, dos campos con «ver contraseña» y un enlace a pedir otro si caduca) y **Mi cuenta** (`/admin/cuenta`, dentro de `(panel)`: su correo, solo para ver, cambiar la contraseña con la actual, la nueva y repetirla, y «Salir»). El enlace a «Mi cuenta» en `PanelNav` | `src/components/admin/settings.ts`, `src/components/admin/LoginForm.tsx`, `src/lib/adminApi.ts`, `src/app/admin/recuperar/page.tsx`, `src/app/admin/nueva-contrasena/page.tsx`, `src/app/admin/(panel)/cuenta/page.tsx`, `src/components/admin/PanelNav.tsx` | B3 (para probarlo; los contratos ya están fijos y puede empezar antes) | Los recorridos (h) e (i) de B3 desde las pantallas. A 390 px no hay desplazamiento lateral, los campos son de 16 px o más y los botones de 44 px o más. Ningún texto técnico. Acaba con su lista de «qué mirar a mano» para Facundo | 4 |
| S1 | `seo` | Quitar `disallow: "/admin"` de `robots.ts` (8.4) y comprobar que el sitemap solo lleva lo que da 200, con fechas reales en las fichas | `src/app/robots.ts` | B3 | `robots.txt` sin `Disallow: /admin` y con `Sitemap:`. `curl -I https://panel.vm-propiedades.es/login` lleva `noindex` | 0,5 |
| P1 | sesión principal con `playwright-cli` | En la vista previa (el panel en `<vista previa>/admin`), el recorrido completo: entrar, crear, subir 3 fotos, publicar, verlo en la web, destacarlo, ocultarlo (404), borrarlo, recuperar (copiando el `token_hash` del correo, 7.5) y cambiar la contraseña. Son las comprobaciones (b), (d)–(i) de B3 contra la base y el Blob de verdad | | Sección 12, paso 5 | Todo en verde a 390 y a 1440 px | 1 |
| R2 | `guardian-docs` | `CLAUDE.md` (stack, estructura, «Cómo funciona el panel», variables, el aviso de `git pull` de `properties.json` fuera), `README.md` (hoy es el de `create-next-app`), `docs/arquitectura.md` y esta especificación, si algo ha cambiado al construir | `CLAUDE.md`, `README.md`, `docs/**` | B3, F1 | Ninguna mención a `GITHUB_TOKEN`, `ADMIN_PASSWORD` ni `properties.json` como vigentes | 0,5 |
| | | | | | **Total de desarrollo** | **unas 17 h** |

**Cómo quedó B3 (2026-11-25)**:
- **Hecho contra la base de verdad** (solo leer, como visitante): build, lint y tipos; **(a)**; **(j)** con un `CRON_SECRET` de prueba en la línea de órdenes (`{ ok: true, visibles: 0 }`); **(k)** (el build sale con error, `ENOTFOUND`); **(l)**; `/`, `/inmuebles` y `/alquiler` dan 200 con el catálogo vacío y `/inmuebles/no-existe` da 404.
- **Hecho con un Supabase y un Blob de mentira** en local (fuera del repo: Auth, PostgREST con las reglas de la migración y el RLS, y Blob, en memoria): **(b)**, **(c)**, **(d)** (con el hallazgo de 6.4), **(e)**, **(f)**, **(g)** (las fotos del inmueble borrado salen de Blob), **(h)** (abrir la página no gasta el enlace; una contraseña corta tampoco; el segundo intento después de «la misma de antes» entra) e **(i)**; cuentas fuera del equipo (403, y el panel les enseña «sin acceso»); y en un navegador, el panel en `panel.localhost` y en `/admin`, sin la cabecera de la web y sin errores de hidratación. Más 25 pruebas unitarias de la traducción de errores, los enlaces por dominio y el barrido de fotos.
- **Queda para P1, con sesión y contra la base y el Blob de verdad**: (b), (d)–(i). En especial (d) y (g), porque la caché de Vercel no es la de `next start`, y (h), porque el correo de verdad solo se ve allí. (i) dice además si «Require current password» está activado: si con la actual mal se cambia, está apagado.

**Lo que no entra** (y por qué):
- el `manifest` para instalar el panel en el móvil (0,5 h, se puede añadir después);
- una base de pruebas (3.4);
- el subdominio (3.5);
- comprobar que nadie ha guardado a la vez desde otra pestaña. Hoy lo hacía el `sha` de GitHub. Con una sola persona editando es raro: gana el último guardado. Si un día molesta, se compara `updatedAt` al guardar (1 h).

---

## 12. Lo que tiene que hacer Facundo (en orden)

**A 2026-11-25, los pasos 1 a 4 están hechos.** Lo que queda empieza en el 5.

1. **Ajustes de Auth** (sección 7.5). **Hecho (2026-11-25)**: altas cerradas, contraseña de 10 como mínimo, la actual obligatoria para cambiarla, sin reautenticación, el SMTP de Resend, la plantilla, las claves JWT, la Site URL `https://panel.vm-propiedades.es` y la Redirect URL `https://panel.vm-propiedades.es/nueva-contrasena`.
2. **La migración y su comprobación** en el editor SQL. **Hecho (2026-11-24)**: `BIEN`. Cómo, y qué avisos del editor se aceptan, en «Migraciones» de `docs/base-de-datos.md`.
3. **Las cuentas**: Authentication → Users → *Add user* → *Create new user*, con *Auto Confirm* y una contraseña al azar que no se guarda. **Hecho (2026-11-24)**: la de la clienta y la de Facundo (soporte, sección 15, decisión 2), con sus dos filas en `team`. Para dar de alta otra, «Dar de alta una cuenta del panel» en `docs/base-de-datos.md`.
4. **Vercel y el dominio**. **Hecho (2026-11-25)**:
   - las variables de la sección 10: las dos de Supabase en Production, Preview y Development, y `CRON_SECRET` en Production;
   - la región `dub1` en Settings → Functions (la misma que en `vercel.json`);
   - el almacén de Blob conectado al proyecto;
   - el dominio `panel.vm-propiedades.es` añadido al proyecto, con un CNAME `panel` en el DNS de IONOS (donde está el dominio, `ns*.ui-dns.*`), con el valor que da Vercel. Hasta publicar sirve la web vieja.

   El proyecto se queda en Hobby (decidido por Facundo).
5. **Push de la rama** `req-001-panel-con-supabase` → vista previa.
   - Hacer allí P1 con su cuenta, en `<vista previa>/admin`. El correo de recuperar lleva a `panel.`, que todavía sirve la web vieja: se copia su `token_hash` en `<vista previa>/admin/nueva-contrasena?token_hash=…&type=recovery`.
   - **Opcional**, para probar el subdominio antes de publicar: en Vercel → Settings → Domains, asignar `panel.vm-propiedades.es` a la rama `req-001-panel-con-supabase` mientras dura P1, y devolverlo a producción al acabar. Así el enlace del correo funciona tal cual.
   - Al acabar, **borrar desde el panel los inmuebles de prueba** (Ocultar y Borrar), que borra también sus fotos.
   - La base queda vacía para producción.
6. **Merge a `main` y push**: es la publicación (sección 13).
7. **Primer acceso de la clienta**, con Facundo al teléfono:
   - en `https://panel.vm-propiedades.es`, «¿Has olvidado la contraseña?» con su correo;
   - el enlace;
   - su contraseña;
   - su primer inmueble desde el móvil.
8. **Al día siguiente**:
   - el cron `/api/salud` en verde en Vercel;
   - borrar `ADMIN_PASSWORD` y `GITHUB_TOKEN` de Vercel;
   - revocar el token de GitHub en GitHub → Settings → Developer settings.
9. **La copia de seguridad semanal**: añadir esta base a sus copias, con su usuario de solo lectura.

## 13. Salir a producción sin dejar la web rota

- **La migración no rompe nada**: crea tablas que el código de producción de hoy no usa. Se puede ejecutar cuando se quiera, antes del push.
- **El código nuevo necesita tres cosas antes de publicarse**:
  - la migración ejecutada;
  - las variables en Vercel;
  - las cuentas.
  
  Si falta la migración o la variable, **el build falla** (las páginas públicas leen la base al compilar) y **sigue en pie la versión anterior**. No hay un estado intermedio con la web vacía. Matiz (6.2): si la base no responde pero Vercel tiene guardada una lectura anterior de esa misma base, el build pasa con ese último catálogo bueno, nunca con uno vacío.
- **El catálogo de producción está vacío**: no hay que copiar nada, y no hay un momento en que se pierda un inmueble.
- **Lo que se comprueba en los 10 minutos siguientes al push**:
  1. `/`, `/inmuebles` y `/alquiler` de `www` dan 200, y `curl -I https://www.vm-propiedades.es/` **no** lleva `X-Robots-Tag`.
  2. `https://panel.vm-propiedades.es` lleva a `/login`, y `curl -I https://panel.vm-propiedades.es/login` lleva `X-Robots-Tag: noindex, nofollow`. Si en vez de eso sale la portada de la web, es el riesgo del `matcher` (sección 14).
  3. `https://www.vm-propiedades.es/admin` lleva (308) a `https://panel.vm-propiedades.es/`.
  4. Entrar con la cuenta de soporte, crear un borrador, publicarlo y verlo en `www` en la primera recarga.
  5. Ocultarlo y borrarlo.
  6. Pedir el enlace de contraseña: llega, y lleva a `https://panel.vm-propiedades.es/nueva-contrasena`.
- **Vuelta atrás**: Vercel → Deployments → *Instant Rollback* a la versión anterior.
  - Funciona porque `ADMIN_PASSWORD` y `GITHUB_TOKEN` no se borran hasta el paso 8.
  - Con la versión anterior, `panel.vm-propiedades.es` vuelve a servir la web vieja, y su panel está en `www.vm-propiedades.es/admin`.
  - Mientras se esté en la versión anterior, la clienta no debe usar el panel viejo: cada guardado haría un commit en `main`, y eso publicaría otra vez la versión nueva.

---

## 14. Riesgos y plan B

| Riesgo | Plan B |
|---|---|
| **La base se pausa** aunque haya cron | La web sigue sirviendo lo que tiene en caché (sección 9). Se restaura desde el panel de Supabase, con la cuenta de la clienta, con la que entra Facundo. Si pasa más de una vez: el cron dos veces al día (con Pro de Vercel) o Supabase Pro (25 $ al mes) |
| **Un 404 se queda en caché** al publicar un borrador | En local no pasa solo con `revalidateTag`, y `revalidatePath` lo empeora (6.4): no se añade. Se vuelve a mirar en P1, en Vercel. Si allí la primera recarga diera 404, se arregla antes de publicar; como mucho duraría una hora (`revalidate`) |
| **El `matcher` por dominio no se aplica igual en Vercel** (en local sí, comprobado con `next start`) | Se ve en el punto 2 de la sección 13: `panel.vm-propiedades.es` enseñaría la portada de la web. Plan B: quitar el `has` del tercer `matcher` de `src/proxy.ts`. El proxy pasaría entonces por todas las páginas, también las de `www`, que ya atiende dejándolas pasar, a cambio de una llamada al proxy por visita |
| **La caché de datos dura entre builds** (6.2) | Con la base caída, un build puede publicar el último catálogo bueno en vez de fallar. Nunca uno vacío, y con otra base o sin variables falla siempre |
| **El barrido borra fotos del panel viejo** (5.4) | Solo si la clienta sube fotos en el panel viejo antes de publicar. Que no lo use hasta entonces |
| **Hobby** (decidido por Facundo) | No admite uso comercial y, si se pasa de sus límites, corta Blob 30 días (fuente 1). Pasar a Pro no cambia nada del código |
| **La invalidación no llega** a una página | Como mucho una hora (las 3.600 s). Si se repite, bajar a 600 |
| **El dominio no está verificado en Resend** | Ya no aplica: el SMTP de Resend está guardado (2026-11-25) y el DNS está en IONOS, con acceso |
| **Fotos HEIC desde un ordenador** | Ya lo trata `compressPhoto`: «Esta foto no se puede abrir aquí: súbela desde el móvil». Se prueba con un iPhone de verdad |
| **Fotos huérfanas** que el barrido no alcanza | Cuestan céntimos. Si un día hiciera falta, el mismo barrido se lanza a mano desde una ruta de soporte |
| **Se borra algo por error** | Solo se borran borradores y ocultos, y siempre se pregunta antes. Para lo demás, la copia semanal de la base (las fotos no entran en ella: siguen en Blob mientras su URL esté en una copia) |
| **Una vista previa escribe en la base real** (3.2) | La regla de 3.2. Si un día hay que probar algo que borra, primero la base de pruebas |
| **`unstable_cache` desaparece** en una versión futura de Next | Pasar a `use cache` con `cacheTag` y `cacheComponents` (ADR-001), tocando `propertiesStore.ts`, `next.config.ts` y las páginas que lo pidan |
| **El catálogo pasa de 2 MB** en la caché | Unos 100 inmuebles. Partir la lista (las tarjetas por un lado, la descripción de cada ficha por otro) |

---

## 15. Decisiones para Facundo (con recomendación)

1. **¿En qué organización se queda la base?** **Decidido: la de la clienta.** Supabase y Vercel están en su cuenta, y Facundo entra con ella (sección 0).
2. **¿Quién tiene cuenta?** Recomiendo **la clienta y Facundo** («Facundo (soporte)» en `team`), para reproducir un fallo sin pedirle su contraseña. Si ella prefiere que no, se borra su fila de `team` y la cuenta se queda sin acceso.
3. **¿Blob o Storage?** **Blob** (sección 5.1).
4. **¿`/admin` o `panel.`?** **Decidido (2026-11-24): `panel.vm-propiedades.es`**, en el mismo proyecto de Vercel (sección 3.5 y ADR-002). Antes se recomendaba `/admin` porque no había acceso al DNS.
5. **¿El SMTP?** **Resend**, con la cuenta y el dominio de los formularios y una clave nueva solo para Supabase (7.5).
6. **¿Una segunda base, de pruebas?** **Ahora no** (3.4).
7. **¿El proyecto de Vercel en el equipo Pro?** **Decidido: se queda en Hobby**, en la cuenta de la clienta (Facundo). El riesgo, en la sección 14.

---

## 16. Fuentes (consultadas el 2026-11-24)

1. Vercel Blob, precios y límites: https://vercel.com/docs/vercel-blob/usage-and-pricing (Hobby: 1 GB, 10.000 operaciones simples, 2.000 avanzadas y 10 GB de transferencia; si se pasa, Blob se corta 30 días; borrar es gratis; `list` es una operación avanzada; ejemplo de precios en `iad1`)
2. Supabase, precios: https://supabase.com/pricing (gratuito: 500 MB de base, 1 GB de archivos, 5 GB de transferencia y 5 GB en caché, 50 MB por archivo, 2 proyectos, pausa a los 7 días sin actividad, SMTP propio incluido, sin copias; Pro desde 25 $ al mes)
3. Next 16.3.5, en `node_modules/next/dist/docs/01-app/`: `03-api-reference/04-functions/{revalidateTag,updateTag,unstable_cache,generate-static-params,after}.md`, `03-api-reference/01-directives/use-cache.md`, `03-api-reference/05-config/01-next-config-js/cacheComponents.md`, `02-guides/{caching-without-cache-components,incremental-static-regeneration,how-revalidation-works}.md` y `03-api-reference/03-file-conventions/proxy.md` (el proxy usa Node.js por defecto)
4. Supabase, contraseñas: https://supabase.com/docs/guides/auth/passwords (plantilla con `{{ .SiteURL }}` y `{{ .TokenHash }}`, `type=recovery`, `verifyOtp`; `current_password` desde `supabase-js` 2.102.0) y https://supabase.com/docs/guides/auth/password-security («Require current password when changing password»; la reautenticación manda un código si la sesión tiene más de 24 h)
5. Supabase Auth, código: https://github.com/supabase/auth/blob/master/internal/api/user.go (`UpdatePasswordRequireCurrentPassword` no se aplica si `session.IsRecovery()`)
6. Supabase, papeles: https://supabase.com/docs/guides/platform/access-control (*Developer*: editor SQL, crear usuarios de Auth y ver las claves sí; ajustes de Auth, SMTP, plantillas y URL, no)
7. Supabase, permisos de las tablas nuevas: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
8. Supabase, SMTP: https://supabase.com/docs/guides/auth/auth-smtp (el de serie solo entrega a la organización y a 2 por hora, y no es para producción; con SMTP propio, 30 por hora, ajustable; Resend en la lista)
9. Resend, SMTP: https://resend.com/docs/send-with-smtp (`smtp.resend.com`, usuario `resend`, contraseña = clave de API; 465 con SSL implícito y 587 con STARTTLS)
10. Vercel Cron: https://vercel.com/docs/cron-jobs/manage-cron-jobs (`CRON_SECRET` se manda como `Authorization: Bearer`; solo en producción; Hobby, una vez al día; sin reintentos)
11. Supabase, transferir un proyecto: https://supabase.com/docs/guides/platform/project-transfer (lo hace el *Owner* de origen y conserva datos, URL y claves) y https://supabase.com/docs/guides/platform/billing-on-supabase (dos proyectos gratuitos por persona, contados donde se es *Owner* o *Admin*)
12. `@vercel/blob` 2.8.0, en `node_modules/@vercel/blob/dist/client.d.ts` (`onUploadCompleted` es opcional; `cacheControlMaxAge`, un mes por defecto)
