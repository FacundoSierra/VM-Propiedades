"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState, type MouseEvent } from "react";
import type { Property, PropertyStatus } from "@/data/properties";
import { countLabel, formatPanelPrice, normalizeForSearch, relativeDay } from "./format";
import { usePanelHref } from "./PanelLinks";
import StatusTag from "./StatusTag";
import { buttonGhost, fieldBase, textButton } from "./ui";

interface Tab {
  /** Lo que va en `?estado=`. Sin él, todos. */
  param: string | null;
  label: string;
  status?: PropertyStatus;
}

const tabs: Tab[] = [
  { param: null, label: "Todos" },
  { param: "publicados", label: "Publicados", status: "disponible" },
  { param: "reservados", label: "Reservados", status: "reservado" },
  { param: "vendidos", label: "Vendidos", status: "vendido" },
  { param: "borradores", label: "Borradores", status: "borrador" },
  { param: "ocultos", label: "Ocultos", status: "oculto" },
];

const operationLabels = { venta: "Venta", alquiler: "Alquiler" } as const;

/** Lo último que se ha tocado, arriba. Los de antes del panel nuevo no tienen fecha: van al final. */
function newestFirst(a: Property, b: Property) {
  return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
}

function placeOf(p: Property) {
  return p.zone || p.address || "Sin zona";
}

function Thumb({ property, size }: { property: Property; size: "row" | "card" }) {
  const box = size === "row" ? "h-12 w-16" : "h-14 w-14";
  const cover = property.images[0];
  if (!cover) {
    return (
      <span
        className={`${box} grid flex-none place-items-center rounded-[3px] bg-panel-surface-2 text-center text-[11px] leading-tight text-panel-muted`}
      >
        Sin fotos
      </span>
    );
  }
  return (
    <Image
      src={cover}
      alt=""
      width={size === "row" ? 64 : 56}
      height={size === "row" ? 48 : 56}
      sizes={size === "row" ? "64px" : "56px"}
      className={`${box} flex-none rounded-[3px] object-cover`}
    />
  );
}

export default function PropertyList({ properties }: { properties: Property[] }) {
  const href = usePanelHref();
  // La lista está siempre en la portada del panel (`/` en su subdominio, `/admin` en los demás).
  const pathname = href("/");
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const activeTab = tabs.find((t) => t.param === searchParams.get("estado")) ?? tabs[0];

  const sorted = useMemo(() => [...properties].sort(newestFirst), [properties]);

  const visible = useMemo(() => {
    const words = normalizeForSearch(deferredQuery).split(/\s+/).filter(Boolean);
    return sorted.filter((p) => {
      if (activeTab.status && p.status !== activeTab.status) return false;
      if (words.length === 0) return true;
      const haystack = normalizeForSearch(`${p.title} ${p.zone} ${p.address}`);
      return words.every((w) => haystack.includes(w));
    });
  }, [sorted, activeTab.status, deferredQuery]);

  function hrefFor(tab: Tab) {
    return tab.param ? `${pathname}?estado=${tab.param}` : pathname;
  }

  // Cambiar de pestaña no vuelve a pedir nada al servidor: solo cambia la dirección, y así aguanta al recargar.
  function selectTab(e: MouseEvent<HTMLAnchorElement>, tab: Tab) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    window.history.replaceState(null, "", hrefFor(tab));
  }

  if (properties.length === 0) {
    return (
      <div className="mt-7 bg-panel-surface p-5 md:p-8">
        <p className="text-base font-semibold text-panel-ink">Todavía no hay ningún inmueble.</p>
        <p className="mt-1 max-w-xl text-panel-muted">
          Pulsa «Nuevo inmueble» para dar de alta el primero. Se queda como borrador, que solo ves
          tú, hasta que lo publiques.
        </p>
      </div>
    );
  }

  const searching = deferredQuery.trim().length > 0;

  return (
    <>
      <div className="mt-5 flex flex-col gap-3 md:mt-7 md:flex-row md:items-center md:justify-between md:gap-6">
        <nav aria-label="Filtrar por estado" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ul className="flex gap-[18px] md:gap-[22px]">
            {tabs.map((tab) => {
              const count = tab.status
                ? properties.filter((p) => p.status === tab.status).length
                : properties.length;
              const current = tab === activeTab;
              return (
                <li key={tab.label} className="flex-none">
                  <a
                    href={hrefFor(tab)}
                    onClick={(e) => selectTab(e, tab)}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-11 items-center font-medium whitespace-nowrap md:min-h-9 ${
                      current
                        ? "text-panel-ink shadow-[inset_0_-2px_0_var(--panel-accent)]"
                        : "text-panel-muted hover:text-panel-ink"
                    }`}
                  >
                    {tab.label}
                    <span className="ml-1 font-normal text-panel-muted">{count}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="md:w-[300px] md:flex-none">
          <label htmlFor="admin-buscar" className="sr-only">
            Buscar por título, zona o dirección
          </label>
          <input
            id="admin-buscar"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, zona o dirección"
            autoComplete="off"
            className={`${fieldBase} h-12 text-base md:h-9 md:text-sm`}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 bg-panel-surface p-5 md:p-6">
          {searching ? (
            <>
              <p className="text-panel-ink">Ningún inmueble coincide con «{deferredQuery.trim()}».</p>
              <button type="button" onClick={() => setQuery("")} className={`${textButton} mt-1`}>
                Borrar la búsqueda
              </button>
            </>
          ) : (
            <p className="text-panel-ink">No hay ningún inmueble en «{activeTab.label}».</p>
          )}
        </div>
      ) : (
        <>
          {/* Escritorio: tabla. */}
          <div className="mt-4 hidden overflow-x-auto bg-panel-surface md:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Tus inmuebles</caption>
              <thead>
                <tr className="text-xs text-panel-muted">
                  <th scope="col" className="h-10 px-4 font-normal">Inmueble</th>
                  <th scope="col" className="h-10 px-4 font-normal">Operación</th>
                  <th scope="col" className="h-10 px-4 text-right font-normal">Precio</th>
                  <th scope="col" className="h-10 px-4 font-normal">Estado</th>
                  <th scope="col" className="h-10 px-4 font-normal">En la portada</th>
                  <th scope="col" className="h-10 px-4 font-normal">Actualizado</th>
                  <th scope="col" className="h-10 px-4 font-normal">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.slug} className="border-t border-panel-line">
                    <td className="h-[76px] px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <Thumb property={p} size="row" />
                        <div className="min-w-0">
                          <p className="font-medium text-panel-ink">{p.title}</p>
                          <p className="mt-0.5 text-[13px] text-panel-muted">{placeOf(p)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 text-panel-muted">{operationLabels[p.operation]}</td>
                    <td className="px-4 text-right font-medium whitespace-nowrap text-panel-ink tabular-nums">
                      {formatPanelPrice(p.price, p.operation)}
                    </td>
                    <td className="px-4">
                      <StatusTag status={p.status} />
                    </td>
                    <td className="px-4">
                      {p.featured && p.status === "disponible" ? (
                        <span className="text-panel-ink">Sí</span>
                      ) : (
                        <span className="text-panel-muted" aria-label="No">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 whitespace-nowrap text-panel-muted" suppressHydrationWarning>
                      {relativeDay(p.updatedAt)}
                    </td>
                    <td className="px-4 text-right">
                      <Link href={href(`/${p.slug}/editar`)} className={buttonGhost}>
                        Editar<span className="sr-only"> {p.title}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: una tarjeta por inmueble; se pulsa entera para editarla. */}
          <ul className="mt-4 space-y-2 md:hidden">
            {visible.map((p) => (
              <li
                key={p.slug}
                className="relative grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 bg-panel-surface p-3 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-panel-ink"
              >
                <div className="row-span-2">
                  <Thumb property={p} size="card" />
                </div>
                <div className="row-span-2 min-w-0">
                  <Link
                    href={href(`/${p.slug}/editar`)}
                    className="font-medium text-panel-ink outline-none after:absolute after:inset-0"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-0.5 text-[13px] text-panel-muted">
                    {placeOf(p)} · {operationLabels[p.operation]}
                  </p>
                </div>
                <div className="justify-self-end">
                  <StatusTag status={p.status} />
                </div>
                <p className="justify-self-end font-medium whitespace-nowrap text-panel-ink tabular-nums">
                  {formatPanelPrice(p.price, p.operation)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-3.5 flex flex-col gap-1 text-[13px] text-panel-muted md:flex-row md:justify-between md:gap-6">
        <span>{countLabel(visible.length, "inmueble", "inmuebles")}</span>
        <span>Los vendidos y reservados siguen en la web con su cartel hasta que los ocultes.</span>
      </p>
    </>
  );
}
