import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import PropertiesCatalog from "@/components/PropertiesCatalog";
import { getPublicProperties, getZones } from "@/lib/propertiesStore";

export const metadata: Metadata = {
  title: "Inmuebles en venta y alquiler en Madrid",
  description:
    "Catálogo de pisos, áticos, chalets, lofts y locales en Madrid. Filtra por operación, tipo, zona y precio.",
};

// Página estática que se rehace cuando el panel guarda (etiqueta `properties`) o, como mucho, cada hora.
export const revalidate = 3600;

export default async function InmueblesPage() {
  const [properties, zones] = await Promise.all([getPublicProperties(), getZones()]);

  return (
    <>
      <PageHero
        eyebrow="Inmuebles"
        title="Consulta el inmueble de tus sueños con VM Propiedades"
        subtitle="Descubre nuestra selección de inmuebles en venta. Encuentra casas, pisos y propiedades ideales para tu inversión o nuevo hogar con VM Propiedades."
      />
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <PropertiesCatalog properties={properties} zones={zones} />
      </section>
    </>
  );
}
