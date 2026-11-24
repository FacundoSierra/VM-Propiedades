"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { AdminApiError, resetPassword } from "@/lib/adminApi";
import { usePanelHref } from "./PanelLinks";
import PasswordField, { newPasswordProblem } from "./PasswordField";
import { passwordRules } from "./settings";
import { authHeading, authLead, authLink, buttonPrimaryTall } from "./ui";

/** Sin `token_hash` en la dirección: el enlace se ha copiado a medias. */
const INCOMPLETE = "A este enlace le falta una parte. Pide otro y ábrelo desde el correo.";

/**
 * Elegir una contraseña nueva con el enlace del correo. Al abrir la página no
 * se hace nada: los antivirus del correo abren los enlaces, y si se gastara al
 * abrirlo ya no serviría. Se gasta al pulsar «Guardar».
 */
export default function NewPasswordForm({ tokenHash }: { tokenHash: string | null }) {
  const router = useRouter();
  const href = usePanelHref();
  const [password, setPassword] = useState("");
  const [repeated, setRepeated] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState<string | null>(tokenHash ? null : INCOMPLETE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tokenHash) return;
    const problem = newPasswordProblem(password, repeated);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await resetPassword(tokenHash, password);
      setSaved(true);
      // `replace`: con «atrás» no se vuelve a un enlace que ya está gastado.
      router.replace(href("/"));
      router.refresh();
    } catch (err) {
      setSaving(false);
      if (err instanceof AdminApiError && err.status === 400) {
        setExpired(err.message);
        requestAnimationFrame(() => heading.current?.focus());
        return;
      }
      setError(err instanceof Error ? err.message : "No se ha podido guardar. Vuelve a intentarlo.");
    }
  }

  if (expired) {
    return (
      <>
        <h1 ref={heading} tabIndex={-1} className={authHeading}>
          Este enlace ya no vale
        </h1>
        <p role="alert" className={authLead}>
          {expired}
        </p>
        <p className="mt-4 text-panel-muted">
          Cada enlace vale durante una hora y una sola vez. Si has pedido varios, usa el último que
          te haya llegado.
        </p>
        <Link href={href("/recuperar")} className={`${buttonPrimaryTall} mt-6 w-full`}>
          Pedir otro enlace
        </Link>
        <Link href={href("/login")} className={authLink}>
          Volver a entrar
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 ref={heading} tabIndex={-1} className={authHeading}>
        Elige una contraseña nueva
      </h1>
      <p className={authLead}>
        Al guardarla entras en el panel y se cierra la sesión en tus otros dispositivos.
      </p>
      <form onSubmit={handleSubmit}>
        <PasswordField
          id="new-password"
          label="Contraseña nueva"
          className="mt-5"
          autoFocus
          autoComplete="new-password"
          spokenName="la contraseña nueva"
          help={`Al menos ${passwordRules.minLength} caracteres.`}
          errorId={error ? "new-password-error" : undefined}
          value={password}
          onChange={setPassword}
        />
        <PasswordField
          id="new-password-repeat"
          label="Repite la contraseña"
          className="mt-5"
          autoComplete="new-password"
          spokenName="la contraseña repetida"
          errorId={error ? "new-password-error" : undefined}
          value={repeated}
          onChange={setRepeated}
        />

        {error && (
          <p id="new-password-error" role="alert" className="mt-3 text-panel-error">
            {error}
          </p>
        )}
        <p role="status" className={saved ? "mt-3 text-panel-ink" : "sr-only"}>
          {saved ? "Contraseña guardada. Entrando en el panel…" : ""}
        </p>

        <button
          type="submit"
          disabled={saving || saved}
          className={`${buttonPrimaryTall} mt-6 w-full`}
        >
          {saving || saved ? "Guardando…" : "Guardar la contraseña"}
        </button>
      </form>
    </>
  );
}
