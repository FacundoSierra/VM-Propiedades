import type { Metadata } from "next";
import { Suspense } from "react";
import AuthScreen from "@/components/admin/AuthScreen";
import LoginForm from "@/components/admin/LoginForm";
import { authHeading, authLead } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function AdminLoginPage() {
  return (
    <AuthScreen>
      <h1 className={authHeading}>Entra en tu panel</h1>
      <p className={authLead}>Aquí publicas y cambias tus inmuebles.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthScreen>
  );
}
