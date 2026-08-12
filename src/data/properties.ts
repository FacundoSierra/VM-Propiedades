export type PropertyType =
  | "piso"
  | "atico"
  | "chalet"
  | "loft"
  | "apartamento"
  | "local";

export type Operation = "venta" | "alquiler";

export interface Property {
  slug: string;
  title: string;
  type: PropertyType;
  operation: Operation;
  price: number;
  zone: string;
  address: string;
  sqm: number;
  rooms: number;
  baths: number;
  description: string;
  features: string[];
  images: string[];
  featured?: boolean;
}

export const propertyTypeLabels: Record<PropertyType, string> = {
  piso: "Piso",
  atico: "Ático",
  chalet: "Chalet",
  loft: "Loft",
  apartamento: "Apartamento",
  local: "Local comercial",
};

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;

export const properties: Property[] = [
  {
    slug: "atico-terraza-salamanca",
    title: "Ático con terraza en Salamanca",
    type: "atico",
    operation: "venta",
    price: 895000,
    zone: "Salamanca",
    address: "Calle de Ayala, Barrio de Salamanca",
    sqm: 145,
    rooms: 3,
    baths: 2,
    description:
      "Luminoso ático reformado en el corazón del Barrio de Salamanca. Terraza de 30 m² orientada al oeste, salón con doble altura y cocina abierta de diseño. Finca clásica con ascensor y portero físico.",
    features: [
      "Terraza de 30 m²",
      "Reformado en 2023",
      "Aire acondicionado por conductos",
      "Armarios empotrados",
      "Ascensor y portero físico",
      "Orientación oeste",
    ],
    images: [u("photo-1512917774080-9991f1c4c750"), u("photo-1600585154340-be6161a56a0c"), u("photo-1600607687939-ce8a6c25118c")],
    featured: true,
  },
  {
    slug: "piso-clasico-chamberi",
    title: "Piso clásico reformado en Chamberí",
    type: "piso",
    operation: "venta",
    price: 640000,
    zone: "Chamberí",
    address: "Calle de Trafalgar, Chamberí",
    sqm: 110,
    rooms: 2,
    baths: 2,
    description:
      "Elegante piso en finca de 1920 con elementos originales restaurados: suelos de madera, molduras y balcones a la calle. Reforma integral con calidades altas y cocina equipada.",
    features: [
      "Finca clásica de 1920",
      "Suelos de madera restaurados",
      "Balcones exteriores",
      "Calefacción central",
      "Techos de 3 metros",
    ],
    images: [u("photo-1586023492125-27b2c045efd7"), u("photo-1554995207-c18c203602cb"), u("photo-1556912167-f556f1f39fdf")],
    featured: true,
  },
  {
    slug: "chalet-independiente-las-rozas",
    title: "Chalet independiente con jardín en Las Rozas",
    type: "chalet",
    operation: "venta",
    price: 1150000,
    zone: "Las Rozas",
    address: "Urbanización Molino de la Hoz, Las Rozas",
    sqm: 320,
    rooms: 5,
    baths: 4,
    description:
      "Chalet independiente en parcela de 900 m² con piscina y jardín consolidado. Amplio salón con chimenea, cocina con office, garaje para dos coches y zona de despacho ideal para teletrabajo.",
    features: [
      "Parcela de 900 m²",
      "Piscina privada",
      "Garaje para 2 coches",
      "Chimenea",
      "Urbanización con seguridad",
    ],
    images: [u("photo-1600596542815-ffad4c1539a9"), u("photo-1600585152220-90363fe7e115"), u("photo-1416331108676-a22ccb276e35")],
    featured: true,
  },
  {
    slug: "loft-industrial-malasana",
    title: "Loft de estilo industrial en Malasaña",
    type: "loft",
    operation: "venta",
    price: 425000,
    zone: "Malasaña",
    address: "Calle del Pez, Malasaña",
    sqm: 85,
    rooms: 1,
    baths: 1,
    description:
      "Loft diáfano en antiguo taller rehabilitado. Techos altos con vigas vistas, grandes ventanales y espacio flexible perfecto para vivienda o estudio profesional.",
    features: [
      "Techos de 4 metros",
      "Vigas y ladrillo vistos",
      "Espacio diáfano",
      "Rehabilitación integral",
    ],
    images: [u("photo-1493809842364-78817add7ffb"), u("photo-1502672260266-1c1ef2d93688"), u("photo-1600210492486-724fe5c67fb0")],
  },
  {
    slug: "apartamento-retiro-alquiler",
    title: "Apartamento junto al Retiro",
    type: "apartamento",
    operation: "alquiler",
    price: 1650,
    zone: "Retiro",
    address: "Calle de Ibiza, Retiro",
    sqm: 70,
    rooms: 1,
    baths: 1,
    description:
      "Apartamento amueblado a dos minutos del Parque del Retiro. Salón luminoso, dormitorio con vestidor y cocina totalmente equipada. Disponible para larga temporada.",
    features: [
      "Amueblado",
      "A 2 minutos del Retiro",
      "Cocina equipada",
      "Larga temporada",
    ],
    images: [u("photo-1522708323590-d24dbb6b0267"), u("photo-1560448204-e02f11c3d0e2"), u("photo-1600566753086-00f18fb6b3ea")],
    featured: true,
  },
  {
    slug: "piso-familiar-chamartin-alquiler",
    title: "Piso familiar en Chamartín",
    type: "piso",
    operation: "alquiler",
    price: 2300,
    zone: "Chamartín",
    address: "Calle de Príncipe de Vergara, Chamartín",
    sqm: 130,
    rooms: 3,
    baths: 2,
    description:
      "Amplio piso familiar sin amueblar en zona residencial consolidada. Tres dormitorios, dos baños completos, plaza de garaje incluida y piscina comunitaria.",
    features: [
      "Plaza de garaje incluida",
      "Piscina comunitaria",
      "Conserje",
      "Junto a colegios internacionales",
    ],
    images: [u("photo-1560448204-e02f11c3d0e2"), u("photo-1484154218962-a197022b5858"), u("photo-1554995207-c18c203602cb")],
  },
  {
    slug: "atico-duplex-arganzuela",
    title: "Ático dúplex con vistas en Arganzuela",
    type: "atico",
    operation: "venta",
    price: 520000,
    zone: "Arganzuela",
    address: "Paseo de las Delicias, Arganzuela",
    sqm: 98,
    rooms: 2,
    baths: 2,
    description:
      "Ático dúplex de obra reciente con dos terrazas y vistas despejadas a Madrid Río. Edificio con piscina en cubierta, gimnasio y garaje.",
    features: [
      "Dos terrazas",
      "Obra de 2020",
      "Piscina en cubierta",
      "Gimnasio comunitario",
      "Garaje y trastero",
    ],
    images: [u("photo-1600607687920-4e2a09cf159d"), u("photo-1600573472592-401b489a3cdc"), u("photo-1522708323590-d24dbb6b0267")],
  },
  {
    slug: "piso-luminoso-la-latina",
    title: "Piso luminoso en La Latina",
    type: "piso",
    operation: "venta",
    price: 385000,
    zone: "La Latina",
    address: "Calle de la Cava Baja, La Latina",
    sqm: 78,
    rooms: 2,
    baths: 1,
    description:
      "Piso exterior en el casco histórico, a un paso de la Plaza de la Cebada. Reformado con gusto conservando la esencia del barrio: balcones de forja y luz durante todo el día.",
    features: [
      "Exterior con balcones",
      "Reformado",
      "Casco histórico",
      "Finca rehabilitada",
    ],
    images: [u("photo-1502672260266-1c1ef2d93688"), u("photo-1586023492125-27b2c045efd7"), u("photo-1600210492486-724fe5c67fb0")],
  },
  {
    slug: "local-comercial-chamberi",
    title: "Local comercial a pie de calle en Chamberí",
    type: "local",
    operation: "alquiler",
    price: 2800,
    zone: "Chamberí",
    address: "Calle de Fuencarral, Chamberí",
    sqm: 150,
    rooms: 0,
    baths: 1,
    description:
      "Local diáfano con 8 metros de fachada y gran escaparate en calle comercial de alto tránsito. Salida de humos y licencia de hostelería en vigor.",
    features: [
      "8 m de fachada",
      "Salida de humos",
      "Licencia de hostelería",
      "Alto tránsito peatonal",
    ],
    images: [u("photo-1441986300917-64674bd600d8"), u("photo-1567496898669-ee935f5f647a"), u("photo-1449844908441-8829872d2607")],
  },
  {
    slug: "apartamento-moncloa-inversion",
    title: "Apartamento para inversión en Moncloa",
    type: "apartamento",
    operation: "venta",
    price: 295000,
    zone: "Moncloa",
    address: "Calle de la Princesa, Moncloa",
    sqm: 55,
    rooms: 1,
    baths: 1,
    description:
      "Apartamento alquilado con rentabilidad del 5,2 % anual, ideal para inversores. Zona de alta demanda junto a Ciudad Universitaria, inquilino solvente con contrato en vigor.",
    features: [
      "Rentabilidad 5,2 %",
      "Inquilino con contrato en vigor",
      "Junto a Ciudad Universitaria",
      "Gastos de comunidad bajos",
    ],
    images: [u("photo-1560448204-e02f11c3d0e2"), u("photo-1522708323590-d24dbb6b0267"), u("photo-1484154218962-a197022b5858")],
  },
];

export const zones = [...new Set(properties.map((p) => p.zone))].sort();

export function getProperty(slug: string) {
  return properties.find((p) => p.slug === slug);
}

export function getFeatured() {
  return properties.filter((p) => p.featured);
}
