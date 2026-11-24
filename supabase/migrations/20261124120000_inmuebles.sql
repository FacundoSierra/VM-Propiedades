-- Inmuebles del panel en Supabase [REQ-001, paso B2].
-- Spec: docs/specs/req-001-panel-con-supabase.md, sección 4. Decisión: docs/decisiones/adr-001.
--
-- QUÉ HACE
--   1. public.properties: los inmuebles, con las columnas del modelo de
--      src/data/properties.ts en snake_case y sus restricciones (4.1).
--   2. public.team: las cuentas que pueden escribir. Se rellena a mano desde el
--      editor SQL al dar de alta una cuenta (4.2).
--   3. public.is_team(): si quien llama es del equipo. La usan las políticas (4.3).
--   4. Dos disparadores que garantizan las reglas de src/lib/propertyRules.ts (4.3):
--      qué hace falta para publicar, 4 destacadas como mucho y solo entre las
--      publicadas, no volver a borrador después de salir en la web, el slug fijo y
--      libre, borrar solo borradores y ocultos, y fotos solo de Vercel Blob.
--   5. RLS (4.4): el visitante ve lo publicado, el equipo lo ve y lo cambia todo,
--      y una cuenta que no es del equipo no ve nada.
--   6. Permisos por columna (4.5): desde la API nadie escribe slug (después del
--      alta), published_at, updated_at, created_at ni id, y nadie lee created_at.
--   7. Comprobaciones al final: si algo no ha quedado como debe, no se aplica nada.
--
-- POR QUÉ ASÍ
--   - La web lee con la clave publicable y el panel escribe con la sesión de quien
--     entra: no hay clave secreta de Supabase en Vercel. Lo que protege los datos
--     es el RLS más los permisos por columna, y las reglas, los disparadores. Así
--     no se pueden saltar llamando a la API a mano.
--   - Los errores de las reglas empiezan por «vm:» (código P0001), y la ruta los
--     traduce al español (4.7). El TypeScript se queda para avisar en el formulario.
--   - Supabase ya no da permisos solos a lo que se crea en public, pero un proyecto
--     nuevo puede traer todavía los de antes: primero se quita todo a public, anon
--     y authenticated, y después se da solo lo justo.
--   - Las funciones de los disparadores no se dejan ejecutar a nadie, tampoco a
--     authenticated: Postgres solo comprueba ese permiso al crear el disparador, no
--     cuando salta. Lo demuestra la comprobación (casos 1 y 4: el equipo da de alta).
--   - Funciona igual antes y después: crea tablas que el código de hoy no lee.
--   - Se puede ejecutar dos veces seguidas sin error y sin cambiar nada:
--     `create table if not exists`, `create or replace function`, `drop … if
--     exists` antes de cada disparador y política, y los permisos se quitan y se
--     vuelven a dar.
--
-- CÓMO SE EJECUTA
--   - En el editor SQL de Supabase (Database → SQL Editor), con el papel de serie
--     (postgres), el archivo entero y en UNA sola ejecución. Lleva su propio
--     `begin` y `commit`: si algo falla, no se aplica nada.
--   - El editor puede avisar de operaciones destructivas: son los `drop policy if
--     exists` y `drop trigger if exists`, que en la primera ejecución no encuentran
--     nada. Se confirma.
--   - Después, supabase/comprobaciones/inmuebles.sql, que tiene que dar BIEN.
--   - Si un día se usa `supabase db push`, antes hay que marcarla como aplicada
--     (`supabase migration repair --status applied 20261124120000`), no volver a
--     ejecutarla: con migraciones posteriores, quitaría sus permisos.
--
-- NOTA PARA EL EDITOR
--   Ningún texto entre comillas lleva punto y coma: el editor de Supabase puede
--   partir la consulta por ellos.

begin;

-- Si alguna tabla está ocupada (la clave foránea bloquea un momento auth.users),
-- mejor fallar a los 5 s que dejar en cola los inicios de sesión.
set local lock_timeout = '5s';


-- ════════════════════════════════════════════════════════════════════════════
-- 1. Tablas
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.properties (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  type         text not null default 'piso',
  operation    text not null default 'venta',
  status       text not null default 'borrador',
  price        numeric(12,2) not null default 0,
  zone         text not null default '',
  address      text not null default '',
  sqm          integer not null default 0,
  rooms        smallint not null default 0,
  baths        smallint not null default 1,
  description  text not null default '',
  features     text[] not null default '{}',
  images       text[] not null default '{}',
  featured     boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint properties_slug_valido
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  constraint properties_titulo_valido
    check (char_length(btrim(title)) between 1 and 120),
  constraint properties_tipo_valido
    check (type in ('piso', 'atico', 'chalet', 'loft', 'apartamento', 'local')),
  constraint properties_operacion_valida
    check (operation in ('venta', 'alquiler')),
  constraint properties_estado_valido
    check (status in ('borrador', 'disponible', 'reservado', 'vendido', 'oculto')),
  constraint properties_precio_valido
    check (price >= 0 and price <= 999999999),
  constraint properties_zona_valida
    check (char_length(zone) <= 80),
  constraint properties_direccion_valida
    check (char_length(address) <= 160),
  constraint properties_superficie_valida
    check (sqm between 0 and 100000),
  constraint properties_habitaciones_validas
    check (rooms between 0 and 50),
  constraint properties_banos_validos
    check (baths between 0 and 20),
  constraint properties_descripcion_valida
    check (char_length(description) <= 5000),
  -- Las dos de abajo ya las cumple siempre el disparador. Están también aquí por si
  -- alguien escribe con los disparadores apagados (una restauración, por ejemplo).
  constraint properties_destacada_solo_disponible
    check (not featured or status = 'disponible'),
  constraint properties_publicado_con_fecha
    check (status not in ('disponible', 'reservado', 'vendido') or published_at is not null)
);

comment on table public.properties is
  'Inmuebles del catálogo. La web ve los disponibles, reservados y vendidos. El panel, todos. Las reglas las garantiza properties_before_write (REQ-001).';
comment on column public.properties.slug is
  'La dirección en la web, /inmuebles/<slug>. La manda la ruta con slugify(title), la base la hace única con -2, -3… y no cambia nunca.';
comment on column public.properties.status is
  'borrador, disponible (Publicado en el panel), reservado, vendido u oculto. La web solo ve disponible, reservado y vendido.';
comment on column public.properties.price is
  'En euros. En alquiler, al mes.';
comment on column public.properties.images is
  'URL de Vercel Blob, en orden. La primera es la portada.';
comment on column public.properties.featured is
  'En la portada. Solo si está disponible, y como mucho 4 (MAX_FEATURED de src/data/properties.ts).';
comment on column public.properties.published_at is
  'La primera vez que salió en la web. Desde entonces no vuelve a borrador. Lo pone el disparador.';
comment on column public.properties.updated_at is
  'Último guardado. Lo pone el disparador. Es el lastmod del sitemap.';

create table if not exists public.team (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

comment on table public.team is
  'Las cuentas que pueden escribir en el panel. Solo se escribe desde el editor SQL. Tener sesión no basta.';

alter table public.properties enable row level security;
alter table public.team enable row level security;


-- ════════════════════════════════════════════════════════════════════════════
-- 2. ¿Es del equipo quien llama?
-- ════════════════════════════════════════════════════════════════════════════
-- security definer para leer team sin pasar por su RLS. Solo responde por quien
-- llama (auth.uid()), así que no dice nada de nadie más.
create or replace function public.is_team()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team t
    where t.user_id = (select auth.uid())
  )
$$;

comment on function public.is_team() is
  'true si quien llama tiene su fila en team. La usan las políticas de properties y el panel al entrar.';


-- ════════════════════════════════════════════════════════════════════════════
-- 3. Las reglas de los inmuebles (src/lib/propertyRules.ts)
-- ════════════════════════════════════════════════════════════════════════════
-- security invoker: se ejecuta con los permisos y el RLS de quien escribe. Quien
-- escribe es del equipo y ve todas las filas, así que el slug libre y la cuenta de
-- destacadas salen bien.
create or replace function public.properties_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_base         text;
  v_slug         text;
  v_n            integer := 1;
  v_faltan       text[] := '{}';
  v_ya_destacada boolean := false;
  v_otras        integer;
begin
  -- 1. Lo que no se cambia desde fuera
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.created_at := old.created_at;
    new.published_at := old.published_at;
    if new.slug is distinct from old.slug then
      raise exception 'vm:slug_fijo';
    end if;
    v_ya_destacada := old.featured and old.status = 'disponible';
  else
    new.published_at := null;
    new.created_at := now();
    -- El slug libre: el que manda la ruta (o «inmueble» si no manda ninguno) y, si
    -- ya existe, con -2, -3… sin pasar de 80 caracteres ni dejar dos guiones
    -- seguidos. El bloqueo hace que dos altas a la vez con el mismo título no se
    -- lleven el mismo (la segunda espera y ve la primera).
    perform pg_advisory_xact_lock(hashtext('properties.slug'));
    v_base := coalesce(nullif(new.slug, ''), 'inmueble');
    v_slug := v_base;
    while exists (select 1 from public.properties p where p.slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := rtrim(left(v_base, 79 - char_length(v_n::text)), '-') || '-' || v_n;
    end loop;
    new.slug := v_slug;
  end if;

  -- 2. Cuándo se guardó
  new.updated_at := now();

  -- 3. Las listas
  if cardinality(new.features) > 40
     or array_ndims(new.features) > 1
     or exists (
       select 1
       from unnest(new.features) as f(texto)
       where f.texto is null
          or f.texto <> btrim(f.texto)
          or char_length(f.texto) not between 1 and 120
     ) then
    raise exception 'vm:caracteristicas';
  end if;

  if cardinality(new.images) > 60
     or array_ndims(new.images) > 1
     or exists (
       select 1
       from unnest(new.images) as i(url)
       where i.url is null
          or i.url !~* '^https://[a-z0-9-]+\.public\.blob\.vercel-storage\.com/'
     )
     or (select count(distinct i.url) from unnest(new.images) as i(url)) <> cardinality(new.images) then
    raise exception 'vm:fotos_no_validas';
  end if;

  -- 4. Lo que ya ha salido en la web no vuelve a borrador (para quitarlo, se oculta)
  if new.status = 'borrador' and new.published_at is not null then
    raise exception 'vm:no_vuelve_a_borrador';
  end if;

  -- 5. Publicar: lo mismo que missingForPublish, en el mismo orden. Ni el tipo ni
  --    las habitaciones son obligatorios.
  if new.status in ('disponible', 'reservado', 'vendido') then
    if coalesce(btrim(new.title), '') = '' then
      v_faltan := array_append(v_faltan, 'titulo');
    end if;
    if coalesce(btrim(new.zone), '') = '' then
      v_faltan := array_append(v_faltan, 'zona');
    end if;
    if coalesce(btrim(new.address), '') = '' then
      v_faltan := array_append(v_faltan, 'direccion');
    end if;
    if coalesce(new.price, 0) <= 0 then
      v_faltan := array_append(v_faltan, 'precio');
    end if;
    if coalesce(new.sqm, 0) <= 0 then
      v_faltan := array_append(v_faltan, 'superficie');
    end if;
    if coalesce(btrim(new.description), '') = '' then
      v_faltan := array_append(v_faltan, 'descripcion');
    end if;
    if coalesce(cardinality(new.images), 0) = 0 then
      v_faltan := array_append(v_faltan, 'fotos');
    end if;
    if cardinality(v_faltan) > 0 then
      raise exception 'vm:faltan:%', array_to_string(v_faltan, ',');
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;

  -- 6. Destacadas: solo las publicadas, y como mucho 4. El 4 es MAX_FEATURED de
  --    src/data/properties.ts: si cambia uno, cambia el otro. El bloqueo hace que
  --    dos destacadas a la vez no pasen las dos de 4.
  if new.status is distinct from 'disponible' then
    new.featured := false;
  end if;
  if new.featured and not v_ya_destacada then
    perform pg_advisory_xact_lock(hashtext('properties.featured'));
    select count(*) into v_otras
    from public.properties p
    where p.featured
      and p.status = 'disponible'
      and p.id <> new.id;
    if v_otras >= 4 then
      raise exception 'vm:destacadas_llenas';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.properties_before_write() is
  'Las reglas de los inmuebles al crear y al cambiar. Los errores empiezan por vm: y los traduce la ruta (sección 4.7 de la spec de REQ-001).';

create or replace function public.properties_before_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Solo se borra lo que no está en la web: así nunca se borra nada por error.
  if old.status not in ('borrador', 'oculto') then
    raise exception 'vm:no_se_puede_borrar';
  end if;
  return old;
end;
$$;

comment on function public.properties_before_delete() is
  'Solo se borran borradores y ocultos. Lo que está en la web se oculta antes.';

drop trigger if exists properties_before_write on public.properties;
create trigger properties_before_write
  before insert or update on public.properties
  for each row execute function public.properties_before_write();

drop trigger if exists properties_before_delete on public.properties;
create trigger properties_before_delete
  before delete on public.properties
  for each row execute function public.properties_before_delete();


-- ════════════════════════════════════════════════════════════════════════════
-- 4. Quién ve qué y quién escribe qué (RLS)
-- ════════════════════════════════════════════════════════════════════════════
-- (select …) para que Postgres lo calcule una vez por consulta y no una por fila.
-- Las del visitante no llaman a is_team(): anon no puede ejecutarla.
-- Borrar solo borradores y ocultos lo para el disparador, con un error claro. El
-- RLS lo pararía en silencio (0 filas).
drop policy if exists "Visitante: lo publicado" on public.properties;
create policy "Visitante: lo publicado"
  on public.properties
  for select
  to anon
  using (status in ('disponible', 'reservado', 'vendido'));

drop policy if exists "Equipo: lee todo" on public.properties;
create policy "Equipo: lee todo"
  on public.properties
  for select
  to authenticated
  using ((select public.is_team()));

drop policy if exists "Equipo: crea" on public.properties;
create policy "Equipo: crea"
  on public.properties
  for insert
  to authenticated
  with check ((select public.is_team()));

drop policy if exists "Equipo: cambia" on public.properties;
create policy "Equipo: cambia"
  on public.properties
  for update
  to authenticated
  using ((select public.is_team()))
  with check ((select public.is_team()));

drop policy if exists "Equipo: borra" on public.properties;
create policy "Equipo: borra"
  on public.properties
  for delete
  to authenticated
  using ((select public.is_team()));

-- team: cada cuenta ve su propia fila (el panel la lee para saber su nombre).
-- Nadie la escribe desde la API: no hay políticas de escribir ni permisos.
drop policy if exists "Cada cuenta ve su fila" on public.team;
create policy "Cada cuenta ve su fila"
  on public.team
  for select
  to authenticated
  using (user_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- 5. Permisos (4.5)
-- ════════════════════════════════════════════════════════════════════════════
-- Primero se quita todo (también lo que dé un proyecto que todavía abre solo las
-- tablas nuevas). Quitar en la tabla quita también lo de cada columna.
revoke all on table public.properties from public, anon, authenticated;
revoke all on table public.team from public, anon, authenticated;

-- Leer, por columnas: el RLS filtra filas, no columnas. Una columna privada que se
-- añada mañana no queda abierta sin querer. Por eso toda lectura nombra sus
-- columnas: select('*') da 42501.
grant select (id, slug, title, type, operation, status, price, zone, address, sqm, rooms, baths,
              description, features, images, featured, published_at, updated_at)
  on public.properties to anon, authenticated;

-- Escribir, por columnas: slug solo en el alta, y nunca published_at, updated_at,
-- created_at ni id. El disparador lo vuelve a garantizar para quien entre por SQL.
grant insert (slug, title, type, operation, status, price, zone, address, sqm, rooms, baths,
              description, features, images, featured)
  on public.properties to authenticated;
grant update (title, type, operation, status, price, zone, address, sqm, rooms, baths,
              description, features, images, featured)
  on public.properties to authenticated;
grant delete on public.properties to authenticated;

grant select on public.team to authenticated;

grant all on public.properties, public.team to service_role;

revoke all on function public.is_team() from public, anon, authenticated;
grant execute on function public.is_team() to authenticated;

revoke all on function public.properties_before_write() from public, anon, authenticated;
revoke all on function public.properties_before_delete() from public, anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 6. Comprobaciones: si algo no ha quedado como debe, no se aplica nada
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_txt text;
  v_n   integer;
begin
  -- RLS activado en las dos tablas
  if not (select c.relrowsecurity from pg_class c where c.oid = 'public.properties'::regclass)
     or not (select c.relrowsecurity from pg_class c where c.oid = 'public.team'::regclass) then
    raise exception 'Inmuebles: properties o team no tienen RLS activado';
  end if;

  -- Las dos reglas, activas
  select count(*) into v_n
  from pg_trigger t
  where t.tgrelid = 'public.properties'::regclass
    and not t.tgisinternal
    and t.tgenabled = 'O'
    and t.tgname in ('properties_before_write', 'properties_before_delete');
  if v_n <> 2 then
    raise exception 'Inmuebles: faltan los disparadores de properties (hay % de 2)', v_n;
  end if;

  -- Las políticas, exactamente estas
  select string_agg(x.linea, ' | ' order by x.linea collate "C")
    into v_txt
  from (
    select p.tablename::text || ' ' || p.cmd || ' ' || array_to_string(p.roles::text[], ',') as linea
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in ('properties', 'team')
  ) x;
  if v_txt is distinct from
       'properties DELETE authenticated | properties INSERT authenticated | '
       || 'properties SELECT anon | properties SELECT authenticated | '
       || 'properties UPDATE authenticated | team SELECT authenticated' then
    raise exception 'Inmuebles: las políticas no son las esperadas (%)', v_txt;
  end if;

  -- Ni PUBLIC ni anon escriben, ni nadie de fuera lee created_at
  if has_any_column_privilege('anon', 'public.properties', 'INSERT')
     or has_any_column_privilege('anon', 'public.properties', 'UPDATE')
     or has_table_privilege('anon', 'public.properties', 'DELETE')
     or has_table_privilege('anon', 'public.properties', 'TRUNCATE')
     or has_any_column_privilege('anon', 'public.team', 'SELECT')
     or has_any_column_privilege('public', 'public.properties', 'SELECT')
     or has_any_column_privilege('public', 'public.team', 'SELECT')
     or has_column_privilege('anon', 'public.properties', 'created_at', 'SELECT')
     or has_column_privilege('authenticated', 'public.properties', 'created_at', 'SELECT') then
    raise exception 'Inmuebles: anon o PUBLIC tienen permisos de más en properties o team';
  end if;

  -- authenticated no escribe lo que pone la base
  select string_agg(c.columna || ' ' || c.permiso, ', ') into v_txt
  from (values ('id', 'INSERT'), ('id', 'UPDATE'),
               ('created_at', 'INSERT'), ('created_at', 'UPDATE'),
               ('published_at', 'INSERT'), ('published_at', 'UPDATE'),
               ('updated_at', 'INSERT'), ('updated_at', 'UPDATE'),
               ('slug', 'UPDATE')) as c(columna, permiso)
  where has_column_privilege('authenticated', 'public.properties', c.columna, c.permiso);
  if v_txt is not null
     or has_any_column_privilege('authenticated', 'public.team', 'INSERT')
     or has_any_column_privilege('authenticated', 'public.team', 'UPDATE')
     or has_table_privilege('authenticated', 'public.team', 'DELETE')
     or has_table_privilege('authenticated', 'public.properties', 'TRUNCATE') then
    raise exception 'Inmuebles: authenticated puede escribir de más (%)', coalesce(v_txt, 'team o truncate');
  end if;

  -- Las funciones: is_team() solo para authenticated, y las de los disparadores para nadie
  if not has_function_privilege('authenticated', 'public.is_team()', 'EXECUTE')
     or has_function_privilege('anon', 'public.is_team()', 'EXECUTE')
     or has_function_privilege('public', 'public.is_team()', 'EXECUTE')
     or has_function_privilege('public', 'public.properties_before_write()', 'EXECUTE')
     or has_function_privilege('anon', 'public.properties_before_write()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.properties_before_write()', 'EXECUTE')
     or has_function_privilege('public', 'public.properties_before_delete()', 'EXECUTE')
     or has_function_privilege('anon', 'public.properties_before_delete()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.properties_before_delete()', 'EXECUTE') then
    raise exception 'Inmuebles: los permisos de las funciones no son los esperados';
  end if;

  if not (select p.prosecdef from pg_proc p where p.oid = 'public.is_team()'::regprocedure) then
    raise exception 'Inmuebles: is_team() tiene que ser security definer';
  end if;
  if (select p.prosecdef from pg_proc p where p.oid = 'public.properties_before_write()'::regprocedure)
     or (select p.prosecdef from pg_proc p where p.oid = 'public.properties_before_delete()'::regprocedure) then
    raise exception 'Inmuebles: las funciones de los disparadores tienen que ser security invoker';
  end if;
end $$;

-- Que la API vea las tablas nuevas sin esperar
notify pgrst, 'reload schema';

commit;
