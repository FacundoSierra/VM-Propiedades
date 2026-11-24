import type { Metadata } from "next";
import { PanelLinksProvider } from "@/components/admin/PanelLinks";
import { getPanelBase } from "@/lib/panelAuth";
import "./panel.css";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
};

/**
 * Todo el panel, también la pantalla de entrar. `.panel` aísla sus colores y su
 * letra: la cabecera, el pie y el botón de WhatsApp de la web ya se esconden en el panel.
 *
 * Los enlaces del panel salen sin `/admin` en `panel.vm-propiedades.es` y con él
 * en los demás dominios (ADR-002): el prefijo se calcula aquí, con el dominio de
 * la petición, y lo leen los componentes con `usePanelHref()`.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const base = await getPanelBase();
  return (
    <div className="panel">
      <PanelLinksProvider base={base}>{children}</PanelLinksProvider>
    </div>
  );
}
