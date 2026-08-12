import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-cream px-5 pt-20 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">
        Error 404
      </p>
      <h1 className="mt-4 font-serif text-4xl text-graphite md:text-5xl">
        Esta página no existe
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-graphite-soft">
        Puede que el inmueble ya se haya vendido o que el enlace esté
        equivocado. Echa un vistazo a nuestro catálogo actual.
      </p>
      <Link
        href="/inmuebles"
        className="mt-8 inline-block bg-terracotta px-8 py-4 text-[13px] font-medium uppercase tracking-widest text-cream transition-colors hover:bg-terracotta-dark"
      >
        Ver inmuebles
      </Link>
    </section>
  );
}
