"use client";

import { useState } from "react";

const euro = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function MortgageCalculator() {
  const [price, setPrice] = useState(300000);
  const [downPct, setDownPct] = useState(20);
  const [years, setYears] = useState(30);
  const [rate, setRate] = useState(3);

  const principal = price * (1 - downPct / 100);
  const monthlyRate = rate / 100 / 12;
  const months = years * 12;
  const monthly =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

  return (
    <div className="border border-line bg-white p-6 md:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="calc-precio" className="form-label">
            Precio del inmueble
          </label>
          <input
            id="calc-precio"
            type="number"
            min={10000}
            step={5000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="calc-entrada" className="form-label">
            Entrada: {downPct} %
          </label>
          <input
            id="calc-entrada"
            type="range"
            min={0}
            max={60}
            step={5}
            value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))}
            className="mt-3 w-full accent-terracotta"
          />
        </div>
        <div>
          <label htmlFor="calc-plazo" className="form-label">
            Plazo: {years} años
          </label>
          <input
            id="calc-plazo"
            type="range"
            min={5}
            max={40}
            step={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="mt-3 w-full accent-terracotta"
          />
        </div>
        <div>
          <label htmlFor="calc-interes" className="form-label">
            Interés anual: {rate.toLocaleString("es-ES")} %
          </label>
          <input
            id="calc-interes"
            type="range"
            min={0.5}
            max={7}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="mt-3 w-full accent-terracotta"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-graphite-soft">
            Hipoteca solicitada
          </p>
          <p className="mt-1 font-serif text-2xl text-graphite">
            {euro.format(principal)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-graphite-soft">
            Entrada necesaria
          </p>
          <p className="mt-1 font-serif text-2xl text-graphite">
            {euro.format(price - principal)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-graphite-soft">
            Cuota mensual estimada
          </p>
          <p className="mt-1 font-serif text-2xl text-terracotta">
            {Number.isFinite(monthly) ? euro.format(monthly) : "—"}
          </p>
        </div>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-graphite-soft">
        Cálculo orientativo con sistema de amortización francés. No constituye
        una oferta vinculante; las condiciones finales dependen de la entidad
        financiera.
      </p>
    </div>
  );
}
