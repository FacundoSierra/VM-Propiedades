import type { Metadata } from "next";
import AuthScreen from "@/components/admin/AuthScreen";
import RecoverForm from "@/components/admin/RecoverForm";

export const metadata: Metadata = {
  title: "Recuperar la contraseña",
};

export default function RecuperarPage() {
  return (
    <AuthScreen>
      <RecoverForm />
    </AuthScreen>
  );
}
