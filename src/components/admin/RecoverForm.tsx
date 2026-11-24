"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { requestPasswordReset } from "@/lib/adminApi";
import { usePanelHref } from "./PanelLinks";
import {
  authHeading,
  authLead,
  authLink,
  buttonPrimaryTall,
  buttonSecondaryTall,
  fieldBase,
  fieldSizeTall,
  label,
} from "./ui";

/**
 * Pide el enlace para elegir una contraseña nueva. Después dice siempre lo
 * mismo, tenga cuenta o no ese correo: así nadie puede averiguar cuáles la tienen.
 */
export default function RecoverForm() {
  const href = usePanelHref();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    setSending(true);
    setError(null);
    try {
      await requestPasswordReset(address);
      setSentTo(address);
      // El titular cambia: se lleva el foco ahí para que el lector de pantalla lo lea.
      requestAnimationFrame(() => heading.current?.focus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido mandar. Vuelve a intentarlo.");
    } finally {
      setSending(false);
    }
  }

  // Vuelve al formulario con el mismo correo puesto; el foco va solo al campo (autoFocus).
  function askAgain() {
    setSentTo(null);
  }

  if (sentTo) {
    return (
      <>
        <h1 ref={heading} tabIndex={-1} className={authHeading}>
          Mira tu correo
        </h1>
        <p className={authLead}>
          Si <span className="font-medium text-panel-ink [overflow-wrap:anywhere]">{sentTo}</span>{" "}
          tiene cuenta en el panel, te llegará un enlace para elegir una contraseña nueva. Vale
          durante una hora y una sola vez.
        </p>
        <p className="mt-4 text-panel-muted">
          ¿No te llega? Mira en el correo no deseado. Si tampoco está, pide otro: se puede pedir uno
          por minuto.
        </p>
        <button type="button" onClick={askAgain} className={`${buttonSecondaryTall} mt-6 w-full`}>
          Pedir otro enlace
        </button>
        <Link href={href("/login")} className={authLink}>
          Volver a entrar
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 ref={heading} tabIndex={-1} className={authHeading}>
        Recupera tu contraseña
      </h1>
      <p className={authLead}>
        Escribe el correo con el que entras y te mandamos un enlace para elegir una contraseña nueva.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mt-5">
          <label htmlFor="recover-email" className={label}>
            Correo
          </label>
          <input
            id="recover-email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "recover-error" : undefined}
            className={`${fieldBase} ${fieldSizeTall}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && (
          <p id="recover-error" role="alert" className="mt-3 text-panel-error">
            {error}
          </p>
        )}

        <button type="submit" disabled={sending} className={`${buttonPrimaryTall} mt-6 w-full`}>
          {sending ? "Mandando…" : "Mandar el enlace"}
        </button>
        <Link href={href("/login")} className={authLink}>
          Volver a entrar
        </Link>
      </form>
    </>
  );
}
