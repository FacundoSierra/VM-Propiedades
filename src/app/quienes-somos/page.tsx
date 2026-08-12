import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "VM Propiedades es una inmobiliaria boutique en Madrid con más de 20 años de experiencia y un trato cercano, profesional y transparente.",
};

export default function QuienesSomosPage() {
  return (
    <>
      <PageHero
        eyebrow="Quiénes Somos"
        title="Encuentra tu hogar con confianza en VM Propiedades"
        subtitle="Uniendo más de 20 años de experiencia en el sector inmobiliario, hemos creado VM Propiedades con el firme propósito de brindarte la tranquilidad que mereces en el proceso de compra o venta de tu hogar."
      />

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-2">
        <Reveal>
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=80"
              alt="Reunión del equipo de la agencia con clientes"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <SectionHeading
            eyebrow="Nuestra historia"
            title="Trato cercano, profesional y transparente"
          />
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-graphite-soft md:text-base">
            <p>
              Nuestro enfoque se centra en ofrecerte un trato cercano y
              personalizado, construyendo una relación basada en la confianza,
              la profesionalidad y la transparencia. En VM Propiedades, cada
              cliente es importante y trabajamos con dedicación para que tomes
              decisiones informadas y acertadas.
            </p>
            <p>
              Nos destacamos por nuestra credibilidad y el compromiso de
              cumplir con tus expectativas. A lo largo de nuestra trayectoria,
              hemos logrado establecer un sólido sistema de recomendaciones, lo
              cual es el mejor reflejo de la satisfacción de nuestros clientes.
            </p>
            <p>
              En VM Propiedades, tu tranquilidad es nuestra prioridad.
              Permítenos acompañarte en este camino y descubrir juntos el hogar
              de tus sueños.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="bg-cream-dark py-20">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-5 md:grid-cols-2 md:px-8">
          <Reveal>
            <div className="h-full border-t-2 border-terracotta bg-white p-8">
              <h2 className="font-serif text-xl text-graphite">Si estás comprando,</h2>
              <p className="mt-3 text-sm leading-relaxed text-graphite-soft">
                te guiaremos en la búsqueda de la propiedad ideal que se adapte
                a tus necesidades y presupuesto. Te mostraremos las propiedades
                que más te interesen, te asesoraremos sobre las mejores zonas
                de Madrid y te ayudaremos a negociar el precio.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full border-t-2 border-terracotta bg-white p-8">
              <h2 className="font-serif text-xl text-graphite">Si estás vendiendo</h2>
              <p className="mt-3 text-sm leading-relaxed text-graphite-soft">
                te ayudaremos a promocionar tu propiedad de manera efectiva
                para encontrar el comprador adecuado en el menor tiempo
                posible. Realizaremos una valoración profesional de tu
                inmueble, lo incluiremos en nuestra cartera de propiedades
                destacadas y lo promocionaremos en los principales portales
                inmobiliarios.
              </p>
            </div>
          </Reveal>
        </div>
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
              href="/contacto"
              className="mt-8 inline-block bg-terracotta px-8 py-4 text-[13px] font-medium uppercase tracking-widest text-cream transition-colors hover:bg-terracotta-dark"
            >
              ¡Descubre tu vivienda ideal con nosotros!
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
