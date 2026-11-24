-- Comprobación de la migración de inmuebles [REQ-001, paso B2], para el editor SQL de Supabase.
--
-- PARA QUÉ
--   Después de ejecutar supabase/migrations/20261124120000_inmuebles.sql, prueba los
--   12 casos de la sección 4.6 de docs/specs/req-001-panel-con-supabase.md contra la
--   base de verdad, haciéndose pasar por cada papel con `set local role` y
--   request.jwt.claims, igual que hace la API:
--     - el visitante de la web (anon), sin sesión,
--     - una cuenta con sesión que no es del equipo (authenticated fuera de team),
--     - una cuenta del equipo (authenticated con su fila en team),
--     - y el dueño de la base (el editor SQL), para lo que solo puede venir por SQL.
--   Los casos:
--      1. El visitante ve disponible, reservado y vendido, y no borrador ni oculto.
--      2. El visitante lee con las columnas nombradas, select * da 42501, y escribir
--         también.
--      3. Una cuenta fuera del equipo no ve nada, no da de alta ni se mete en team.
--      4. El equipo da de alta un borrador con solo el título, el mismo título sale
--         con -2 (y -3), y cambiar el slug falla (42501 desde la API, vm:slug_fijo
--         por SQL).
--      5. Publicar sin precio ni fotos da vm:faltan:precio,fotos.
--      6. Publicar completo pone published_at, volver a borrador da
--         vm:no_vuelve_a_borrador, y pasar a oculto y volver a disponible funciona.
--      7. La quinta destacada da vm:destacadas_llenas, y una destacada que pasa a
--         reservado deja de estarlo.
--      8. Borrar una disponible da vm:no_se_puede_borrar, y una oculta se borra.
--      9. Una foto de otro dominio o repetida da vm:fotos_no_validas, y 41
--         características dan vm:caracteristicas.
--     10. Desde la API nadie escribe published_at ni updated_at (42501), y por SQL el
--         disparador tampoco deja.
--     11. El visitante no puede ejecutar is_team().
--     12. Los permisos (information_schema) son los de 4.5, y el RLS, las políticas,
--         las funciones y los disparadores son los de la migración.
--
-- USO
--   Database → SQL Editor, con el papel de serie (postgres) en el selector de papel.
--   Pegar el archivo entero y Run. Si el editor avisa de que se crean tablas sin RLS
--   (son las dos temporales de aquí abajo), elegir «Run without RLS». Si avisa de
--   operaciones destructivas (los update y delete de las pruebas, que se deshacen),
--   confirmar.
--   Sale UNA fila: BIEN, con cuántas comprobaciones se han hecho (96 con la base
--   vacía). Si algo falla, en su lugar sale una fila MAL por cada fallo, con el caso,
--   lo esperado y lo obtenido.
--   Si el editor no enseña ninguna tabla, quitar la primera línea de código
--   (`begin`) y la última (`rollback`) y volver a ejecutar: el resultado es el
--   mismo, porque nada de aquí se queda (ver abajo), y las tablas temporales se
--   borran solas al terminar.
--
-- NO DEJA NADA EN LA BASE
--   Todo va dentro de `begin … rollback`. Además, el bloque que escribe termina
--   siempre en un error que lo deshace, así que se deshace salga bien o mal, aunque
--   se quiten el `begin` y el `rollback`: las tres cuentas de prueba de auth.users, sus
--   filas de team y los inmuebles de prueba. Los resultados se guardan en una
--   variable mientras tanto y se apuntan en la tabla temporal al deshacer.
--   Las cuentas de prueba tienen correos @prueba.invalid (un dominio que no existe:
--   no se envía nada), y los inmuebles, slugs que empiezan por prueba-<10 letras al
--   azar> (y dos que prueban el nombre «inmueble», que se deshacen al momento). No
--   cambia ningún inmueble de verdad: solo los cuenta.
--   Mientras dura (menos de un segundo), un guardado de verdad que cree un inmueble
--   o lo destaque espera a que termine.
--
-- SE PUEDE REPETIR
--   Las veces que haga falta, también con inmuebles de verdad en la base: los casos
--   solo miran los suyos, y el de las destacadas cuenta las que ya hay.
--   Escribe y deshace, así que no sirve el usuario de solo lectura de las copias de
--   seguridad: se ejecuta en el editor SQL.
--
-- NOTA PARA EL EDITOR
--   Ningún texto entre comillas lleva punto y coma: el editor de Supabase puede
--   partir la consulta por ellos.

begin;

-- Lo que se va a probar, en orden. Cada fila es una sentencia que se ejecuta con su
-- papel. Tiene que devolver algo (un returning o un select): eso es lo «obtenido».
-- esperado: el texto exacto, o un código de error de 5 letras (42501, 23514), que
-- se compara solo con el código.
-- conservar: si la sentencia sale bien, su cambio se queda para las siguientes (el
-- alta de un inmueble que se usa después). Si no, se deshace al momento.
create temp table pruebas (
  orden     integer generated always as identity,
  caso      integer not null,
  rol       text    not null check (rol in ('anon', 'fuera', 'equipo', 'dueno')),
  conservar boolean not null,
  que       text    not null,
  sentencia text    not null,
  esperado  text    not null
) on commit drop;

create temp table resultados (
  caso         integer,
  n            integer,
  comprobacion text,
  esperado     text,
  obtenido     text,
  bien         boolean
) on commit drop;


-- ════════════════════════════════════════════════════════════════════════════
-- Casos 1 a 11: los papeles, contra las filas
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_yo        text := current_user;
  -- 10 letras y números al azar: los slugs de prueba no chocan con nada
  v_marca     text := substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  v_p         text;
  v_foto      text;
  v_alta      text;
  v_largo     text;
  v_equipo    uuid := gen_random_uuid();
  v_equipo2   uuid := gen_random_uuid();
  v_fuera     uuid := gen_random_uuid();
  v_c_anon    text := json_build_object('role', 'anon')::text;
  v_c_fuera   text;
  v_c_equipo  text;
  v_dest      integer;
  v_libres    integer;
  v_f         record;
  v_val       text;
  v_txt       text;
  v_r         jsonb := '[]'::jsonb;
  v_caso      integer := 0;
begin
  -- ── 0. Antes de empezar ───────────────────────────────────────────────────
  insert into resultados values
    (0, 1, 'Se ejecuta con el papel de serie del editor (postgres)', 'postgres', v_yo,
     v_yo in ('postgres', 'supabase_admin'));
  if v_yo not in ('postgres', 'supabase_admin') then
    return;
  end if;

  if to_regclass('public.properties') is null
     or to_regclass('public.team') is null
     or to_regprocedure('public.is_team()') is null then
    insert into resultados values
      (0, 2, 'Está ejecutada 20261124120000_inmuebles.sql (sin ella no se prueba nada)',
       'sí', 'no', false);
    return;
  end if;

  v_p := 'prueba-' || v_marca;
  v_foto := 'https://prueba.public.blob.vercel-storage.com/inmuebles/' || v_marca || '-';
  v_c_fuera := json_build_object('sub', v_fuera, 'role', 'authenticated')::text;
  v_c_equipo := json_build_object('sub', v_equipo, 'role', 'authenticated')::text;

  -- Un inmueble completo: slug, título, estado, destacado y fotos.
  v_alta := 'insert into public.properties (slug, title, status, featured, zone, address, price, sqm, description, images) '
         || 'values (%L, %L, %L, %L, ''Zona de prueba'', ''Calle de la Prueba 1'', 250000, 90, '
         || '''Inmueble de prueba de la comprobación'', %L) returning slug';

  -- Un slug de 80 caracteres con un guion en la posición 78: al cortarlo para
  -- añadir -2, no puede quedar un guion doble.
  v_largo := rpad(v_p || '-', 77, 'a') || '-bb';

  -- Destacadas de verdad que ya hay (en una base con inmuebles reales)
  select count(*) into v_dest
  from public.properties p
  where p.featured and p.status = 'disponible';
  v_libres := greatest(0, 4 - v_dest);


  -- ── La lista de pruebas ───────────────────────────────────────────────────
  -- Caso 1. El visitante ve lo publicado
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (1, 'equipo', true, 'El equipo da de alta uno disponible y completo',
     format(v_alta, v_p || '-d', 'Prueba ' || v_marca || ' disponible', 'disponible', false, array[v_foto || '1.jpg']),
     v_p || '-d'),
    (1, 'equipo', true, 'El equipo da de alta uno reservado y completo',
     format(v_alta, v_p || '-r', 'Prueba ' || v_marca || ' reservado', 'reservado', false, array[v_foto || '1.jpg']),
     v_p || '-r'),
    (1, 'equipo', true, 'El equipo da de alta uno vendido y completo',
     format(v_alta, v_p || '-v', 'Prueba ' || v_marca || ' vendido', 'vendido', false, array[v_foto || '1.jpg']),
     v_p || '-v'),
    (1, 'equipo', true, 'El equipo da de alta un borrador completo',
     format(v_alta, v_p || '-b', 'Prueba ' || v_marca || ' borrador', 'borrador', false, array[v_foto || '1.jpg']),
     v_p || '-b'),
    (1, 'equipo', true, 'El equipo da de alta uno oculto y completo',
     format(v_alta, v_p || '-o', 'Prueba ' || v_marca || ' oculto', 'oculto', false, array[v_foto || '1.jpg']),
     v_p || '-o'),
    (1, 'anon', false, 'El visitante ve el disponible, el reservado y el vendido, y no el borrador ni el oculto',
     format('select coalesce(string_agg(p.status, %L order by p.status), %L) from public.properties p '
            || 'where p.slug in (%L, %L, %L, %L, %L)',
            ',', 'ninguno', v_p || '-d', v_p || '-r', v_p || '-v', v_p || '-b', v_p || '-o'),
     'disponible,reservado,vendido');

  -- Caso 2. El visitante: columnas nombradas sí, select * no, escribir no
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (2, 'anon', false, 'El visitante lee con las columnas nombradas (las de la web)',
     format('select count(*)::text from (select p.id, p.slug, p.title, p.type, p.operation, p.status, p.price, '
            || 'p.zone, p.address, p.sqm, p.rooms, p.baths, p.description, p.features, p.images, p.featured, '
            || 'p.published_at, p.updated_at from public.properties p where p.slug in (%L, %L, %L, %L, %L)) s',
            v_p || '-d', v_p || '-r', v_p || '-v', v_p || '-b', v_p || '-o'),
     '3'),
    (2, 'anon', false, 'El visitante con select * (pide también created_at, que no es suyo)',
     'select count(*)::text from (select * from public.properties) s',
     '42501'),
    (2, 'anon', false, 'El visitante lee created_at',
     'select count(p.created_at)::text from public.properties p',
     '42501'),
    (2, 'anon', false, 'El visitante da de alta un inmueble',
     format('insert into public.properties (slug, title) values (%L, %L) returning slug',
            v_p || '-anon', 'Prueba ' || v_marca || ' anon'),
     '42501'),
    (2, 'anon', false, 'El visitante cambia un inmueble publicado',
     format('update public.properties set title = %L where slug = %L returning slug', 'Cambiado', v_p || '-d'),
     '42501'),
    (2, 'anon', false, 'El visitante borra un borrador',
     format('delete from public.properties where slug = %L returning slug', v_p || '-b'),
     '42501'),
    (2, 'anon', false, 'El visitante lee team',
     'select count(*)::text from public.team',
     '42501');

  -- Caso 3. Una cuenta con sesión que no es del equipo
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (3, 'fuera', false, 'Fuera del equipo: no ve ningún inmueble, ni los publicados',
     'select count(*)::text from public.properties',
     '0'),
    (3, 'fuera', false, 'Fuera del equipo: no ve ninguna fila de team',
     'select count(*)::text from public.team',
     '0'),
    (3, 'fuera', false, 'Fuera del equipo: da de alta un borrador (lo para el RLS)',
     format('insert into public.properties (slug, title) values (%L, %L) returning slug',
            v_p || '-fuera', 'Prueba ' || v_marca || ' fuera'),
     '42501'),
    (3, 'fuera', false, 'Fuera del equipo: cambiar no toca ninguna fila',
     format('update public.properties set title = %L where slug in (%L, %L) returning slug',
            'Cambiado', v_p || '-d', v_p || '-b'),
     'sin filas'),
    (3, 'fuera', false, 'Fuera del equipo: borrar no toca ninguna fila',
     format('delete from public.properties where slug in (%L, %L) returning slug', v_p || '-b', v_p || '-o'),
     'sin filas'),
    (3, 'fuera', false, 'Fuera del equipo: meterse a sí mismo en team',
     format('insert into public.team (user_id, name) values (%L, %L) returning name', v_fuera, 'Colado'),
     '42501'),
    (3, 'fuera', false, 'Fuera del equipo: is_team() dice que no',
     'select public.is_team()::text',
     'false');

  -- Caso 4. El equipo: alta de borrador, slug libre y slug fijo
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (4, 'equipo', true, 'El equipo da de alta un borrador con solo el título (con los valores por defecto)',
     format('insert into public.properties (slug, title) values (%L, %L) returning concat_ws(%L, slug, status, '
            || 'type, operation, price::text, rooms::text, baths::text, featured::text, '
            || 'coalesce(published_at::text, %L))',
            v_p, 'Prueba ' || v_marca, ' / ', 'sin published_at'),
     v_p || ' / borrador / piso / venta / 0.00 / 0 / 1 / false / sin published_at'),
    (4, 'equipo', true, 'Otro con el mismo slug sale con -2',
     format('insert into public.properties (slug, title) values (%L, %L) returning slug', v_p, 'Prueba ' || v_marca),
     v_p || '-2'),
    (4, 'equipo', true, 'Y el siguiente, con -3',
     format('insert into public.properties (slug, title) values (%L, %L) returning slug', v_p, 'Prueba ' || v_marca),
     v_p || '-3'),
    (4, 'equipo', true, 'Un slug de 80 caracteres se guarda tal cual',
     format('insert into public.properties (slug, title) values (%L, %L) returning slug', v_largo, 'Prueba ' || v_marca || ' largo'),
     v_largo),
    (4, 'equipo', false, 'Repetido, se corta para que con -2 no pase de 80 ni deje dos guiones seguidos',
     format('insert into public.properties (slug, title) values (%L, %L) returning slug', v_largo, 'Prueba ' || v_marca || ' largo'),
     rpad(v_p || '-', 77, 'a') || '-2'),
    (4, 'equipo', false, 'Sin slug (vacío), se llama inmueble (o inmueble-N si ya hay uno)',
     format('insert into public.properties (slug, title) values (%L, %L) returning (slug ~ %L)::text',
            '', 'Prueba ' || v_marca || ' sin slug', '^inmueble(-[0-9]+)?$'),
     'true'),
    (4, 'equipo', false, 'Sin mandar el slug, igual',
     format('insert into public.properties (title) values (%L) returning (slug ~ %L)::text',
            'Prueba ' || v_marca || ' sin slug', '^inmueble(-[0-9]+)?$'),
     'true'),
    (4, 'equipo', false, 'El equipo cambia el slug desde la API (no tiene permiso en esa columna)',
     format('update public.properties set slug = %L where slug = %L returning slug', v_p || '-otro', v_p),
     '42501'),
    (4, 'dueno', false, 'Por SQL, cambiar el slug lo para el disparador',
     format('update public.properties set slug = %L where slug = %L returning slug', v_p || '-otro', v_p),
     'P0001 vm:slug_fijo'),
    (4, 'equipo', false, 'El equipo ve los cinco estados',
     format('select string_agg(p.status, %L order by p.status) from public.properties p '
            || 'where p.slug in (%L, %L, %L, %L, %L)',
            ',', v_p || '-d', v_p || '-r', v_p || '-v', v_p || '-b', v_p || '-o'),
     'borrador,disponible,oculto,reservado,vendido'),
    (4, 'equipo', false, 'El equipo ve en team solo su fila (hay dos de prueba)',
     'select count(*)::text || '' / '' || bool_and(t.user_id = (select auth.uid()))::text from public.team t',
     '1 / true'),
    (4, 'equipo', false, 'El equipo no puede meter a nadie en team (solo desde el editor SQL)',
     format('insert into public.team (user_id, name) values (%L, %L) returning name', v_fuera, 'Colado'),
     '42501'),
    (4, 'equipo', false, 'Del equipo: is_team() dice que sí',
     'select public.is_team()::text',
     'true');

  -- Caso 5. Publicar sin lo que hace falta
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (5, 'equipo', true, 'El equipo da de alta un borrador con título, zona, dirección, superficie y descripción',
     format('insert into public.properties (slug, title, zone, address, sqm, description) '
            || 'values (%L, %L, %L, %L, 75, %L) returning slug',
            v_p || '-sp', 'Prueba ' || v_marca || ' sin precio', 'Zona de prueba', 'Calle de la Prueba 2',
            'Inmueble de prueba'),
     v_p || '-sp'),
    (5, 'equipo', false, 'Publicarlo sin precio ni fotos',
     format('update public.properties set status = %L where slug = %L returning slug', 'disponible', v_p || '-sp'),
     'P0001 vm:faltan:precio,fotos'),
    (5, 'equipo', false, 'Publicar uno con solo el título: falta todo, en el orden del formulario',
     format('update public.properties set status = %L where slug = %L returning slug', 'disponible', v_p),
     'P0001 vm:faltan:zona,direccion,precio,superficie,descripcion,fotos'),
    (5, 'equipo', false, 'Dar de alta directamente como reservado sin datos',
     format('insert into public.properties (slug, title, status) values (%L, %L, %L) returning slug',
            v_p || '-res', 'Prueba ' || v_marca || ' reservado sin datos', 'reservado'),
     'P0001 vm:faltan:zona,direccion,precio,superficie,descripcion,fotos'),
    (5, 'equipo', false, 'Dejar sin descripción uno que ya está en la web',
     format('update public.properties set description = %L where slug = %L returning slug', '', v_p || '-d'),
     'P0001 vm:faltan:descripcion');

  -- Caso 6. Publicar, no volver a borrador, ocultar y volver
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (6, 'equipo', true, 'Completarlo y publicarlo pone published_at',
     format('update public.properties set price = 180000, images = %L, status = %L where slug = %L '
            || 'returning status || %L || (published_at is not null)::text',
            array[v_foto || '2.jpg'], 'disponible', v_p || '-sp', ' / published_at '),
     'disponible / published_at true'),
    (6, 'anon', false, 'Ya sale en la web',
     format('select count(*)::text from public.properties p where p.slug = %L', v_p || '-sp'),
     '1'),
    (6, 'equipo', false, 'Volver a borrador',
     format('update public.properties set status = %L where slug = %L returning slug', 'borrador', v_p || '-sp'),
     'P0001 vm:no_vuelve_a_borrador'),
    (6, 'equipo', true, 'Ocultarlo conserva published_at',
     format('update public.properties set status = %L where slug = %L '
            || 'returning status || %L || (published_at = now())::text',
            'oculto', v_p || '-sp', ' / conserva published_at '),
     'oculto / conserva published_at true'),
    (6, 'anon', false, 'Oculto, ya no sale en la web',
     format('select count(*)::text from public.properties p where p.slug = %L', v_p || '-sp'),
     '0'),
    (6, 'equipo', false, 'Oculto después de salir en la web, tampoco vuelve a borrador',
     format('update public.properties set status = %L where slug = %L returning slug', 'borrador', v_p || '-sp'),
     'P0001 vm:no_vuelve_a_borrador'),
    (6, 'equipo', true, 'Volver a publicarlo funciona y conserva published_at',
     format('update public.properties set status = %L where slug = %L '
            || 'returning status || %L || (published_at = now())::text',
            'disponible', v_p || '-sp', ' / conserva published_at '),
     'disponible / conserva published_at true'),
    (6, 'anon', false, 'Y vuelve a salir en la web',
     format('select count(*)::text from public.properties p where p.slug = %L', v_p || '-sp'),
     '1'),
    (6, 'equipo', false, 'Uno oculto que nunca salió en la web sí puede pasar a borrador',
     format('update public.properties set status = %L where slug = %L returning status', 'borrador', v_p || '-o'),
     'borrador');

  -- Caso 7. Destacadas: como mucho 4, y solo disponibles
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado)
  select 7, 'equipo', true,
         format('Destacada de prueba %s (ya había %s de verdad)', g, v_dest),
         format(v_alta, v_p || '-dest' || g, 'Prueba ' || v_marca || ' destacada ' || g, 'disponible', true,
                array[v_foto || '1.jpg']),
         v_p || '-dest' || g
  from generate_series(1, v_libres) as g;

  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (7, 'dueno', false, 'Ya hay 4 destacadas',
     'select count(*)::text from public.properties p where p.featured and p.status = ''disponible''',
     '4'),
    (7, 'equipo', false, 'La quinta destacada, al darla de alta',
     format(v_alta, v_p || '-dest5', 'Prueba ' || v_marca || ' destacada 5', 'disponible', true,
            array[v_foto || '1.jpg']),
     'P0001 vm:destacadas_llenas'),
    (7, 'equipo', false, 'La quinta destacada, al destacar uno que ya está publicado',
     format('update public.properties set featured = true where slug = %L returning slug', v_p || '-d'),
     'P0001 vm:destacadas_llenas'),
    (7, 'equipo', false, 'Un borrador marcado como destacado se guarda sin destacar',
     format('insert into public.properties (slug, title, featured) values (%L, %L, true) returning featured::text',
            v_p || '-bdest', 'Prueba ' || v_marca || ' borrador destacado'),
     'false');

  if v_libres >= 1 then
    insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
      (7, 'equipo', true, 'Una destacada que pasa a reservado deja de estarlo',
       format('update public.properties set status = %L where slug = %L returning featured::text',
              'reservado', v_p || '-dest1'),
       'false'),
      (7, 'equipo', false, 'Con ese hueco libre, ya se puede destacar otra',
       format('update public.properties set featured = true where slug = %L returning featured::text', v_p || '-d'),
       'true');
  else
    -- Con 4 destacadas de verdad no se puede crear una de prueba: se prueba la misma
    -- regla (solo destacada si está disponible) sin tocar las de verdad.
    insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
      (7, 'equipo', false, 'Pasar a reservado y destacar a la vez deja sin destacar (sin error, aunque haya 4)',
       format('update public.properties set status = %L, featured = true where slug = %L returning featured::text',
              'reservado', v_p || '-d'),
       'false');
  end if;

  -- Caso 8. Borrar solo borradores y ocultos
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (8, 'equipo', false, 'Borrar uno disponible',
     format('delete from public.properties where slug = %L returning slug', v_p || '-d'),
     'P0001 vm:no_se_puede_borrar'),
    (8, 'equipo', false, 'Borrar uno reservado',
     format('delete from public.properties where slug = %L returning slug', v_p || '-r'),
     'P0001 vm:no_se_puede_borrar'),
    (8, 'equipo', false, 'Borrar uno vendido',
     format('delete from public.properties where slug = %L returning slug', v_p || '-v'),
     'P0001 vm:no_se_puede_borrar'),
    (8, 'equipo', false, 'Borrar uno oculto',
     format('delete from public.properties where slug = %L returning slug', v_p || '-o'),
     v_p || '-o'),
    (8, 'equipo', false, 'Borrar un borrador',
     format('delete from public.properties where slug = %L returning slug', v_p || '-b'),
     v_p || '-b');

  -- Caso 9. Fotos, características y datos no válidos (sobre el borrador completo)
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (9, 'equipo', false, 'Una foto de otro dominio (Unsplash)',
     format('update public.properties set images = %L where slug = %L returning slug',
            array['https://images.unsplash.com/photo-1.jpg'], v_p || '-b'),
     'P0001 vm:fotos_no_validas'),
    (9, 'equipo', false, 'Una foto repetida',
     format('update public.properties set images = %L where slug = %L returning slug',
            array[v_foto || '1.jpg', v_foto || '1.jpg'], v_p || '-b'),
     'P0001 vm:fotos_no_validas'),
    (9, 'equipo', false, 'Una foto por http',
     format('update public.properties set images = %L where slug = %L returning slug',
            array['http://prueba.public.blob.vercel-storage.com/inmuebles/x.jpg'], v_p || '-b'),
     'P0001 vm:fotos_no_validas'),
    (9, 'equipo', false, 'Una foto de un dominio que solo empieza como el de Blob',
     format('update public.properties set images = %L where slug = %L returning slug',
            array['https://prueba.public.blob.vercel-storage.com.ejemplo.com/x.jpg'], v_p || '-b'),
     'P0001 vm:fotos_no_validas'),
    (9, 'equipo', false, 'Una foto con mayúsculas y guion en el almacén, sí',
     format('update public.properties set images = %L where slug = %L returning cardinality(images)::text',
            array['https://Prueba-1.public.blob.vercel-storage.com/inmuebles/x.jpg'], v_p || '-b'),
     '1'),
    (9, 'equipo', false, 'Una foto vacía (null) en la lista',
     format('update public.properties set images = %L where slug = %L returning slug',
            array[v_foto || '1.jpg', null], v_p || '-b'),
     'P0001 vm:fotos_no_validas'),
    (9, 'equipo', false, '61 fotos',
     format('update public.properties set images = %L where slug = %L returning slug',
            array(select v_foto || g || '.jpg' from generate_series(1, 61) as g), v_p || '-b'),
     'P0001 vm:fotos_no_validas'),
    (9, 'equipo', false, '60 fotos distintas, sí',
     format('update public.properties set images = %L where slug = %L returning cardinality(images)::text',
            array(select v_foto || g || '.jpg' from generate_series(1, 60) as g), v_p || '-b'),
     '60'),
    (9, 'equipo', false, '41 características',
     format('update public.properties set features = %L where slug = %L returning slug',
            array(select 'Característica ' || g from generate_series(1, 41) as g), v_p || '-b'),
     'P0001 vm:caracteristicas'),
    (9, 'equipo', false, 'Una característica con un espacio delante',
     format('update public.properties set features = %L where slug = %L returning slug',
            array[' Garaje'], v_p || '-b'),
     'P0001 vm:caracteristicas'),
    (9, 'equipo', false, 'Una característica vacía',
     format('update public.properties set features = %L where slug = %L returning slug',
            array[''], v_p || '-b'),
     'P0001 vm:caracteristicas'),
    (9, 'equipo', false, 'Una característica de 121 caracteres',
     format('update public.properties set features = %L where slug = %L returning slug',
            array[repeat('a', 121)], v_p || '-b'),
     'P0001 vm:caracteristicas'),
    (9, 'equipo', false, '40 características, sí',
     format('update public.properties set features = %L where slug = %L returning cardinality(features)::text',
            array(select 'Característica ' || g from generate_series(1, 40) as g), v_p || '-b'),
     '40'),
    (9, 'equipo', false, 'Un tipo que no existe (lo para un check)',
     format('update public.properties set type = %L where slug = %L returning slug', 'castillo', v_p || '-b'),
     '23514'),
    (9, 'equipo', false, 'Un precio negativo (lo para un check)',
     format('update public.properties set price = -1 where slug = %L returning slug', v_p || '-b'),
     '23514');

  -- Caso 10. Lo que pone la base no lo escribe nadie
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (10, 'equipo', false, 'El equipo escribe published_at',
     format('update public.properties set published_at = now() where slug = %L returning slug', v_p || '-d'),
     '42501'),
    (10, 'equipo', false, 'El equipo escribe updated_at',
     format('update public.properties set updated_at = now() where slug = %L returning slug', v_p || '-d'),
     '42501'),
    (10, 'equipo', false, 'El equipo escribe created_at',
     format('update public.properties set created_at = now() where slug = %L returning slug', v_p || '-d'),
     '42501'),
    (10, 'equipo', false, 'El equipo escribe id',
     format('update public.properties set id = gen_random_uuid() where slug = %L returning slug', v_p || '-d'),
     '42501'),
    (10, 'equipo', false, 'El equipo da de alta con published_at',
     format('insert into public.properties (slug, title, published_at) values (%L, %L, now()) returning slug',
            v_p || '-pub', 'Prueba ' || v_marca || ' con fecha'),
     '42501'),
    (10, 'dueno', false, 'Por SQL, cambiar published_at, created_at y updated_at no cambia nada',
     format('update public.properties set published_at = %L, created_at = %L, updated_at = %L where slug = %L '
            || 'returning concat_ws(%L, (published_at = now())::text, (created_at = now())::text, '
            || '(updated_at = now())::text)',
            '2000-01-01', '2000-01-01', '2000-01-01', v_p || '-d', ' / '),
     'true / true / true'),
    (10, 'dueno', false, 'Por SQL, un alta con published_at y created_at viejos los pierde',
     format('insert into public.properties (slug, title, published_at, created_at, updated_at) '
            || 'values (%L, %L, %L, %L, %L) returning concat_ws(%L, coalesce(published_at::text, %L), '
            || '(created_at = now())::text, (updated_at = now())::text)',
            v_p || '-sql', 'Prueba ' || v_marca || ' por SQL', '2000-01-01', '2000-01-01', '2000-01-01',
            ' / ', 'sin published_at'),
     'sin published_at / true / true');

  -- Caso 11. is_team() no es para el visitante
  insert into pruebas (caso, rol, conservar, que, sentencia, esperado) values
    (11, 'anon', false, 'El visitante ejecuta is_team()',
     'select public.is_team()::text',
     '42501');


  -- ── Las pruebas, una a una ────────────────────────────────────────────────
  begin
    -- Las cuentas de prueba, como dueño de la base y sin sesión. Dos del equipo
    -- (para ver que cada una solo ve su fila de team) y una de fuera.
    perform set_config('request.jwt.claims', '', true);
    begin
      insert into auth.users (id, aud, role, email, created_at, updated_at) values
        (v_equipo,  'authenticated', 'authenticated', v_marca || '-equipo@prueba.invalid',  now(), now()),
        (v_equipo2, 'authenticated', 'authenticated', v_marca || '-equipo2@prueba.invalid', now(), now()),
        (v_fuera,   'authenticated', 'authenticated', v_marca || '-fuera@prueba.invalid',   now(), now());
      insert into public.team (user_id, name) values
        (v_equipo,  'Prueba ' || v_marca),
        (v_equipo2, 'Prueba 2 ' || v_marca);
      v_txt := 'sí';
    exception when others then
      v_txt := sqlstate || ' ' || sqlerrm;
    end;
    v_r := v_r || jsonb_build_array(jsonb_build_array(
      0, 3, 'Se crean las tres cuentas de prueba (auth.users) y dos filas de team', 'sí', v_txt, v_txt = 'sí'));
    if v_txt <> 'sí' then
      raise exception using errcode = 'VM000', message = 'deshacer';
    end if;

    for v_f in
      select p.*, row_number() over (partition by p.caso order by p.orden) as n
      from pruebas p
      order by p.orden
    loop
      v_caso := v_f.caso;
      v_val := null;
      v_txt := null;
      begin
        if v_f.rol = 'anon' then
          perform set_config('request.jwt.claims', v_c_anon, true);
          set local role anon;
        elsif v_f.rol = 'fuera' then
          perform set_config('request.jwt.claims', v_c_fuera, true);
          set local role authenticated;
        elsif v_f.rol = 'equipo' then
          perform set_config('request.jwt.claims', v_c_equipo, true);
          set local role authenticated;
        end if;

        execute v_f.sentencia into v_val;
        v_txt := coalesce(v_val, 'sin filas');

        -- De vuelta a dueño de la base y sin sesión
        execute format('set local role %I', v_yo);
        perform set_config('request.jwt.claims', '', true);
        if not v_f.conservar then
          raise exception using errcode = 'VM001', message = 'deshacer';
        end if;
      exception
        when sqlstate 'VM001' then
          null;
        when others then
          v_txt := sqlstate || ' ' || sqlerrm;
      end;

      v_r := v_r || jsonb_build_array(jsonb_build_array(
        v_f.caso, v_f.n, v_f.que, v_f.esperado, v_txt,
        case
          when v_f.esperado ~ '^[0-9A-Z]{5}$' then v_txt like v_f.esperado || ' %'
          else v_txt = v_f.esperado
        end));
    end loop;

    raise exception using errcode = 'VM000', message = 'deshacer';
  exception
    when sqlstate 'VM000' then
      insert into resultados (caso, n, comprobacion, esperado, obtenido, bien)
      select (e.x ->> 0)::integer, (e.x ->> 1)::integer, e.x ->> 2, e.x ->> 3,
             coalesce(e.x ->> 4, 'null'), (e.x ->> 5)::boolean
      from jsonb_array_elements(v_r) as e(x);
    when others then
      insert into resultados (caso, n, comprobacion, esperado, obtenido, bien)
      select (e.x ->> 0)::integer, (e.x ->> 1)::integer, e.x ->> 2, e.x ->> 3,
             coalesce(e.x ->> 4, 'null'), (e.x ->> 5)::boolean
      from jsonb_array_elements(v_r) as e(x);
      insert into resultados values
        (v_caso, 999, 'Las pruebas se han cortado en este caso', 'sin error', sqlstate || ' ' || sqlerrm, false);
  end;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- Caso 12: permisos y estructura (como dueño de la base, solo lee el catálogo)
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  -- Las listas de 4.5
  c_lectura constant text[] := array['id', 'slug', 'title', 'type', 'operation', 'status', 'price', 'zone',
    'address', 'sqm', 'rooms', 'baths', 'description', 'features', 'images', 'featured', 'published_at',
    'updated_at'];
  c_alta constant text[] := array['slug', 'title', 'type', 'operation', 'status', 'price', 'zone', 'address',
    'sqm', 'rooms', 'baths', 'description', 'features', 'images', 'featured'];
  c_cambio constant text[] := array['title', 'type', 'operation', 'status', 'price', 'zone', 'address', 'sqm',
    'rooms', 'baths', 'description', 'features', 'images', 'featured'];
  v_sobra text;
  v_falta text;
  v_txt   text;
  v_esp   text;
begin
  if to_regclass('public.properties') is null
     or to_regclass('public.team') is null
     or to_regprocedure('public.is_team()') is null
     or exists (select 1 from resultados r where r.caso = 0 and r.bien is not true) then
    return;
  end if;

  -- 12.1 Permisos por columna de anon, authenticated y PUBLIC (los de la tabla
  -- entera salen aquí en cada columna: el select de authenticated en team)
  with esperado (quien, permiso, tabla, columna) as (
    select 'anon'::text, 'SELECT'::text, 'properties'::text, unnest(c_lectura)
    union all
    select 'authenticated', 'SELECT', 'properties', unnest(c_lectura)
    union all
    select 'authenticated', 'INSERT', 'properties', unnest(c_alta)
    union all
    select 'authenticated', 'UPDATE', 'properties', unnest(c_cambio)
    union all
    select 'authenticated', 'SELECT', 'team', unnest(array['user_id', 'name', 'created_at'])
  ),
  hay (quien, permiso, tabla, columna) as (
    select g.grantee::text, g.privilege_type::text, g.table_name::text, g.column_name::text
    from information_schema.role_column_grants g
    where g.table_schema = 'public'
      and g.table_name in ('properties', 'team')
      and g.grantee in ('anon', 'authenticated', 'PUBLIC')
  ),
  sobra as (select * from hay except select * from esperado),
  falta as (select * from esperado except select * from hay)
  select
    (select string_agg(s.quien || ' ' || s.permiso || ' ' || s.tabla || '.' || s.columna, ', '
                       order by s.quien, s.permiso, s.tabla, s.columna) from sobra s),
    (select string_agg(f.quien || ' ' || f.permiso || ' ' || f.tabla || '.' || f.columna, ', '
                       order by f.quien, f.permiso, f.tabla, f.columna) from falta f)
  into v_sobra, v_falta;

  insert into resultados values
    (12, 1, 'Permisos por columna de anon y authenticated (information_schema.role_column_grants) = 4.5',
     'los de 4.5',
     coalesce(nullif(concat_ws(' | ', 'sobran: ' || v_sobra, 'faltan: ' || v_falta), ''), 'los de 4.5'),
     v_sobra is null and v_falta is null);

  -- 12.2 Permisos de tabla entera de anon, authenticated y PUBLIC
  select string_agg(g.grantee || ' ' || g.privilege_type || ' ' || g.table_name, ', '
                    order by g.grantee, g.table_name, g.privilege_type)
    into v_txt
  from information_schema.role_table_grants g
  where g.table_schema = 'public'
    and g.table_name in ('properties', 'team')
    and g.grantee in ('anon', 'authenticated', 'PUBLIC');
  v_esp := 'authenticated DELETE properties, authenticated SELECT team';
  insert into resultados values
    (12, 2, 'Permisos de tabla entera de anon y authenticated (information_schema.role_table_grants) = 4.5',
     v_esp, coalesce(v_txt, 'ninguno'), v_txt is not distinct from v_esp);

  -- 12.3 service_role lo puede todo (scripts de administración)
  v_txt := case
    when has_table_privilege('service_role', 'public.properties', 'SELECT')
     and has_table_privilege('service_role', 'public.properties', 'INSERT')
     and has_table_privilege('service_role', 'public.properties', 'UPDATE')
     and has_table_privilege('service_role', 'public.properties', 'DELETE')
     and has_table_privilege('service_role', 'public.team', 'SELECT')
     and has_table_privilege('service_role', 'public.team', 'INSERT')
     and has_table_privilege('service_role', 'public.team', 'UPDATE')
     and has_table_privilege('service_role', 'public.team', 'DELETE')
    then 'sí' else 'no' end;
  insert into resultados values
    (12, 3, 'service_role lee y escribe properties y team', 'sí', v_txt, v_txt = 'sí');

  -- 12.4 Quién ejecuta cada función
  select string_agg(
           x.funcion || ': '
           || case when has_function_privilege('public', x.firma, 'EXECUTE') then 'PUBLIC ' else '' end
           || case when has_function_privilege('anon', x.firma, 'EXECUTE') then 'anon ' else '' end
           || case when has_function_privilege('authenticated', x.firma, 'EXECUTE') then 'authenticated' else 'nadie de la API' end,
           ', ' order by x.funcion)
    into v_txt
  from (values ('is_team', 'public.is_team()'),
               ('properties_before_write', 'public.properties_before_write()'),
               ('properties_before_delete', 'public.properties_before_delete()')) as x(funcion, firma);
  v_esp := 'is_team: authenticated, properties_before_delete: nadie de la API, properties_before_write: nadie de la API';
  insert into resultados values
    (12, 4, 'is_team() solo para authenticated, y las funciones de los disparadores para nadie',
     v_esp, v_txt, v_txt = v_esp);

  -- 12.5 is_team() security definer con search_path vacío, y los disparadores, invoker
  select string_agg(
           p.proname || ' ' || case when p.prosecdef then 'definer' else 'invoker' end
           || case when 'search_path=""' = any (coalesce(p.proconfig, '{}')) then ' search_path vacío' else ' SIN search_path' end,
           ', ' order by p.proname)
    into v_txt
  from pg_proc p
  where p.oid in ('public.is_team()'::regprocedure,
                  'public.properties_before_write()'::regprocedure,
                  'public.properties_before_delete()'::regprocedure);
  v_esp := 'is_team definer search_path vacío, properties_before_delete invoker search_path vacío, '
        || 'properties_before_write invoker search_path vacío';
  insert into resultados values
    (12, 5, 'Las funciones: is_team() security definer, las de los disparadores invoker, todas con search_path vacío',
     v_esp, v_txt, v_txt = v_esp);

  -- 12.6 RLS activado en las dos tablas
  select string_agg(c.relname || ' ' || case when c.relrowsecurity then 'con RLS' else 'SIN RLS' end, ', '
                    order by c.relname)
    into v_txt
  from pg_class c
  where c.oid in ('public.properties'::regclass, 'public.team'::regclass);
  v_esp := 'properties con RLS, team con RLS';
  insert into resultados values
    (12, 6, 'RLS activado en properties y team', v_esp, v_txt, v_txt = v_esp);

  -- 12.7 Las políticas, exactamente las de 4.4
  select string_agg(x.linea, ' | ' order by x.linea collate "C")
    into v_txt
  from (
    select p.tablename::text || ' ' || p.cmd || ' ' || array_to_string(p.roles::text[], ',') as linea
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in ('properties', 'team')
  ) x;
  v_esp := 'properties DELETE authenticated | properties INSERT authenticated | properties SELECT anon | '
        || 'properties SELECT authenticated | properties UPDATE authenticated | team SELECT authenticated';
  insert into resultados values
    (12, 7, 'Las políticas de properties y team (tabla, orden y papel)', v_esp, coalesce(v_txt, 'ninguna'),
     v_txt is not distinct from v_esp);

  -- 12.8 Los dos disparadores, activos
  select string_agg(t.tgname || ' ' || t.tgenabled::text, ', ' order by t.tgname)
    into v_txt
  from pg_trigger t
  where t.tgrelid = 'public.properties'::regclass
    and not t.tgisinternal;
  v_esp := 'properties_before_delete O, properties_before_write O';
  insert into resultados values
    (12, 8, 'Los disparadores de properties, activos (O)', v_esp, coalesce(v_txt, 'ninguno'),
     v_txt is not distinct from v_esp);

  -- 12.9 Las restricciones check de properties
  select string_agg(c.conname, ', ' order by c.conname)
    into v_txt
  from pg_constraint c
  where c.conrelid = 'public.properties'::regclass
    and c.contype = 'c';
  v_esp := 'properties_banos_validos, properties_descripcion_valida, properties_destacada_solo_disponible, '
        || 'properties_direccion_valida, properties_estado_valido, properties_habitaciones_validas, '
        || 'properties_operacion_valida, properties_precio_valido, properties_publicado_con_fecha, '
        || 'properties_slug_valido, properties_superficie_valida, properties_tipo_valido, '
        || 'properties_titulo_valido, properties_zona_valida';
  insert into resultados values
    (12, 9, 'Las restricciones check de properties (4.1)', v_esp, coalesce(v_txt, 'ninguna'),
     v_txt is not distinct from v_esp);
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- Resultado: una sola fila BIEN, o una fila MAL por cada fallo
-- ════════════════════════════════════════════════════════════════════════════
select r.resultado, r.caso, r.n, r.comprobacion, r.esperado, r.obtenido
from (
  select 'MAL' as resultado, x.caso, x.n, x.comprobacion, x.esperado, x.obtenido
  from resultados x
  where x.bien is not true

  union all

  select 'MAL', c.caso, null, 'Caso ' || c.caso || ' de la sección 4.6: no ha llegado a comprobarse',
         'comprobado', 'sin resultados'
  from generate_series(1, 12) as c(caso)
  where not exists (select 1 from resultados x where x.caso = c.caso)
    and not exists (select 1 from resultados x where x.caso = 0 and x.bien is not true)

  union all

  select 'BIEN', null, null, 'Los 12 casos de la sección 4.6: ' || count(*) || ' comprobaciones', null, null
  from resultados x
  having count(*) > 0
     and bool_and(x.bien is true)
     and count(distinct x.caso) filter (where x.caso between 1 and 12) = 12
) r
order by r.caso nulls first, r.n nulls first;

rollback;
