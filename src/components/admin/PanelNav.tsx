"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { panelRelative } from "@/lib/panelHost";
import { usePanelHref } from "./PanelLinks";

const ACCOUNT = "/cuenta";

/**
 * Las secciones del panel, con las rutas sin prefijo. «Inmuebles» abarca la
 * lista, el alta y el editor.
 */
const sections = [
  { path: "/", label: "Inmuebles", isCurrent: (path: string) => !path.startsWith(ACCOUNT) },
  { path: ACCOUNT, label: "Mi cuenta", isCurrent: (path: string) => path.startsWith(ACCOUNT) },
] as const;

/**
 * Las secciones, en la barra de arriba del escritorio. Se subraya la sección en
 * la que se está, y es «la página» solo en su pantalla principal. En el móvil
 * no cabe: el logo lleva a los inmuebles y «Mi cuenta» va a la derecha de la barra.
 */
export default function PanelNav() {
  // Con o sin /admin delante según el dominio: se compara sin él.
  const pathname = panelRelative(usePathname());
  const href = usePanelHref();

  return (
    <nav aria-label="Panel" className="ml-4 hidden gap-7 self-stretch md:flex">
      {sections.map(({ path, label, isCurrent }) => (
        <Link
          key={path}
          href={href(path)}
          aria-current={pathname === path ? "page" : undefined}
          className={`flex items-center font-medium transition-colors ${
            isCurrent(pathname)
              ? "text-panel-ink shadow-[inset_0_-2px_0_var(--panel-accent)]"
              : "text-panel-muted hover:text-panel-ink"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
