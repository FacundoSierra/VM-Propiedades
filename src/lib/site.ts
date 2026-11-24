export const site = {
  name: "VM Propiedades",
  tagline: "Tu agencia inmobiliaria de confianza en Madrid",
  description:
    "Agencia inmobiliaria boutique en Madrid con más de 20 años de experiencia. Compra-venta, alquiler, gestoría, financiación y valoración gratuita.",
  url: "https://www.vm-propiedades.es",
  /**
   * El panel de inmuebles, en su propio subdominio (ADR-002). Es la misma app de
   * Next que la web: `src/proxy.ts` reparte por dominio. Si cambia, cambia
   * también la `Site URL` de Supabase Auth y el `matcher` de `src/proxy.ts`.
   */
  panelUrl: "https://panel.vm-propiedades.es",
  email: "gestion@vm-propiedades.es",
  phone: "685 187 399",
  phoneHref: "+34685187399",
  whatsappUrl: "https://wa.me/34685187399",
  address: "Madrid, España",
  social: {
    instagram: "https://www.instagram.com/vm_propiedades_madrid/",
  },
} as const;

/**
 * Datos del titular para el aviso legal y la política de privacidad (LSSI-CE y RGPD).
 * Lo que esté vacío no se muestra: al rellenarlo aquí aparece solo en las dos páginas.
 * Falta el domicilio fiscal, que ahora sale como `site.address` ("Madrid, España").
 */
export const legal: {
  razonSocial?: string;
  nif?: string;
  domicilio?: string;
  registrales?: string;
} = {
  razonSocial: "Andrea Valentina Morales Pérez",
  nif: "X8136817S",
};

export const nav = [
  { href: "/", label: "Inicio" },
  { href: "/inmuebles", label: "Inmuebles" },
  { href: "/compra-venta", label: "Compra-Venta" },
  { href: "/alquiler", label: "Alquiler" },
  { href: "/gestoria", label: "Gestoría" },
  { href: "/financiacion", label: "Financiación" },
  { href: "/quienes-somos", label: "Quiénes Somos" },
  { href: "/contacto", label: "Contacto" },
] as const;

export function formatPrice(price: number, operation: "venta" | "alquiler") {
  const formatted = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
  return operation === "alquiler" ? `${formatted}/mes` : formatted;
}
