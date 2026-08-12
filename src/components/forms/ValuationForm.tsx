"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useFormSubmit } from "./useFormSubmit";

export default function ValuationForm() {
  const { status, error, submit } = useFormSubmit();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    submit({
      formType: "valoracion",
      nombre: form.get("nombre"),
      apellidos: form.get("apellidos"),
      email: form.get("email"),
      telefono: form.get("telefono"),
      tipoInmueble: form.get("tipoInmueble"),
      direccion: form.get("direccion"),
      metros: form.get("metros"),
      motivo: form.get("motivo"),
      descripcion: form.get("descripcion"),
      marketing: form.get("marketing") === "on",
      privacidad: form.get("privacidad") === "on",
    });
  }

  if (status === "success") {
    return (
      <div className="border border-line bg-white p-10 text-center">
        <p className="font-serif text-2xl text-graphite">
          Solicitud recibida
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-graphite-soft">
          Gracias por confiar en VM Propiedades. Un asesor analizará tu inmueble
          y te contactará en menos de 24 horas laborables con una valoración
          orientativa sin compromiso.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="val-nombre" className="form-label">
            Nombre *
          </label>
          <input
            id="val-nombre"
            name="nombre"
            required
            autoComplete="given-name"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="val-apellidos" className="form-label">
            Apellidos
          </label>
          <input
            id="val-apellidos"
            name="apellidos"
            autoComplete="family-name"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="val-email" className="form-label">
            Email *
          </label>
          <input
            id="val-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="val-telefono" className="form-label">
            Teléfono *
          </label>
          <input
            id="val-telefono"
            name="telefono"
            type="tel"
            required
            autoComplete="tel"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="val-tipo" className="form-label">
            Tipo de inmueble *
          </label>
          <select id="val-tipo" name="tipoInmueble" required className="field">
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
          <label htmlFor="val-metros" className="form-label">
            Superficie aproximada (m²)
          </label>
          <input
            id="val-metros"
            name="metros"
            type="number"
            min={1}
            className="field"
            placeholder="90"
          />
        </div>
      </div>
      <div>
        <label htmlFor="val-direccion" className="form-label">
          Dirección o zona del inmueble *
        </label>
        <input
          id="val-direccion"
          name="direccion"
          required
          className="field"
          placeholder="Calle, barrio o distrito"
        />
      </div>
      <div>
        <label htmlFor="val-motivo" className="form-label">
          ¿Cuál es tu situación? *
        </label>
        <select id="val-motivo" name="motivo" required className="field">
          <option value="">Selecciona…</option>
          <option value="vender-pronto">Quiero vender en los próximos meses</option>
          <option value="vender-explorar">Estoy valorando si vender</option>
          <option value="alquilar">Quiero alquilar mi inmueble</option>
          <option value="curiosidad">Solo quiero conocer el valor</option>
        </select>
      </div>
      <div>
        <label htmlFor="val-descripcion" className="form-label">
          Cuéntanos más sobre el inmueble
        </label>
        <textarea
          id="val-descripcion"
          name="descripcion"
          rows={4}
          className="field resize-y"
          placeholder="Estado, reformas, orientación, planta, anexos (garaje, trastero)…"
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
        {status === "sending" ? "Enviando…" : "Solicitar valoración gratuita"}
      </button>
    </form>
  );
}
