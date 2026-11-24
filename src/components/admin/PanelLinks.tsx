"use client";

import { createContext, useCallback, useContext } from "react";
import { PANEL_PREFIX, panelHref, type PanelBase } from "@/lib/panelHost";

/**
 * El prefijo de los enlaces del panel, calculado en el servidor a partir del
 * dominio (`src/app/admin/layout.tsx`): ninguno en `panel.vm-propiedades.es` y
 * `/admin` en las vistas previas y en `localhost`. Así cada enlace sale ya en
 * la forma buena y no pasa por la redirección del proxy (ADR-002).
 */
const PanelBaseContext = createContext<PanelBase>(PANEL_PREFIX);

export function PanelLinksProvider({ base, children }: { base: PanelBase; children: React.ReactNode }) {
  return <PanelBaseContext.Provider value={base}>{children}</PanelBaseContext.Provider>;
}

export function usePanelBase(): PanelBase {
  return useContext(PanelBaseContext);
}

/**
 * Devuelve la función que hace los enlaces del panel. Las rutas se escriben sin
 * prefijo: `href("/")`, `href("/nuevo")`, `href(\`/${slug}/editar\`)`.
 */
export function usePanelHref(): (path: string) => string {
  const base = usePanelBase();
  return useCallback((path: string) => panelHref(base, path), [base]);
}
