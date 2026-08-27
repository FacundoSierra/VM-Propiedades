import Link from "next/link";
import AdminPropertyActions from "@/components/admin/AdminPropertyActions";
import LogoutButton from "@/components/admin/LogoutButton";
import type { Property } from "@/data/properties";
import { propertyTypeLabels } from "@/data/properties";
import { readPropertiesFile } from "@/lib/github";

// Siempre lee el estado real desde GitHub, nunca el bundle estático.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let properties: Property[] = [];
  let loadError: string | null = null;

  try {
    const { data } = await readPropertiesFile();
    properties = Array.isArray(data) ? (data as Property[]) : [];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error inesperado";
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-3xl text-graphite">
            Panel de inmuebles
          </h1>
          <div className="flex items-center gap-5">
            <Link
              href="/admin/nuevo"
              className="bg-terracotta px-5 py-2.5 text-[13px] font-medium uppercase tracking-widest text-cream transition-colors hover:bg-terracotta-dark"
            >
              + Añadir inmueble
            </Link>
            <LogoutButton />
          </div>
        </div>

        <p className="mt-3 text-sm text-graphite-soft">
          Este listado siempre está al día. La web pública tarda 1-2 minutos
          en reflejar cada cambio (se redespliega sola).
        </p>

        {loadError && (
          <p className="mt-6 border border-terracotta bg-white p-4 text-sm text-terracotta">
            No se pudo cargar la cartera: {loadError}
          </p>
        )}

        <div className="mt-8 overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-cream-dark text-xs uppercase tracking-widest text-graphite-soft">
              <tr>
                <th className="p-3">Título</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Operación</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Estado / acciones</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.slug} className="border-t border-line align-middle">
                  <td className="p-3 font-medium text-graphite">{p.title}</td>
                  <td className="p-3 text-graphite-soft">
                    {propertyTypeLabels[p.type]}
                  </td>
                  <td className="p-3 text-graphite-soft">
                    {p.operation === "venta" ? "Venta" : "Alquiler"}
                  </td>
                  <td className="p-3 text-graphite-soft">
                    {p.price.toLocaleString("es-ES")} €
                    {p.operation === "alquiler" ? "/mes" : ""}
                  </td>
                  <td className="p-3">
                    <AdminPropertyActions property={p} />
                  </td>
                </tr>
              ))}
              {properties.length === 0 && !loadError && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-graphite-soft">
                    Todavía no hay inmuebles. Añade el primero con el botón de
                    arriba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
