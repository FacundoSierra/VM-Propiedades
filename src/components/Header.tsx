"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav, site } from "@/lib/site";

function subscribeToScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

export default function Header() {
  const pathname = usePathname();
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 24,
    () => false,
  );
  const [open, setOpen] = useState(false);

  // Solo la home tiene hero a pantalla completa bajo el header transparente
  const transparentStart = pathname === "/";

  const solid = scrolled || !transparentStart || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid
          ? "bg-cream/95 shadow-[0_1px_0_0_var(--color-line)] backdrop-blur"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          className={`font-serif text-xl tracking-tight transition-colors ${
            solid ? "text-graphite" : "text-white"
          }`}
        >
          VM <span className="text-gold">Propiedades</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {nav.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[13px] font-medium uppercase tracking-widest transition-colors ${
                pathname === item.href
                  ? "text-terracotta"
                  : solid
                    ? "text-graphite-soft hover:text-terracotta"
                    : "text-white/85 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/valoracion"
            className={`border px-5 py-2.5 text-[13px] font-medium uppercase tracking-widest transition-colors ${
              solid
                ? "border-terracotta bg-terracotta text-cream hover:bg-terracotta-dark"
                : "border-white/70 text-white hover:bg-white hover:text-graphite"
            }`}
          >
            Valoración gratuita
          </Link>
        </nav>

        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden ${
            solid ? "text-graphite" : "text-white"
          }`}
        >
          <span
            className={`h-px w-6 bg-current transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
          />
          <span
            className={`h-px w-6 bg-current transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
          />
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-cream px-5 pb-8 pt-4 lg:hidden">
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-line py-3.5 font-serif text-lg ${
                    pathname === item.href ? "text-terracotta" : "text-graphite"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/valoracion"
            onClick={() => setOpen(false)}
            className="mt-6 block bg-terracotta px-5 py-3.5 text-center text-[13px] font-medium uppercase tracking-widest text-cream"
          >
            Valoración gratuita
          </Link>
          <a
            href={`tel:${site.phoneHref}`}
            className="mt-3 block text-center text-sm text-graphite-soft"
          >
            {site.phone}
          </a>
        </nav>
      )}
    </header>
  );
}
