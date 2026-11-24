# Base de datos

Los inmuebles del catálogo y quién puede cambiarlos. El porqué está en [ADR-001](decisiones/adr-001-supabase-en-vez-de-github-json.md), y el diseño completo, en la sección 4 de la [especificación de REQ-001](specs/req-001-panel-con-supabase.md).

## Motor y acceso
- **Supabase** (Postgres, plan gratuito), con su Auth para las cuentas del panel.
- **Sin ORM**: el servidor de Next habla con la base por la API de Supabase (`@supabase/supabase-js`, que es PostgREST), siempre con la **clave publicable**. No hay clave secreta de Supabase en Vercel.
- **Quién es quién para la base**:
  - la web pública lee sin cookies: es `anon`;
  - el panel y las rutas `/api/admin/*` van con la sesión de quien entra: es `authenticated`, con su `sub` en el token.
  
  Lo que cada uno puede hacer lo deciden el RLS, los permisos por columna y los disparadores, no el código de Next.
- Las fotos no están en la base: están en Vercel Blob, y la base guarda sus URL.

## Entidades
| Tabla | Descripción | Relaciones |
|---|---|---|
| `public.properties` | Los inmuebles, en sus cinco estados. Es el modelo `Property` de `src/data/properties.ts`, con las columnas en `snake_case` | Ninguna |
| `public.team` | Las cuentas que pueden escribir en el panel. Tener sesión no basta: hace falta estar aquí | `user_id` → `auth.users(id)`, `on delete cascade` |

### `properties`
| Columna | Tipo | En `Property` | Reglas |
|---|---|---|---|
| `id` | `uuid`, clave primaria | (no está) | No cambia nunca |
| `slug` | `text`, único | `slug` | `^[a-z0-9]+(-[a-z0-9]+)*$`, 80 caracteres como mucho. Fijo desde el alta |
| `title` | `text` | `title` | De 1 a 120 caracteres, sin contar los espacios de los lados |
| `type` | `text`, `piso` | `type` | `piso`, `atico`, `chalet`, `loft`, `apartamento` o `local` |
| `operation` | `text`, `venta` | `operation` | `venta` o `alquiler` |
| `status` | `text`, `borrador` | `status` | `borrador`, `disponible` («Publicado» en el panel), `reservado`, `vendido` u `oculto` |
| `price` | `numeric(12,2)`, 0 | `price` | De 0 a 999.999.999 €. En alquiler, al mes |
| `zone` | `text`, vacío | `zone` | 80 caracteres como mucho |
| `address` | `text`, vacío | `address` | 160 como mucho |
| `sqm` | `integer`, 0 | `sqm` | De 0 a 100.000 |
| `rooms` | `smallint`, 0 | `rooms` | De 0 a 50 |
| `baths` | `smallint`, 1 | `baths` | De 0 a 20 |
| `description` | `text`, vacío | `description` | 5.000 caracteres como mucho |
| `features` | `text[]`, vacía | `features` | Como mucho 40, cada una de 1 a 120 caracteres y sin espacios a los lados |
| `images` | `text[]`, vacía | `images` | Como mucho 60, sin repetir y todas de Vercel Blob. **La primera es la portada** |
| `featured` | `boolean`, `false` | `featured` | Solo si está `disponible`, y como mucho 4 |
| `published_at` | `timestamptz` | `publishedAt` | La primera vez que salió en la web. La pone la base |
| `updated_at` | `timestamptz` | `updatedAt` | El último guardado. La pone la base. Es el `lastmod` del sitemap |
| `created_at` | `timestamptz` | (no está) | El alta. La pone la base. No se puede leer desde la API |

Para leer con los nombres del modelo: `updatedAt:updated_at,publishedAt:published_at`.

Sin más índices que los de `id` y `slug`: con decenas de inmuebles no hacen falta.

### `team`
| Columna | Tipo |
|---|---|
| `user_id` | `uuid`, clave primaria, `→ auth.users(id)` |
| `name` | `text` («Vale», «Facundo (soporte)») |
| `created_at` | `timestamptz` |

Solo se escribe desde el editor SQL (ver «Dar de alta una cuenta», abajo).

## Reglas de negocio en los datos
Las mismas que `src/lib/propertyRules.ts`, pero en la base, para que no se puedan saltar llamando a la API a mano. Las garantiza el disparador `properties_before_write` (al crear y al cambiar) y `properties_before_delete` (al borrar).

| Regla | Error de la base |
|---|---|
| El `slug` lo manda la ruta (`slugify(title)`). Si ya existe, la base lo hace único con `-2`, `-3`…, sin pasar de 80 caracteres. Si no llega ninguno, se llama `inmueble` | (ninguno) |
| El `slug` no cambia nunca | `vm:slug_fijo` |
| `id`, `created_at`, `published_at` y `updated_at` los pone la base: lo que llegue se ignora | (ninguno) |
| Las características: como mucho 40, cada una de 1 a 120 caracteres y sin espacios a los lados | `vm:caracteristicas` |
| Las fotos: como mucho 60, sin repetir, y todas empiezan por `https://<almacén>.public.blob.vercel-storage.com/` | `vm:fotos_no_validas` |
| Lo que ya ha salido en la web no vuelve a borrador (para quitarlo, se oculta) | `vm:no_vuelve_a_borrador` |
| Para salir en la web (`disponible`, `reservado` o `vendido`) hacen falta título, zona, dirección, precio, superficie, descripción y una foto. Es `missingForPublish`: ni el tipo ni las habitaciones son obligatorios | `vm:faltan:<lista>`, en ese orden y separada por comas: `titulo`, `zona`, `direccion`, `precio`, `superficie`, `descripcion` y `fotos` |
| Al salir en la web por primera vez se apunta `published_at`, y ya no cambia | (ninguno) |
| Solo los `disponible` pueden ir en la portada: al pasar a otro estado, se les quita solo | (ninguno) |
| Como mucho 4 en la portada | `vm:destacadas_llenas` |
| Solo se borran borradores y ocultos | `vm:no_se_puede_borrar` |
| Tipos, estados, longitudes y números fuera de rango (los `check` de la tabla) | `23514`, con el nombre de la restricción (`properties_<campo>_valido`) |

- Los errores de las reglas son `P0001` y el mensaje empieza siempre por `vm:`. La ruta los traduce al español (tabla de la sección 4.7 de la especificación, en `src/lib/propertyErrors.ts`).
- **El 4 de las destacadas es `MAX_FEATURED` de `src/data/properties.ts`**: si cambia uno, cambia el otro, con una migración nueva.
- Dos altas a la vez con el mismo título, o dos destacadas a la vez, no se pisan: la base las pone en fila con un bloqueo.
- No hay borrado lógico: ocultar es el «quitar de la web», y borrar es de verdad.

## Quién ve y escribe qué
RLS activado en las dos tablas.

| | Visitante (`anon`) | Con sesión, fuera de `team` | Del equipo (`team`) |
|---|---|---|---|
| `properties`: leer | Los `disponible`, `reservado` y `vendido` | Nada | Todo |
| `properties`: crear, cambiar y borrar | No | No | Sí, con las reglas de arriba |
| `team` | Nada | Su propia fila (ninguna) | Su propia fila |
| `is_team()` | No la puede ejecutar | `false` | `true` |

**Permisos por columna**. El RLS filtra filas, no columnas, así que los permisos se dan columna a columna:

| | Leer | Crear | Cambiar |
|---|---|---|---|
| `anon` | Todas menos `created_at` | No | No |
| `authenticated` | Todas menos `created_at` | Todas menos `id`, `created_at`, `published_at` y `updated_at` | Las mismas, y tampoco `slug` |

- **Toda lectura nombra sus columnas, también al escribir**: `.select('slug,title,…')` después de `.insert()` o `.update()`. `select('*')`, o `.select()` sin columnas, pide también `created_at` y da `42501`. Así, una columna privada que se añada mañana no queda abierta sin querer.
- Escribir una columna sin permiso (`published_at`, el `slug` al cambiar) da `42501` antes de llegar a la base. Por SQL, el disparador vuelve a garantizar lo mismo.
- `service_role` lo puede todo, pero no se usa en la web: solo para scripts de administración.

## Funciones
| Función | Qué hace | Quién la ejecuta |
|---|---|---|
| `public.is_team()` | `true` si quien llama tiene su fila en `team`. La usan las políticas y el panel al entrar | `authenticated` |
| `public.properties_before_write()` | Las reglas, al crear y al cambiar | Nadie: solo el disparador |
| `public.properties_before_delete()` | Solo borra borradores y ocultos | Nadie: solo el disparador |

- `is_team()` es `security definer` (lee `team` sin pasar por su RLS), pero solo responde por quien llama. El asesor de seguridad de Supabase puede avisar de que `authenticated` ejecuta una función `security definer`: es a propósito.
- Las de los disparadores son `security invoker`: se ejecutan con el RLS de quien escribe, que es del equipo y ve todas las filas. Postgres solo comprueba el permiso de ejecutarlas al crear el disparador, así que no se le da a nadie.
- Las tres llevan `search_path` vacío y nombran todo con su esquema.

## Migraciones
En `supabase/migrations/`, con el nombre `AAAAMMDDHHMMSS_descripcion.sql`. Cada una explica arriba qué hace, por qué y cómo se ejecuta.

| Migración | Qué hace |
|---|---|
| `20261124120000_inmuebles.sql` | `properties`, `team`, `is_team()`, los dos disparadores, el RLS y los permisos (REQ-001) |

**Cómo se aplican**:
- Las ejecuta Facundo, a mano, después de que las revise el `revisor-migraciones`.
- En el editor SQL de Supabase (Database → SQL Editor), con el papel de serie (`postgres`): el archivo entero, en una sola ejecución. Cada una lleva su `begin` y su `commit`, y unas comprobaciones al final: si algo falla, no se aplica nada.
- **Se pueden ejecutar dos veces seguidas** sin error y sin cambiar nada (`if not exists`, `create or replace`, `drop … if exists` antes de cada disparador y política, y los permisos se quitan y se vuelven a dar). Si un día se usa `supabase db push`, antes se marcan como aplicadas con `supabase migration repair --status applied <versión>`: volver a ejecutarlas con migraciones posteriores encima quitaría los permisos que estas den.
- El editor puede avisar de operaciones destructivas: son los `drop … if exists`. Se confirma.
- **Ningún texto entre comillas lleva punto y coma**: el editor de Supabase puede partir la consulta por ellos.

**Cómo se comprueban**: `supabase/comprobaciones/inmuebles.sql`, en el editor SQL, justo después de la migración y cada vez que se quiera (también con inmuebles de verdad).
- Hace de visitante, de cuenta fuera del equipo, de cuenta del equipo y de dueño de la base (`set local role` y `request.jwt.claims`, como la API), y prueba los 12 casos de la sección 4.6 de la especificación.
- **No deja nada**: crea sus cuentas y sus inmuebles de prueba dentro de una transacción que se deshace siempre.
- Si el editor avisa de tablas sin RLS (son las temporales de la comprobación), «Run without RLS».
- **Tiene que salir una sola fila: `BIEN`**, con cuántas comprobaciones ha hecho (96 con la base vacía). Si algo falla, sale una fila `MAL` por fallo, con el caso, lo esperado y lo obtenido.
- Si el editor no enseña ninguna tabla, se quitan la primera línea de código (`begin`) y la última (`rollback`) y se vuelve a ejecutar: no cambia nada, porque el bloque que escribe se deshace solo.

**Dar de alta una cuenta del panel**:
1. Supabase → Authentication → Users → *Add user* → *Create new user*, con su correo, una contraseña al azar que no se guarda y *Auto Confirm* marcado.
2. En el editor SQL:
   ```sql
   insert into public.team (user_id, name)
   select id, 'Nombre' from auth.users where email = lower('<correo>');
   ```
3. La primera contraseña la elige esa persona con «¿Has olvidado la contraseña?».

**Quitar el acceso a una cuenta**, sin borrarla: `delete from public.team where user_id = (select id from auth.users where email = '<correo>');`. Si se borra la cuenta en Authentication, su fila de `team` se va sola.

## Copias de seguridad
El plan gratuito de Supabase no hace copias. La copia es la semanal que hace Facundo fuera de Supabase, con un usuario de solo lectura (paso 9 de la sección 12 de la especificación). Las fotos no entran: siguen en Blob mientras su URL esté en una copia.
