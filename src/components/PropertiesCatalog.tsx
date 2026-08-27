"use client";

import { useMemo, useState } from "react";
import type {
  Operation,
  Property,
  PropertyStatus,
  PropertyType,
} from "@/data/properties";
import { propertyStatusLabels, propertyTypeLabels } from "@/data/properties";
import PropertyCard from "./PropertyCard";

interface PropertiesCatalogProps {
  properties: Property[];
  zones: string[];
  /** Preselección de operación, p. ej. en /alquiler. */
  initialOperation?: Operation | "todas";
}

const priceRanges = [
  { value: "todas", label: "Cualquier precio" },
  { value: "0-400000", label: "Hasta 400.000 €" },
  { value: "400000-700000", label: "400.000 – 700.000 €" },
  { value: "700000-99999999", label: "Más de 700.000 €" },
] as const;

export default function PropertiesCatalog({
  properties,
  zones,
  initialOperation = "todas",
}: PropertiesCatalogProps) {
  const [operation, setOperation] = useState<Operation | "todas">(initialOperation);
  const [type, setType] = useState<PropertyType | "todas">("todas");
  const [zone, setZone] = useState<string>("todas");
  const [priceRange, setPriceRange] = useState<string>("todas");
  const [status, setStatus] = useState<PropertyStatus | "todas">("todas");

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (operation !== "todas" && p.operation !== operation) return false;
      if (type !== "todas" && p.type !== type) return false;
      if (zone !== "todas" && p.zone !== zone) return false;
      if (status !== "todas" && p.status !== status) return false;
      if (priceRange !== "todas" && p.operation === "venta") {
        const [min, max] = priceRange.split("-").map(Number);
        if (p.price < min || p.price > max) return false;
      }
      return true;
    });
  }, [properties, operation, type, zone, status, priceRange]);

  if (properties.length === 0) {
    return (
      <div className="border border-line bg-white p-12 text-center">
        <p className="font-serif text-xl text-graphite">
          Estamos actualizando nuestra cartera
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-graphite-soft">
          Ahora mismo no tenemos inmuebles publicados en la web. Cuéntanos qué
          buscas y te avisamos en cuanto entre en cartera algo que encaje.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 border-b border-line pb-8">
        <div className="flex overflow-hidden border border-line">
          {(["todas", "venta", "alquiler"] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setOperation(op)}
              className={`px-5 py-2.5 text-[13px] font-medium uppercase tracking-widest transition-colors ${
                operation === op
                  ? "bg-graphite text-cream"
                  : "bg-white text-graphite-soft hover:text-graphite"
              }`}
            >
              {op === "todas" ? "Todo" : op === "venta" ? "Venta" : "Alquiler"}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="filtro-tipo" className="form-label">
            Tipo
          </label>
          <select
            id="filtro-tipo"
            value={type}
            onChange={(e) => setType(e.target.value as PropertyType | "todas")}
            className="field w-48"
          >
            <option value="todas">Todos los tipos</option>
            {Object.entries(propertyTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filtro-zona" className="form-label">
            Zona
          </label>
          <select
            id="filtro-zona"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="field w-48"
          >
            <option value="todas">Todas las zonas</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filtro-estado" className="form-label">
            Estado
          </label>
          <select
            id="filtro-estado"
            value={status}
            onChange={(e) => setStatus(e.target.value as PropertyStatus | "todas")}
            className="field w-44"
          >
            <option value="todas">Todos los estados</option>
            {Object.entries(propertyStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filtro-precio" className="form-label">
            Precio (venta)
          </label>
          <select
            id="filtro-precio"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="field w-52"
          >
            {priceRanges.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-6 text-sm text-graphite-soft">
        {filtered.length}{" "}
        {filtered.length === 1 ? "inmueble encontrado" : "inmuebles encontrados"}
      </p>

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PropertyCard key={p.slug} property={p} />
          ))}
        </div>
      ) : (
        <div className="mt-10 border border-line bg-white p-12 text-center">
          <p className="font-serif text-xl text-graphite">
            No hay inmuebles con esos criterios
          </p>
          <p className="mt-2 text-sm text-graphite-soft">
            Prueba a ampliar los filtros o cuéntanos qué buscas y te avisaremos
            cuando entre en cartera.
          </p>
        </div>
      )}
    </div>
  );
}
