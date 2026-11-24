import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthScreen from "@/components/admin/AuthScreen";
import LogoutButton from "@/components/admin/LogoutButton";
import PanelNav from "@/components/admin/PanelNav";
import { authHeading, authLead, buttonSecondaryTall } from "@/components/admin/ui";
import { getPanelAccess, getPanelBase } from "@/lib/panelAuth";
import { panelHref } from "@/lib/panelHost";
import { site } from "@/lib/site";

/**
 * La barra de arriba de todas las pantallas del panel menos la de entrar.
 *
 * Antes de enseñar nada comprueba que quien entra es del equipo (`team`). El
 * proxy ya ha mandado a entrar a quien no tiene sesión; aquí queda una sesión
 * que no es del equipo (se le dice, con «Salir») o que no se ha podido comprobar.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const [access, base] = await Promise.all([getPanelAccess(), getPanelBase()]);

  if (access.state === "no-session") redirect(panelHref(base, "/login"));

  if (access.state !== "ok") {
    const noTeam = access.state === "no-team";
    return (
      <AuthScreen>
        <h1 className={authHeading}>
          {noTeam ? "Esta cuenta no puede entrar en el panel" : "No se ha podido abrir el panel"}
        </h1>
        <p role="alert" className={authLead}>
          {noTeam
            ? "Si crees que es un error, avisa a quien te mantiene la web."
            : "Recarga la página en un momento. Si sigue igual, avisa a quien te mantiene la web."}
        </p>
        <LogoutButton className={`${buttonSecondaryTall} mt-6 w-full`} />
      </AuthScreen>
    );
  }

  return (
    <>
      <header className="flex h-14 items-center gap-6 bg-panel-surface px-4 shadow-[inset_0_-1px_0_var(--panel-line)] md:h-16 md:px-8">
        <Link href={panelHref(base, "/")} className="flex min-h-11 flex-none items-center gap-3 text-panel-ink">
          <Image
            src="/logo.png"
            alt="VM Propiedades"
            width={518}
            height={700}
            preload
            className="h-10 w-auto md:h-11"
          />
          <span className="border-l border-panel-line-strong pl-3 text-[13px] text-panel-muted">
            Panel
          </span>
        </Link>
        <PanelNav />
        <div className="ml-auto flex items-center gap-5">
          <a
            href={site.url}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center font-medium text-panel-ink underline underline-offset-[3px] md:min-h-0"
          >
            Ver la web<span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
          {/* En el escritorio, «Mi cuenta» está en PanelNav. */}
          <Link
            href={panelHref(base, "/cuenta")}
            className="inline-flex min-h-11 items-center font-medium text-panel-ink md:hidden"
          >
            Mi cuenta
          </Link>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-[1240px] px-4 pt-5 pb-16 md:px-8 md:pt-8">{children}</div>
    </>
  );
}
