import type { NextConfig } from "next";

// Lo que no debe salir en Google. Va en la cabecera, y no en robots.txt, porque
// un `Disallow` impediría a Google leer este `noindex` (REQ-001, sección 8.4).
const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      // Todo lo que no sea la web de verdad: el panel (panel.vm-propiedades.es),
      // las vistas previas de Vercel y localhost (ADR-002).
      {
        source: "/:path*",
        missing: [{ type: "host", value: "(?:www\\.)?vm-propiedades\\.es" }],
        headers: noIndex,
      },
      // Las rutas del panel, en cualquier dominio (en la web llevan al subdominio).
      { source: "/admin/:path*", headers: noIndex },
      { source: "/api/admin/:path*", headers: noIndex },
    ];
  },
};

export default nextConfig;
