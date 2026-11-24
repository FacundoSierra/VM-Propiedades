"use client";

import { useState, type FormEvent } from "react";
import { changePassword } from "@/lib/adminApi";
import PasswordField, { newPasswordProblem } from "./PasswordField";
import { passwordRules } from "./settings";
import { buttonPrimary, card, cardTitle, fieldSize } from "./ui";

/** Cambiar la contraseña desde «Mi cuenta»: la actual, la nueva y otra vez la nueva. */
export default function ChangePasswordForm({ email }: { email: string | null }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [repeated, setRepeated] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const problem =
      newPasswordProblem(password, repeated) ??
      (password === current ? "La contraseña nueva tiene que ser distinta de la actual." : null);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, password);
      setCurrent("");
      setPassword("");
      setRepeated("");
      setNotice("Contraseña cambiada. La próxima vez que entres, usa la nueva.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido cambiar. Vuelve a intentarlo.");
    } finally {
      setSaving(false);
    }
  }

  const errorId = error ? "change-password-error" : undefined;

  return (
    <section className={card} aria-labelledby="change-password-title">
      <h2 id="change-password-title" className={cardTitle}>
        Cambiar la contraseña
      </h2>
      <form onSubmit={handleSubmit} className="md:max-w-[400px]">
        {/* Le dice al gestor de contraseñas de qué cuenta es la contraseña nueva. */}
        {email && (
          <input type="email" autoComplete="username" value={email} readOnly hidden />
        )}
        <PasswordField
          id="current-password"
          label="Contraseña actual"
          className="mt-4"
          autoComplete="current-password"
          spokenName="la contraseña actual"
          sizeClass={fieldSize}
          errorId={errorId}
          value={current}
          onChange={setCurrent}
        />
        <PasswordField
          id="account-new-password"
          label="Contraseña nueva"
          className="mt-4"
          autoComplete="new-password"
          spokenName="la contraseña nueva"
          help={`Al menos ${passwordRules.minLength} caracteres.`}
          sizeClass={fieldSize}
          errorId={errorId}
          value={password}
          onChange={setPassword}
        />
        <PasswordField
          id="account-new-password-repeat"
          label="Repite la contraseña nueva"
          className="mt-4"
          autoComplete="new-password"
          spokenName="la contraseña repetida"
          sizeClass={fieldSize}
          errorId={errorId}
          value={repeated}
          onChange={setRepeated}
        />

        {error && (
          <p id="change-password-error" role="alert" className="mt-3 text-panel-error">
            {error}
          </p>
        )}
        <p role="status" className={notice ? "mt-3 text-panel-ink" : "sr-only"}>
          {notice}
        </p>

        <button type="submit" disabled={saving} className={`${buttonPrimary} mt-5 w-full md:w-auto`}>
          {saving ? "Cambiando…" : "Cambiar la contraseña"}
        </button>
      </form>
    </section>
  );
}
