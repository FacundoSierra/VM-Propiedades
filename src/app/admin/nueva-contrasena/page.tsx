import type { Metadata } from "next";
import AuthScreen from "@/components/admin/AuthScreen";
import NewPasswordForm from "@/components/admin/NewPasswordForm";

export const metadata: Metadata = {
  title: "Contraseña nueva",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Llega desde el correo con `?token_hash=…&type=recovery`. Aquí solo se lee la
 * dirección: el enlace se comprueba (y se gasta) al guardar.
 */
export default async function NuevaContrasenaPage({ searchParams }: Props) {
  const { token_hash } = await searchParams;
  const tokenHash = typeof token_hash === "string" && token_hash.trim() ? token_hash.trim() : null;

  return (
    <AuthScreen>
      <NewPasswordForm tokenHash={tokenHash} />
    </AuthScreen>
  );
}
