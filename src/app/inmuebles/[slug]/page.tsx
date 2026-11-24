import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PropertyDetail from "@/components/PropertyDetail";
import { propertyTypeLabels } from "@/data/properties";
import { getProperty, getPublicProperties } from "@/lib/propertiesStore";
import { formatPrice, site } from "@/lib/site";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Ninguna ficha se genera al compilar: cada una se genera en su primera visita y
 * se guarda, así el build no depende de cuántas haya. Se rehace cuando el panel
 * guarda (etiqueta `properties`) o, como mucho, cada hora. Un borrador, un
 * oculto o un slug que no existe dan un 404 de verdad.
 */
export function generateStaticParams() {
  return [];
}

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) return {};
  return {
    title: property.title,
    description: `${propertyTypeLabels[property.type]} en ${property.zone}, ${property.sqm} m² — ${formatPrice(property.price, property.operation)}. ${property.description.slice(0, 120)}…`,
    openGraph: property.images[0] ? { images: [property.images[0]] } : undefined,
  };
}

export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  const related = (await getPublicProperties())
    .filter((p) => p.slug !== property.slug && p.operation === property.operation)
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: property.title,
    description: property.description,
    image: property.images,
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "EUR",
      availability:
        property.status === "vendido"
          ? "https://schema.org/SoldOut"
          : property.status === "reservado"
            ? "https://schema.org/Reserved"
            : "https://schema.org/InStock",
      seller: { "@type": "RealEstateAgent", name: site.name },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Los textos vienen de la base: `<` escapado para que nada pueda cerrar el <script>.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PropertyDetail property={property} related={related} />
    </>
  );
}
