# VM Propiedades — Análisis y Brief para Rediseño con Claude Code

## 1. Resumen del negocio

- **Nombre:** VM Propiedades
- **Sector:** Agencia inmobiliaria en Madrid
- **Propuesta de valor:** +20 años de experiencia, trato cercano/profesional/transparente
- **Servicios:** Compra-venta, alquiler, gestoría, financiación, valoración gratuita, inversión inmobiliaria
- **Tipos de inmueble:** chalets, áticos, lofts, pisos, apartamentos, locales comerciales
- **Contacto:** gestion@vm-propiedades.es · 685 187 399 · Madrid · WhatsApp · Facebook · Instagram

## 2. Análisis de la web actual

**Stack detectado:** plantilla de constructor web (tipo Duda/GoDaddy Website Builder), CDN `le-de.cdn-website.com`, Google Tag Manager. No es código a medida.

**Estructura de navegación (9 páginas):**
1. Inicio
2. Quiénes Somos
3. Compra-Venta
4. Alquiler
5. Inmuebles
6. Gestoría
7. Financiación
8. Valoración
9. Contacto
(+ Aviso Legal, Política de Privacidad, Cookies, Accesibilidad)

**Contenido de la Home:**
- Hero con imagen grande + titular "VM Propiedades / Tu Agencia Inmobiliaria de Confianza en Madrid" + CTA "Contáctanos"
- Sección "Solicita tu Valoración Gratuita" con **dos formularios** (uno para vendedores, otro para compradores) — campos: nombre, apellidos, email, teléfono, tipo de inmueble, dirección/zona, metraje/presupuesto, motivo, descripción, checkbox de privacidad
- Bloque "Servicios Personalizados para Compradores y Vendedores"
- Bloque "Inversiones Inmobiliarias Inteligentes"
- Bloque "Tu Satisfacción es Nuestra Prioridad"
- CTA repetido "¡descubre más!"
- Bloque de contacto (dirección/teléfono/email) con iconos
- Footer con enlaces legales, redes sociales, botón flotante de WhatsApp

**Debilidades detectadas (oportunidades de mejora):**
- Diseño genérico de plantilla, sin identidad visual propia ni sistema de diseño coherente
- Jerarquía tipográfica pobre (exceso de negritas/mayúsculas sueltas sin estructura)
- No hay listado real de propiedades/inmuebles visible ni fichas con fotos, precio, m², filtros
- Repetición de CTAs sin variedad ("Contáctanos" en todos lados)
- Sin testimonios, casos de éxito ni prueba social (fotos del equipo, reseñas)
- Formularios largos y duplicados en home (fricción)
- Falta de mapa, galería de imágenes de calidad, señales de confianza (colegiado API/AEGI, sellos)
- No parece responsive-first ni optimizada en Core Web Vitals (imágenes pesadas sin lazy-load aparente)
- Sin blog/contenido SEO, sin buscador de propiedades

## 3. Sitemap propuesto (mejorado, misma esencia)

```
/                    Home
/quienes-somos        Sobre nosotros + equipo + trayectoria
/inmuebles             Catálogo con filtros (venta/alquiler, zona, precio, m², tipo)
/inmuebles/[slug]      Ficha de propiedad (galería, mapa, características, contacto)
/compra-venta          Servicio de compraventa
/alquiler               Servicio de alquiler
/gestoria               Servicio de gestoría
/financiacion           Servicio de financiación (calculadora hipoteca)
/valoracion             Formulario de valoración gratuita
/contacto               Formulario + mapa + datos
/aviso-legal, /privacidad, /cookies, /accesibilidad
```

## 4. Dirección de diseño (elegante y profesional)

**Concepto:** inmobiliaria boutique madrileña — cálido, sobrio, confianza, "menos pero mejor".

- **Paleta:** base neutra cálida (blanco roto / crema `#F7F5F1`), grafito casi negro para texto (`#1C1B19`), un acento tierra/terracota o verde botella oscuro (`#7A3B2E` o `#243B2E`) usado con moderación, dorado sutil solo en detalles (líneas, iconos)
- **Tipografía:** una serif editorial para titulares (ej. estilo "Fraunces", "Playfair Display" o "Canela") + sans-serif limpia para texto (ej. "Inter", "General Sans"). Contraste serif/sans = sensación premium inmobiliaria
- **Fotografía:** imágenes grandes de arquitectura/interiores con tratamiento consistente (nada de stock genérico), overlays sutiles, mucho espacio en blanco
- **Componentes clave:**
  - Header transparente sobre hero que se solidifica al hacer scroll
  - Hero con imagen a pantalla completa, titular corto + subtítulo + un único CTA
  - Grid de propiedades tipo tarjeta con hover elegante (imagen, precio, ubicación, m², habitaciones)
  - Sección "Quiénes somos" con foto real del equipo/fundador, no solo texto
  - Testimonios en carrusel o grid con nombre/foto
  - Un solo formulario de contacto por página (no duplicar comprador/vendedor en home; mover a página de valoración)
  - Footer denso pero ordenado, con mapa embebido
  - Micro-interacciones sutiles (fade-in al scroll, transiciones suaves) sin exagerar

## 5. Arquitectura técnica recomendada

- **Framework:** Next.js 14+ (App Router) + TypeScript
- **Estilos:** Tailwind CSS con tokens de diseño personalizados (colores/tipografías del punto 4)
- **Componentes UI:** shadcn/ui como base, personalizado
- **Animaciones:** Framer Motion (sutil)
- **Formularios:** React Hook Form + validación Zod, envío vía API route o servicio (Resend/Formspree)
- **Imágenes:** next/image con lazy loading automático
- **Datos de propiedades:** JSON/Markdown local para empezar (fácil de migrar luego a un CMS headless tipo Sanity o Payload)
- **Mapa:** Mapbox o Google Maps embed
- **SEO:** metadata por página, sitemap.xml, datos estructurados schema.org `RealEstateAgent` y `Product` por inmueble
- **Despliegue:** Vercel

## 6. Prompt listo para usar en Claude Code

```
Quiero construir un sitio web para una inmobiliaria llamada "VM Propiedades" en Madrid,
usando Next.js 14 (App Router), TypeScript y Tailwind CSS.

CONTEXTO DEL NEGOCIO:
- Agencia inmobiliaria con +20 años de experiencia en Madrid
- Servicios: compra-venta, alquiler, gestoría, financiación, valoración gratuita, inversión
- Tono: cercano, profesional, transparente, boutique (no corporativo genérico)
- Contacto: gestion@vm-propiedades.es, tel 685187399, WhatsApp, Instagram/Facebook

DISEÑO:
- Paleta: crema #F7F5F1, grafito #1C1B19, acento terracota #7A3B2E
- Tipografía: serif editorial (Fraunces/Playfair Display) para titulares, sans-serif (Inter) para texto
- Estética: minimalista, mucho espacio en blanco, fotografía grande, sin exceso de CTAs

PÁGINAS A CREAR:
/, /quienes-somos, /inmuebles (con filtros y grid de tarjetas), /inmuebles/[slug],
/compra-venta, /alquiler, /gestoria, /financiacion, /valoracion, /contacto

FUNCIONALIDADES:
- Listado de propiedades con datos mock en JSON (imagen, precio, m², ubicación, habitaciones, tipo)
- Ficha de propiedad con galería, características y formulario de contacto
- Un formulario de valoración gratuita (un solo formulario, no duplicado)
- Header sticky que cambia de transparente a sólido al hacer scroll
- Footer con enlaces legales, redes sociales y mapa
- Botón flotante de WhatsApp
- Animaciones sutiles de aparición al hacer scroll (Framer Motion)
- Totalmente responsive y optimizado para SEO

Empieza creando la estructura del proyecto, el sistema de diseño en tailwind.config,
y luego la página de Inicio.
```

## 7. Notas legales / uso de contenidos

Este brief resume la **estructura, textos propios y funcionalidad** observados en la web pública de VM Propiedades para fines de análisis y rediseño. No reproduce el código fuente de la web original ni imágenes con derechos de terceros (el logo/imagen de portada pertenece a VM Propiedades y no debe reutilizarse sin permiso; sustitúyelo por fotografía propia o de stock con licencia).
