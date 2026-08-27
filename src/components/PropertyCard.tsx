import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/data/properties";
import { propertyStatusLabels, propertyTypeLabels } from "@/data/properties";
import { formatPrice } from "@/lib/site";

const statusBadgeStyles: Record<string, string> = {
  reservado: "bg-[#b8860b]/90",
  vendido: "bg-graphite/90",
};

export default function PropertyCard({ property }: { property: Property }) {
  const notAvailable = property.status !== "disponible";

  return (
    <Link
      href={`/inmuebles/${property.slug}`}
      className="group block bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={property.images[0]}
          alt={property.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={`object-cover transition-transform duration-700 group-hover:scale-105 ${notAvailable ? "grayscale" : ""}`}
        />
        <span className="absolute left-4 top-4 bg-graphite/80 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-cream backdrop-blur-sm">
          {property.operation === "venta" ? "En venta" : "En alquiler"}
        </span>
        {notAvailable && (
          <span
            className={`absolute right-4 top-4 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-cream backdrop-blur-sm ${statusBadgeStyles[property.status]}`}
          >
            {propertyStatusLabels[property.status]}
          </span>
        )}
      </div>
      <div className="p-5">
        <p className="text-[11px] font-medium uppercase tracking-widest text-gold">
          {propertyTypeLabels[property.type]} · {property.zone}
        </p>
        <h3 className="mt-2 font-serif text-xl leading-snug text-graphite transition-colors group-hover:text-terracotta">
          {property.title}
        </h3>
        <p className="mt-3 text-lg font-medium text-terracotta">
          {formatPrice(property.price, property.operation)}
        </p>
        <div className="mt-4 flex gap-5 border-t border-line pt-4 text-[13px] text-graphite-soft">
          <span>{property.sqm} m²</span>
          {property.rooms > 0 && (
            <span>
              {property.rooms} {property.rooms === 1 ? "hab." : "habs."}
            </span>
          )}
          <span>
            {property.baths} {property.baths === 1 ? "baño" : "baños"}
          </span>
        </div>
      </div>
    </Link>
  );
}
