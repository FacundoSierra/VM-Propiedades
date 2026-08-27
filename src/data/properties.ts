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

/**
 * Cartera de inmuebles.
 *
 * Vacío a propósito: los inmuebles de ejemplo (ficticios) se han retirado.
 * Cuando exista un panel de gestión, este array se sustituirá por datos
 * reales (o por una consulta a la fuente que los almacene).
 */
export const properties: Property[] = [];

export const zones = [...new Set(properties.map((p) => p.zone))].sort();

export function getProperty(slug: string) {
  return properties.find((p) => p.slug === slug);
}

export function getFeatured() {
  return properties.filter((p) => p.featured);
}
