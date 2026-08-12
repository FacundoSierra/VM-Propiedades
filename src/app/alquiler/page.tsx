import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import PropertyCard from "@/components/PropertyCard";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { properties } from "@/data/properties";

export const metadata: Metadata = {
  title: "Alquiler de viviendas y locales en Madrid",
  description:
    "Gestión integral del alquiler en Madrid: selección de inquilinos, contratos sólidos y tranquilidad para propietarios e inquilinos.",
};

export default function AlquilerPage() {
  const rentals = properties.filter((p) => p.operation === "alquiler");

  return (
    <>
      <PageHero
        eyebrow="Alquiler"
        title="Encuentra tu Hogar Ideal en Alquiler en Madrid con VM Propiedades"
        subtitle="¿Estás buscando un piso de alquiler en Madrid? En VM Propiedades, tu agencia inmobiliaria de confianza, te ofrecemos una amplia selección de inmuebles en alquiler en las mejores zonas de la ciudad. Ya sea que estés buscando un apartamento moderno, una casa espaciosa o un local comercial para tu negocio, tenemos la propiedad perfecta para ti."
      />

      <section className="mx-auto grid max-w-7xl items-start gap-12 px-5 py-20 md:px-8 lg:grid-cols-2">
        <Reveal>
          <SectionHeading
            eyebrow="Nuestra cartera"
            title="Descubre Nuestra Variedad de Inmuebles en Alquiler"
            subtitle="Explora nuestra exclusiva cartera de propiedades en alquiler en Madrid. Contamos con una gran variedad de inmuebles, desde estudios acogedores hasta lujosas villas."
          />
        </Reveal>
        <Reveal delay={0.1}>
          <SectionHeading
            eyebrow="Cómo trabajamos"
            title="Te Asesoramos en la Búsqueda de tu Inmueble en Alquiler"
            subtitle="En VM Propiedades, entendemos que encontrar el inmueble perfecto en alquiler puede ser un desafío. Por eso, te ofrecemos un servicio personalizado y de calidad para ayudarte en cada etapa del proceso."
          />
        </Reveal>
      </section>

      {rentals.length > 0 && (
        <section className="bg-cream-dark py-20">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <SectionHeading
                  eyebrow="Disponibles ahora"
                  title="Encuentra tu hogar ideal entre nuestra amplia selección de apartamentos, casas, locales comerciales y oficinas"
                />
                <Link
                  href="/inmuebles"
                  className="border-b border-terracotta pb-1 text-[13px] font-medium uppercase tracking-widest text-terracotta transition-colors hover:text-terracotta-dark"
                >
                  Ver todo el catálogo
                </Link>
              </div>
            </Reveal>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {rentals.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.06}>
                  <PropertyCard property={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <Reveal>
          <div className="border-t-2 border-terracotta bg-white p-8 shadow-sm">
            <h2 className="font-serif text-xl text-graphite">Pide asesoramiento</h2>
            <p className="mt-3 text-sm leading-relaxed text-graphite-soft">
              Te guiaremos en la búsqueda de propiedades que se ajusten a tus
              necesidades y presupuesto, te mostraremos los inmuebles que más
              te interesen y te asesoraremos sobre las mejores zonas de Madrid
              para vivir o trabajar. Además, te ayudaremos a gestionar los
              trámites de alquiler de manera rápida y sencilla.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <Reveal>
          <div className="bg-graphite px-8 py-14 text-center text-cream md:px-16">
            <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight md:text-4xl">
              Confía en la Experiencia de VM Propiedades
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream/70">
              Con años de experiencia en el mercado inmobiliario de Madrid, en
              VM Propiedades nos hemos ganado la confianza de nuestros clientes
              gracias a nuestro profesionalismo, transparencia y dedicación.
              Nuestro equipo de expertos está siempre dispuesto a ayudarte y a
              responder a todas tus preguntas.
            </p>
            <Link
              href="/valoracion"
              className="mt-8 inline-block bg-terracotta px-8 py-4 text-[13px] font-medium uppercase tracking-widest text-cream transition-colors hover:bg-terracotta-dark"
            >
              ¡Contáctanos hoy mismo!
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
