interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

/** Cabecera de páginas interiores (el header fijo mide 5rem). */
export default function PageHero({ eyebrow, title, subtitle }: PageHeroProps) {
  return (
    <section className="bg-graphite pb-16 pt-36 text-cream md:pb-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-cream/70 md:text-lg">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
