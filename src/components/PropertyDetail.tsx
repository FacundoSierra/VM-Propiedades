import Link from "next/link";
import ContactForm from "@/components/forms/ContactForm";
import PropertyCard from "@/components/PropertyCard";
import PropertyGallery from "@/components/PropertyGallery";
import {
  propertyStatusLabels,
  propertyTypeLabels,
  type Property,
} from "@/data/properties";
import { formatPrice, site } from "@/lib/site";

interface PropertyDetailProps {
  property: Property;
  /** «También te puede interesar». */
  related?: Property[];
  /**
   * Vista previa del panel: sin la cabecera de la web encima (no hace falta
   * dejarle hueco), sin enlaces que saquen del editor y con el formulario de
   * contacto desactivado.
   */
  preview?: boolean;
}

/**
 * La ficha de un inmueble. La usan la página pública y la vista previa del
 * panel, para que lo que se ve antes de publicar sea exactamente lo que sale.
 */
export default function PropertyDetail({ property, related = [], preview = false }: PropertyDetailProps) {
  return (
    <>
      <div className={`bg-graphite pb-10 text-cream ${preview ? "pt-10" : "pt-32"}`}>
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <nav aria-label="Miga de pan" className="text-xs uppercase tracking-widest text-cream/50">
            {preview ? (
              <span>Inmuebles</span>
            ) : (
              <Link href="/inmuebles" className="hover:text-cream">
                Inmuebles
              </Link>
            )}{" "}
            / {propertyTypeLabels[property.type]}
          </nav>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="max-w-2xl font-serif text-3xl leading-tight md:text-5xl">
                {property.title}
              </h1>
              <p className="mt-3 text-sm text-cream/70">{property.address}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-gold">
                {property.operation === "venta" ? "En venta" : "En alquiler"}
                {property.status !== "disponible" &&
                  ` · ${propertyStatusLabels[property.status]}`}
              </p>
              <p className="mt-1 font-serif text-3xl md:text-4xl">
                {formatPrice(property.price, property.operation)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-14 md:px-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <PropertyGallery images={property.images} title={property.title} />

          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4">
            {[
              { label: "Superficie", value: `${property.sqm} m²` },
              {
                label: "Habitaciones",
                value: property.rooms > 0 ? String(property.rooms) : "—",
              },
              { label: "Baños", value: String(property.baths) },
              { label: "Zona", value: property.zone },
            ].map((item) => (
              <div key={item.label} className="bg-white p-5 text-center">
                <dt className="text-[11px] uppercase tracking-widest text-graphite-soft">
                  {item.label}
                </dt>
                <dd className="mt-1 font-serif text-xl text-graphite">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10">
            <h2 className="font-serif text-2xl text-graphite">Descripción</h2>
            <p className="mt-4 leading-relaxed text-graphite-soft">
              {property.description}
            </p>
          </div>

          <div className="mt-10">
            <h2 className="font-serif text-2xl text-graphite">Características</h2>
            <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {property.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-graphite-soft">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-gold" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10">
            <h2 className="font-serif text-2xl text-graphite">Ubicación</h2>
            <p className="mt-2 text-sm text-graphite-soft">{property.address}</p>
            <div className="mt-4 overflow-hidden border border-line">
              <iframe
                title={`Mapa de la zona: ${property.zone}, Madrid`}
                src="https://www.openstreetmap.org/export/embed.html?bbox=-3.7420%2C40.3950%2C-3.6450%2C40.4650&layer=mapnik"
                className="h-80 w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border border-line bg-white p-6 md:p-8">
            <h2 className="font-serif text-xl text-graphite">
              ¿Te interesa este inmueble?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-graphite-soft">
              Escríbenos y organizamos una visita sin compromiso.
            </p>
            <div className="mt-6">
              <ContactForm subject={property.title} preview={preview} />
            </div>
            <div className="mt-6 border-t border-line pt-5 text-center text-sm text-graphite-soft">
              <p>
                También por teléfono o WhatsApp:{" "}
                <a href={`tel:${site.phoneHref}`} className="text-terracotta underline">
                  {site.phone}
                </a>
              </p>
            </div>
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="bg-cream-dark py-20">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <h2 className="font-serif text-3xl text-graphite">
              También te puede interesar
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PropertyCard key={p.slug} property={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
