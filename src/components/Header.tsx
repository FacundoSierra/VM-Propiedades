"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
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

  if (pathname?.startsWith("/admin")) return null;

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
      <div className="mx-auto grid h-24 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-6 px-5 md:px-8">
        <Link href="/" aria-label="Ir al inicio" className="shrink-0 justify-self-start">
          <Image
            src="/logo.png"
            alt="VM Propiedades"
            width={490}
            height={664}
            priority
            className="h-16 w-auto"
          />
        </Link>

        <nav className="hidden items-center justify-center gap-6 xl:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap text-sm font-medium uppercase tracking-wide transition-colors ${
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
        </nav>

        <Link
          href="/valoracion"
          className={`hidden whitespace-nowrap border px-5 py-3 text-sm font-medium uppercase tracking-wide transition-colors xl:inline-block xl:justify-self-end ${
            solid
              ? "border-terracotta bg-terracotta text-cream hover:bg-terracotta-dark"
              : "border-white/70 text-white hover:bg-white hover:text-graphite"
          }`}
        >
          Valoración gratuita
        </Link>

        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`col-start-3 flex h-10 w-10 flex-col items-center justify-center justify-self-end gap-1.5 xl:hidden ${
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
        <nav className="border-t border-line bg-cream px-5 pb-8 pt-4 xl:hidden">
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
