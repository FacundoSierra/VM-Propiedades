export type PropertyType =
  | "piso"
  | "atico"
  | "chalet"
  | "loft"
  | "apartamento"
  | "local";

export type Operation = "venta" | "alquiler";

/**
 * Estados de un inmueble.
 * - `borrador`: solo se ve en el panel. Una vez que ha salido en la web no vuelve a borrador.
 * - `disponible`: sale en la web. En el panel se llama «Publicado».
 * - `reservado` y `vendido`: siguen en la web con su cartel hasta que se ocultan.
 * - `oculto`: no sale en la web, pero no se borra.
 */
export type PropertyStatus =
  | "borrador"
  | "disponible"
  | "reservado"
  | "vendido"
  | "oculto";

/** Los estados que salen en la web pública. */
export type PublicStatus = Extract<
  PropertyStatus,
  "disponible" | "reservado" | "vendido"
>;

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
  /** ISO 8601. Lo pone la base cada vez que se guarda (`updated_at`). */
  updatedAt?: string;
  /** ISO 8601. La primera vez que salió en la web (`published_at`, lo pone la base); desde entonces no vuelve a borrador. */
  publishedAt?: string;
}

export const propertyTypeLabels: Record<PropertyType, string> = {
  piso: "Piso",
  atico: "Ático",
  chalet: "Chalet",
  loft: "Loft",
  apartamento: "Apartamento",
  local: "Local comercial",
};

export const publicStatuses: PublicStatus[] = [
  "disponible",
  "reservado",
  "vendido",
];

/** Cómo se llama cada estado en la web pública (filtro del catálogo y carteles). */
export const propertyStatusLabels: Record<PropertyStatus, string> = {
  borrador: "Borrador",
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
  oculto: "Oculto",
};

/** Cómo se llama cada estado en el panel, en el orden en que se enseñan. */
export const panelStatusLabels: Record<PropertyStatus, string> = {
  borrador: "Borrador",
  disponible: "Publicado",
  reservado: "Reservado",
  vendido: "Vendido",
  oculto: "Oculto",
};

const allStatuses = Object.keys(panelStatusLabels) as PropertyStatus[];

export function isPropertyStatus(value: unknown): value is PropertyStatus {
  return (
    typeof value === "string" && (allStatuses as string[]).includes(value)
  );
}

export function isPublic(p: Pick<Property, "status">): boolean {
  return (publicStatuses as string[]).includes(p.status);
}

/** Como mucho salen 4 en la portada: es lo que cabe en una fila. Es el mismo 4 que
 * comprueba la base (disparador `properties_before_write`): si cambia uno, cambia
 * el otro, con una migración nueva. */
export const MAX_FEATURED = 4;

/*
 * Los inmuebles viven en Supabase (tabla `public.properties`, ADR-001). Se leen
 * en `src/lib/propertiesStore.ts`: la web, solo lo publicado y en caché; el
 * panel, todo y con la sesión de quien entra.
 */
