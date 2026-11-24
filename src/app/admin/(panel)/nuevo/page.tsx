import type { Metadata } from "next";
import PropertyForm from "@/components/admin/PropertyForm";
import { zonesOf } from "@/components/admin/format";
import type { Property } from "@/data/properties";
import { getPanelUser } from "@/lib/panelAuth";
import { readPropertiesList } from "@/lib/propertiesStore";

export const metadata: Metadata = {
  title: "Nuevo inmueble",
};

export const dynamic = "force-dynamic";

export default async function NuevoInmueblePage() {
  // El layout ya enseña «sin acceso», pero las páginas se pintan a la vez que él:
  // sin esto, esta se ejecutaría igual para una cuenta que no es del equipo.
  if (!(await getPanelUser())) return null;
  // Solo hace falta para sugerir zonas y contar las destacadas: si falla, se puede rellenar igual
  // y el servidor comprobará las reglas al guardar.
  let list: Property[] = [];
  try {
    ({ list } = await readPropertiesList());
  } catch {
    list = [];
  }

  return (
    <PropertyForm
      zones={zonesOf(list)}
      featuredOthers={list.filter((p) => p.featured && p.status === "disponible").length}
    />
  );
}
