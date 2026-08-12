import type { MetadataRoute } from "next";
import { properties } from "@/data/properties";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
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

  const propertyRoutes = properties.map((p) => ({
    url: `${site.url}/inmuebles/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...propertyRoutes];
}
