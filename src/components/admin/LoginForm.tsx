"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AdminApiError, login } from "@/lib/adminApi";
import { safePanelNext } from "@/lib/panelHost";
import { usePanelBase, usePanelHref } from "./PanelLinks";
import PasswordField from "./PasswordField";
import { panelSettings } from "./settings";
import { authLink, buttonPrimaryTall, fieldBase, fieldSizeTall, label } from "./ui";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const base = usePanelBase();
  const href = usePanelHref();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      // Solo se vuelve a una página del propio panel: nunca a otra web.
      router.push(safePanelNext(base, params.get("next")));
      router.refresh();
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) {
        setError(
          panelSettings.accounts
            ? "El correo o la contraseña no son correctos."
            : "Esa contraseña no es la correcta. Prueba otra vez.",
        );
      } else {
        setError(err instanceof Error ? err.message : "No se ha podido entrar. Vuelve a intentarlo.");
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {panelSettings.accounts && (
        <div className="mt-5">
          <label htmlFor="admin-email" className={label}>
            Correo
          </label>
          <input
            id="admin-email"
            type="email"
            required
            autoFocus
            // «username» y no «email»: así el gestor de contraseñas lo guarda junto a la contraseña.
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className={`${fieldBase} ${fieldSizeTall}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      )}
      <PasswordField
        id="admin-password"
        label="Contraseña"
        className="mt-5"
        autoComplete="current-password"
        autoFocus={!panelSettings.accounts}
        errorId={error ? "admin-login-error" : undefined}
        value={password}
        onChange={setPassword}
      />

      {error && (
        <p id="admin-login-error" role="alert" className="mt-3 text-panel-error">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={`${buttonPrimaryTall} mt-6 w-full`}>
        {loading ? "Entrando…" : "Entrar"}
      </button>

      {panelSettings.accounts && (
        <Link href={href(panelSettings.recoverPasswordHref)} className={authLink}>
          ¿Has olvidado la contraseña?
        </Link>
      )}
    </form>
  );
}
