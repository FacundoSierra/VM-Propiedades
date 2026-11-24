import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PropertyForm from "@/components/admin/PropertyForm";
import { zonesOf } from "@/components/admin/format";
import type { Property } from "@/data/properties";
import { getPanelBase, getPanelUser } from "@/lib/panelAuth";
import { panelHref } from "@/lib/panelHost";
import { readPropertiesList } from "@/lib/propertiesStore";

export const metadata: Metadata = {
  title: "Editar inmueble",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EditarInmueblePage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  // El layout ya enseña «sin acceso», pero las páginas se pintan a la vez que él:
  // sin esto, esta se ejecutaría igual para una cuenta que no es del equipo.
  if (!(await getPanelUser())) return null;

  let list: Property[];
  const base = await getPanelBase();
  try {
    ({ list } = await readPropertiesList());
  } catch (e) {
    return (
      <div role="alert" className="bg-panel-surface p-5 md:p-6">
        <p className="font-medium text-panel-ink">No se ha podido cargar este inmueble.</p>
        <p className="mt-1 text-panel-muted">
          Recarga la página en un momento. Si sigue igual, avisa a quien te mantiene la web y
          pásale este detalle: {e instanceof Error ? e.message : "error inesperado"}
        </p>
        <Link href={panelHref(base, "/")} className="mt-3 inline-flex min-h-11 items-center font-medium text-panel-ink underline underline-offset-[3px] md:min-h-0">
          Volver a tus inmuebles
        </Link>
      </div>
    );
  }

  const property = list.find((p) => p.slug === slug);
  if (!property) notFound();

  return (
    <PropertyForm
      key={property.slug}
      initial={property}
      zones={zonesOf(list)}
      featuredOthers={
        list.filter((p) => p.slug !== slug && p.featured && p.status === "disponible").length
      }
      justCreated={query.guardado === "1"}
    />
  );
}
