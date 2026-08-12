"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useFormSubmit } from "./useFormSubmit";

interface ContactFormProps {
  /** Asunto precargado, p. ej. el título de un inmueble. */
  subject?: string;
}

export default function ContactForm({ subject }: ContactFormProps) {
  const { status, error, submit } = useFormSubmit();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    submit({
      formType: "contacto",
      asunto: subject ?? form.get("asunto"),
      nombre: form.get("nombre"),
      email: form.get("email"),
      telefono: form.get("telefono"),
      mensaje: form.get("mensaje"),
      marketing: form.get("marketing") === "on",
      privacidad: form.get("privacidad") === "on",
    });
  }

  if (status === "success") {
    return (
      <div className="border border-line bg-white p-8 text-center">
        <p className="font-serif text-2xl text-graphite">Gracias por escribirnos</p>
        <p className="mt-3 text-sm leading-relaxed text-graphite-soft">
          Hemos recibido tu mensaje. Te responderemos en menos de 24 horas
          laborables.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contacto-nombre" className="form-label">
            Nombre *
          </label>
          <input
            id="contacto-nombre"
            name="nombre"
            required
            autoComplete="name"
            className="field"
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label htmlFor="contacto-telefono" className="form-label">
            Teléfono
          </label>
          <input
            id="contacto-telefono"
            name="telefono"
            type="tel"
            autoComplete="tel"
            className="field"
            placeholder="600 000 000"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contacto-email" className="form-label">
          Email *
        </label>
        <input
          id="contacto-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field"
          placeholder="tu@email.com"
        />
      </div>
      {subject ? (
        <input type="hidden" name="asunto" value={subject} />
      ) : (
        <div>
          <label htmlFor="contacto-asunto" className="form-label">
            Asunto
          </label>
          <input
            id="contacto-asunto"
            name="asunto"
            className="field"
            placeholder="¿En qué podemos ayudarte?"
          />
        </div>
      )}
      <div>
        <label htmlFor="contacto-mensaje" className="form-label">
          Mensaje *
        </label>
        <textarea
          id="contacto-mensaje"
          name="mensaje"
          required
          rows={5}
          className="field resize-y"
          placeholder={
            subject
              ? `Hola, me interesa "${subject}" y me gustaría recibir más información.`
              : "Cuéntanos qué necesitas"
          }
        />
      </div>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-graphite-soft">
        <input
          type="checkbox"
          name="marketing"
          className="mt-0.5 h-4 w-4 accent-terracotta"
        />
        <span>
          Autorizo a contactarme por email o por cualquier medio con fines
          comerciales.
        </span>
      </label>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-graphite-soft">
        <input
          type="checkbox"
          name="privacidad"
          required
          className="mt-0.5 h-4 w-4 accent-terracotta"
        />
        <span>
          He leído y aceptado la{" "}
          <Link href="/privacidad" className="underline hover:text-terracotta">
            Política de Privacidad
          </Link>
          *
        </span>
      </label>
      {status === "error" && (
        <p className="text-sm text-terracotta">{error}</p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full bg-terracotta px-6 py-3.5 text-[13px] font-medium uppercase tracking-widest text-cream transition-colors hover:bg-terracotta-dark disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
