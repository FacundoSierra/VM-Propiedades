import type { MetadataRoute } from "next";
import { getPublicProperties } from "@/lib/propertiesStore";
import { site } from "@/lib/site";

// Se rehace cuando el panel guarda (etiqueta `properties`) o, como mucho, cada hora.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const properties = await getPublicProperties();

  const staticRoutes = [
    "",
    "/quienes-somos",
    "/inmuebles",
    "/compra-venta",
    "/alquiler",
    "/gestoria",
    "/financiacion",
    "/valoracion",
    "/contacto",
  ].map((path) => ({
    url: `${site.url}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  // Las fichas, con la fecha de su último guardado (la pone la base).
  const propertyRoutes = properties.map((p) => ({
    url: `${site.url}/inmuebles/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...propertyRoutes];
}
