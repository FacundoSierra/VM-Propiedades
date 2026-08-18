import Image from "next/image";
import Link from "next/link";
import BuyerValuationForm from "@/components/forms/BuyerValuationForm";
import ValuationForm from "@/components/forms/ValuationForm";
import PropertyCard from "@/components/PropertyCard";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { getFeatured } from "@/data/properties";
import { site } from "@/lib/site";

const services = [
  {
    href: "/compra-venta",
    title: "Compra-Venta",
    description:
      "Te acompañamos de principio a fin: valoración realista, plan de venta y negociación en tu nombre.",
  },
  {
    href: "/alquiler",
    title: "Alquiler",
    description:
      "Selección rigurosa de inquilinos, contratos sólidos y gestión completa de tu vivienda en alquiler.",
  },
  {
    href: "/gestoria",
    title: "Gestoría",
    description:
      "Notaría, registro, impuestos, plusvalías y herencias. Nos ocupamos del papeleo para que tú no tengas que hacerlo.",
  },
  {
    href: "/financiacion",
    title: "Financiación",
    description:
      "Negociamos con las entidades para conseguirte las mejores condiciones hipotecarias del mercado.",
  },
  {
    href: "/valoracion",
    title: "Valoración gratuita",
    description:
      "Descubre cuánto vale tu inmueble hoy con un estudio de mercado riguroso y sin compromiso.",
  },
  {
    href: "/inmuebles",
    title: "Inversión inmobiliaria",
    description:
      "Oportunidades con rentabilidad analizada para quienes buscan que su dinero trabaje en ladrillo.",
  },
];

export default function Home() {
  const featured = getFeatured();

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center">
        <Image
          src="https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=2400&q=80"
          alt="Fachadas de edificios residenciales al atardecer"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-graphite/60 via-graphite/40 to-graphite/70" />
        <div className="relative mx-auto max-w-4xl px-5 text-center text-white">
          <h1 className="font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
            VM Propiedades
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
            Tu Agencia Inmobiliaria de Confianza en Madrid
          </p>
          <Link
            href="/contacto"
            className="mt-10 inline-block border border-white/80 px-8 py-4 text-[13px] font-medium uppercase tracking-widest transition-colors hover:bg-white hover:text-graphite"
          >
            Contáctanos
          </Link>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60">
          <svg viewBox="0 0 24 24" className="h-6 w-6 animate-bounce" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* Solicita tu Valoración Gratuita */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Valoración gratuita"
            title="Solicita tu Valoración Gratuita"
            subtitle="Rellena el formulario correspondiente y uno de nuestros expertos se pondrá en contacto contigo para programar una visita y realizar la valoración de tu inmueble."
            align="center"
          />
        </Reveal>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="h-full border border-line bg-white p-6 md:p-10">
              <p className="font-serif text-xl text-graphite">
                Formulario para Vendedores
              </p>
              <div className="mt-6">
                <ValuationForm />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full border border-line bg-white p-6 md:p-10">
              <p className="font-serif text-xl text-graphite">
                Formulario para Compradores
              </p>
              <div className="mt-6">
                <BuyerValuationForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Inmuebles destacados */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Selección"
              title="Inmuebles destacados"
              subtitle="Una muestra de nuestra cartera actual en los mejores barrios de Madrid."
            />
            <Link
              href="/inmuebles"
              className="border-b border-terracotta pb-1 text-[13px] font-medium uppercase tracking-widest text-terracotta transition-colors hover:text-terracotta-dark"
            >
              Ver todo el catálogo
            </Link>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.08}>
              <PropertyCard property={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Servicios */}
      <section className="bg-cream-dark py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="flex items-center justify-between gap-12">
              <SectionHeading
                eyebrow="Qué hacemos"
                title="Servicios Personalizados para Compradores y Vendedores"
                subtitle="En VM Propiedades, entendemos que cada cliente es único. Por eso, ofrecemos servicios personalizados que se adaptan a tus necesidades específicas. Si estás comprando, te guiaremos en cada paso del proceso, desde la búsqueda de la propiedad ideal hasta la negociación del precio y el cierre de la venta. Si estás vendiendo, te ayudaremos a promocionar tu propiedad de manera efectiva y a encontrar el comprador adecuado en el menor tiempo posible."
              />
              <Image
                src="/logo.png"
                alt="VM Propiedades"
                width={490}
                height={664}
                className="hidden h-64 w-auto shrink-0 lg:block"
              />
            </div>
          </Reveal>
          <div className="mt-12 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.href} delay={i * 0.05} className="h-full">
                <Link
                  href={s.href}
                  className="group flex h-full flex-col bg-cream p-8 transition-colors hover:bg-white"
                >
                  <span className="font-serif text-lg text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-serif text-2xl text-graphite">
                    {s.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-graphite-soft">
                    {s.description}
                  </p>
                  <span className="mt-6 text-[13px] font-medium uppercase tracking-widest text-terracotta opacity-0 transition-opacity group-hover:opacity-100">
                    Saber más →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Quiénes somos teaser */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 md:px-8 lg:grid-cols-2">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
              alt="Asesor inmobiliario entregando las llaves de una vivienda"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <SectionHeading
            eyebrow="Quiénes somos"
            title="Trato cercano, profesional y transparente"
            subtitle="Uniendo más de 20 años de experiencia en el sector inmobiliario, hemos creado VM Propiedades con el firme propósito de brindarte la tranquilidad que mereces en el proceso de compra o venta de tu hogar."
          />
          <Link
            href="/quienes-somos"
            className="mt-10 inline-block border border-graphite px-7 py-3.5 text-[13px] font-medium uppercase tracking-widest text-graphite transition-colors hover:bg-graphite hover:text-cream"
          >
            Más información
          </Link>
        </Reveal>
      </section>

      {/* Inversión y satisfacción */}
      <section className="bg-graphite py-24 text-cream">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-2 md:px-8">
          <Reveal>
            <div className="h-full border border-cream/10 p-8 md:p-10">
              <h2 className="font-serif text-2xl leading-tight md:text-3xl">
                Inversiones Inmobiliarias Inteligentes en Madrid
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-cream/70">
                Además de la compra y venta de propiedades, en VM Propiedades
                también te ofrecemos oportunidades de inversión únicas en el
                mercado inmobiliario de Madrid. Nuestro equipo de expertos te
                asesorará para que tomes decisiones informadas y rentables.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full border border-cream/10 p-8 md:p-10">
              <h2 className="font-serif text-2xl leading-tight md:text-3xl">
                Tu Satisfacción es Nuestra Prioridad
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-cream/70">
                En VM Propiedades, tu satisfacción es lo más importante. Nos
                esforzamos por brindarte un servicio excepcional y transparente
                en cada etapa del proceso. Nuestro objetivo es ayudarte a
                alcanzar tus metas inmobiliarias de manera exitosa y sin
                complicaciones.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA contacto */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <Reveal>
          <div className="bg-terracotta px-8 py-16 text-center text-cream md:px-16">
            <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight md:text-4xl">
              ¡Contáctanos hoy mismo!
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream/85 md:text-base">
              descubre todo lo que VM Propiedades tiene para ofrecerte
            </p>
            <Link
              href="/contacto"
              className="mt-8 inline-block bg-cream px-8 py-4 text-[13px] font-medium uppercase tracking-widest text-graphite transition-colors hover:bg-white"
            >
              Contáctanos
            </Link>
            <p className="mt-6 text-xs text-cream/70">
              O llámanos directamente:{" "}
              <a href={`tel:${site.phoneHref}`} className="underline">
                {site.phone}
              </a>
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
