export const site = {
  name: "VM Propiedades",
  tagline: "Tu agencia inmobiliaria de confianza en Madrid",
  description:
    "Agencia inmobiliaria boutique en Madrid con más de 20 años de experiencia. Compra-venta, alquiler, gestoría, financiación y valoración gratuita.",
  url: "https://www.vm-propiedades.es",
  email: "gestion@vm-propiedades.es",
  phone: "685 187 399",
  phoneHref: "+34685187399",
  whatsappUrl: "https://wa.me/34685187399",
  address: "Madrid, España",
  social: {
    instagram: "https://www.instagram.com/vmpropiedades",
    facebook: "https://www.facebook.com/vmpropiedades",
  },
} as const;

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
