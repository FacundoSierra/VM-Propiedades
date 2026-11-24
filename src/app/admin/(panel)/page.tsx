import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import PropertyList from "@/components/admin/PropertyList";
import { summaryLine } from "@/components/admin/format";
import { buttonPrimary } from "@/components/admin/ui";
import type { Property } from "@/data/properties";
import { getPanelBase, getPanelUser } from "@/lib/panelAuth";
import { panelHref } from "@/lib/panelHost";
import { readPropertiesList } from "@/lib/propertiesStore";

export const metadata: Metadata = {
  title: "Tus inmuebles",
};

// Siempre lee el estado real, nunca el que se empaquetó con la web.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // El layout ya enseña «sin acceso», pero las páginas se pintan a la vez que él:
  // sin esto, esta se ejecutaría igual para una cuenta que no es del equipo.
  if (!(await getPanelUser())) return null;
  let properties: Property[] = [];
  let loadError: string | null = null;

  try {
    ({ list: properties } = await readPropertiesList());
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error inesperado";
  }

  const summary = summaryLine(properties);
  const base = await getPanelBase();

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em] text-panel-ink md:text-[26px] md:leading-8">
            Tus inmuebles
          </h1>
          {summary && <p className="mt-1 text-panel-muted">{summary}</p>}
        </div>
        <Link href={panelHref(base, "/nuevo")} className={`${buttonPrimary} w-full md:w-auto`}>
          Nuevo inmueble
        </Link>
      </div>

      {loadError ? (
        <div role="alert" className="mt-7 bg-panel-surface p-5 md:p-6">
          <p className="font-medium text-panel-ink">No se ha podido cargar la lista de inmuebles.</p>
          <p className="mt-1 text-panel-muted">
            Recarga la página en un momento. Si sigue igual, avisa a quien te mantiene la web y
            pásale este detalle: {loadError}
          </p>
        </div>
      ) : (
        <Suspense fallback={null}>
          <PropertyList properties={properties} />
        </Suspense>
      )}
    </>
  );
}
