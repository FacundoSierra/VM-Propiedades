import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Sin `disallow` para el panel: vive en `panel.vm-propiedades.es` (ADR-002), donde
 * todas las respuestas llevan `X-Robots-Tag: noindex`, y `/admin` en la web
 * redirige allí. Si se bloqueara aquí, Google no podría leer ese `noindex`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
