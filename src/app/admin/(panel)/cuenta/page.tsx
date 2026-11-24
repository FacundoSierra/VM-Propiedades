import type { Metadata } from "next";
import AccountSettings from "@/components/admin/AccountSettings";
import { getPanelUser } from "@/lib/panelAuth";

export const metadata: Metadata = {
  title: "Mi cuenta",
};

// Lee la sesión de quien entra: nunca se prepara de antemano.
export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  // El layout de (panel) ya enseña «sin acceso» a quien no es del equipo (y las
  // páginas se pintan a la vez que él): aquí no se pinta nada en ese caso.
  const user = await getPanelUser();
  if (!user) return null;
  return <AccountSettings email={user.email} />;
}
