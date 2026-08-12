import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Compra-venta de inmuebles en Madrid",
  description:
    "Vende o compra tu vivienda en Madrid con un equipo que te acompaña de la valoración a la notaría. Más de 20 años de experiencia.",
};

export default function CompraVentaPage() {
  return (
    <>
      <PageHero
        eyebrow="Compra-Venta"
        title="Encuentra tu Propiedad Ideal en Madrid con VM Propiedades"
        subtitle="En VM Propiedades, tu agencia inmobiliaria en Madrid, nos apasiona ayudarte a encontrar la propiedad perfecta que se adapte a tus sueños y necesidades. Ya sea que estés buscando un acogedor chalet para tu familia o un local comercial para tu negocio, nuestro equipo de expertos está aquí para brindarte un servicio personalizado y de calidad."
      />

      <section className="mx-auto grid max-w-7xl items-start gap-12 px-5 py-20 md:px-8 lg:grid-cols-2">
        <Reveal>
          <SectionHeading
            eyebrow="Amplia Selección de Inmuebles en Venta"
            title="Explora nuestra exclusiva cartera de propiedades en venta en Madrid"
            subtitle="Contamos con una gran variedad de inmuebles, desde modernos apartamentos en el centro de la ciudad hasta lujosas villas en las afueras."
          />
          <Link
            href="/inmuebles"
            className="mt-8 inline-block border border-graphite px-7 py-3.5 text-[13px] font-medium uppercase tracking-widest text-graphite transition-colors hover:bg-graphite hover:text-cream"
          >
            Más información
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <SectionHeading
            eyebrow="Te Ayudamos a Encontrar la Propiedad Perfecta"
            title="Un servicio personalizado y de calidad"
            subtitle="En VM Propiedades, entendemos que la compra o venta de una propiedad es una decisión importante. Por eso, te ofrecemos un servicio personalizado y de calidad para ayudarte en cada etapa del proceso."
          />
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
