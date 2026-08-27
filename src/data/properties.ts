import propertiesData from "./properties.json";

export type PropertyType =
  | "piso"
  | "atico"
  | "chalet"
  | "loft"
  | "apartamento"
  | "local";

export type Operation = "venta" | "alquiler";

export type PropertyStatus = "disponible" | "reservado" | "vendido";

export interface Property {
  slug: string;
  title: string;
  type: PropertyType;
  operation: Operation;
  status: PropertyStatus;
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

export const propertyStatusLabels: Record<PropertyStatus, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
};

/**
 * Cartera de inmuebles.
 *
 * La fuente de la verdad es `properties.json`, en este mismo directorio.
 * El panel de administración (/admin) modifica ese archivo mediante un
 * commit directo al repositorio de GitHub, lo que dispara un despliegue
 * normal en Vercel.
 */
export const properties: Property[] = propertiesData as Property[];

export const zones = [...new Set(properties.map((p) => p.zone))].sort();

export function getProperty(slug: string) {
  return properties.find((p) => p.slug === slug);
}

export function getFeatured() {
  return properties.filter((p) => p.featured && p.status === "disponible");
}
