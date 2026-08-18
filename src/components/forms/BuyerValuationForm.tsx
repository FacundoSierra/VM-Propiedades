"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useFormSubmit } from "./useFormSubmit";

export default function BuyerValuationForm() {
  const { status, error, submit } = useFormSubmit();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    submit({
      formType: "valoracion-comprador",
      nombre: form.get("nombre"),
      apellidos: form.get("apellidos"),
      email: form.get("email"),
      telefono: form.get("telefono"),
      tipoInmueble: form.get("tipoInmueble"),
      zona: form.get("zona"),
      presupuesto: form.get("presupuesto"),
      motivo: form.get("motivo"),
      caracteristicas: form.get("caracteristicas"),
      marketing: form.get("marketing") === "on",
      privacidad: form.get("privacidad") === "on",
    });
  }

  if (status === "success") {
    return (
      <div className="border border-line bg-white p-10 text-center">
        <p className="font-serif text-2xl text-graphite">Solicitud recibida</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-graphite-soft">
          Gracias por confiar en VM Propiedades. Un asesor se pondrá en
          contacto contigo para mostrarte propiedades que encajen con lo que
          buscas.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="buy-nombre" className="form-label">
            Nombre *
          </label>
          <input
            id="buy-nombre"
            name="nombre"
            required
            autoComplete="given-name"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="buy-apellidos" className="form-label">
            Apellidos
          </label>
          <input
            id="buy-apellidos"
            name="apellidos"
            autoComplete="family-name"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="buy-email" className="form-label">
            Email *
          </label>
          <input
            id="buy-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="buy-telefono" className="form-label">
            Teléfono *
          </label>
          <input
            id="buy-telefono"
            name="telefono"
            type="tel"
            required
            autoComplete="tel"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="buy-tipo" className="form-label">
            Tipo de inmueble *
          </label>
          <select id="buy-tipo" name="tipoInmueble" required className="field">
            <option value="">Selecciona…</option>
            <option value="piso">Piso</option>
            <option value="atico">Ático</option>
            <option value="chalet">Chalet</option>
            <option value="loft">Loft</option>
            <option value="apartamento">Apartamento</option>
            <option value="local">Local comercial</option>
          </select>
        </div>
        <div>
          <label htmlFor="buy-presupuesto" className="form-label">
            Presupuesto máximo *
          </label>
          <input
            id="buy-presupuesto"
            name="presupuesto"
            type="number"
            min={1}
            required
            className="field"
            placeholder="300000"
          />
        </div>
      </div>
      <div>
        <label htmlFor="buy-zona" className="form-label">
          Zona de interés *
        </label>
        <input
          id="buy-zona"
          name="zona"
          required
          className="field"
          placeholder="Barrio, distrito o zona de Madrid"
        />
      </div>
      <div>
        <label htmlFor="buy-motivo" className="form-label">
          Motivo de la compra
        </label>
        <input
          id="buy-motivo"
          name="motivo"
          className="field"
          placeholder="Primera vivienda, inversión, cambio de casa…"
        />
      </div>
      <div>
        <label htmlFor="buy-caracteristicas" className="form-label">
          Características deseadas del inmueble
        </label>
        <textarea
          id="buy-caracteristicas"
          name="caracteristicas"
          rows={4}
          className="field resize-y"
          placeholder="Habitaciones, planta, exterior, garaje, terraza…"
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
      {status === "error" && <p className="text-sm text-terracotta">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full bg-terracotta px-8 py-4 text-[13px] font-medium uppercase tracking-widest text-cream transition-colors hover:bg-terracotta-dark disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? "Enviando…" : "Enviar búsqueda"}
      </button>
    </form>
  );
}
