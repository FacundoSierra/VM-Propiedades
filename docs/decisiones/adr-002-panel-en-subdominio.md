# ADR-002: El panel va en `panel.vm-propiedades.es`, en el mismo proyecto de Vercel

- Fecha: 2026-11-24
- Estado: aceptada (decidido por Facundo el 2026-11-24). Sustituye el punto 5 de [ADR-001](adr-001-supabase-en-vez-de-github-json.md) («el panel se queda en `/admin`»)
- Requerimiento: REQ-001
- Especificación: [`docs/specs/req-001-panel-con-supabase.md`](../specs/req-001-panel-con-supabase.md), secciones 3.5 y 7.2

## Contexto
El plan de REQ-001 dejaba el panel en `www.vm-propiedades.es/admin`, porque no se sabía dónde estaba el dominio ni había acceso a su DNS. Ya se sabe: está en IONOS y Facundo puede añadir registros. Con eso, el panel puede tener su propia dirección, más fácil de recordar para la clienta («panel.vm-propiedades.es») y separada de la web.

## Decisión
1. **El panel se abre en `https://panel.vm-propiedades.es`**, con direcciones limpias: `/`, `/login`, `/nuevo`, `/<slug>/editar`, `/cuenta`, `/recuperar` y `/nueva-contrasena`.
2. **Un solo proyecto de Vercel con dos dominios** (`www` y `panel`), y una sola app de Next. Las rutas no se mueven: siguen en `src/app/admin/**` y `src/app/api/admin/**`. `src/proxy.ts` reparte por el dominio (`Host`):
   - en `panel.`, reescribe `/<ruta>` a `/admin/<ruta>`; `/api/admin/*`, `/_next/*` y los archivos pasan tal cual; lo que llegue con `/admin` delante va (308) a la misma ruta sin él;
   - en `www` y en el dominio sin `www`, `/admin/*` va (308) a `panel.`, por si la clienta tiene guardada la dirección vieja, y `/api/admin/*` da 404;
   - en cualquier otro dominio (las vistas previas `*.vercel.app` y `localhost`), el panel sigue en `/admin/*`, para poder probarlo.
3. **Los enlaces del panel salen ya en la forma buena** para cada dominio, sin pasar por la redirección: el prefijo (ninguno o `/admin`) se calcula en el servidor con el dominio de la petición, y los componentes lo leen con `usePanelHref()` (`src/components/admin/PanelLinks.tsx` y `src/lib/panelHost.ts`).
4. **Las cookies de la sesión no llevan `Domain`**: son solo del dominio del panel, la web no las recibe nunca y su caché no se ve afectada.
5. **`X-Robots-Tag: noindex, nofollow` en todo lo que no sea `www`** (el panel, las vistas previas y `localhost`), desde `next.config.ts` y el proxy. `/robots.txt` en `panel.` es el mismo de la web: no hace falta otro, porque el `noindex` va en cada respuesta.
6. **Supabase Auth apunta al panel**: la Site URL es `https://panel.vm-propiedades.es`, la única Redirect URL es `https://panel.vm-propiedades.es/nueva-contrasena` y la plantilla de recuperar enlaza a `{{ .SiteURL }}/nueva-contrasena?token_hash={{ .TokenHash }}&type=recovery`.
7. **La dirección del panel está en el código**, en `site.panelUrl` de `src/lib/site.ts`, junto a `site.url`: es el dominio de la clienta, no un secreto ni algo que cambie por entorno.

## Alternativas consideradas
- **Quedarse en `/admin`**, como decía ADR-001. Funciona, pero la dirección es menos clara para la clienta y mezcla el panel con la web (las cookies de la sesión llegarían a `www`).
- **Dos proyectos de Vercel** (uno para la web y otro para el panel). Duplica variables, despliegues y el almacén de Blob, y las dos apps tendrían que compartir el modelo y las reglas. Con un proyecto, todo se publica junto y no hay nada que sincronizar.
- **Mover las rutas a la raíz** (`src/app/(panel)/…`) y repartir por dominio en cada página. Habría que rehacer la estructura de carpetas recién hecha y separar en cada página lo de la web y lo del panel. Reescribir en el proxy no toca ninguna pantalla.
- **La dirección del panel en una variable de entorno.** Es una dirección fija y pública, como `site.url`: una variable más que configurar en tres entornos no aporta nada.

## Consecuencias
- **Se gana**: una dirección propia para el panel, la sesión aislada de la web y las direcciones viejas de `/admin` siguen funcionando (llevan al subdominio).
- **Cuesta**:
  - un CNAME `panel` en el DNS de IONOS y el dominio añadido al proyecto de Vercel (hecho el 2026-11-25);
  - el proxy pasa por todas las peticiones de `panel.` (no por las de `www`: su `matcher` solo coge el panel por el dominio, para no tocar la web ni su caché);
  - la cabecera, el pie y el botón de WhatsApp de la web se esconden en el panel mirando el segmento de la ruta (`useSelectedLayoutSegment()`) y no la dirección, que en `panel.` no lleva `/admin`.
- **Probar**: en local, `http://panel.localhost:3000` (como en producción) o `http://localhost:3000/admin` (como en una vista previa). En una vista previa, el enlace del correo de recuperar lleva a `panel.`: se copia su `token_hash` en `<vista previa>/admin/nueva-contrasena?token_hash=…&type=recovery`.
- **Si cambia el dominio del panel**: `site.panelUrl`, el `matcher` de `src/proxy.ts` (su valor tiene que ser constante), la Site URL y la Redirect URL de Supabase Auth, y el dominio en Vercel.
