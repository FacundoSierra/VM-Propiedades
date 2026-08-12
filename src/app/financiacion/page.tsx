import type { Metadata } from "next";
import Link from "next/link";
import MortgageCalculator from "@/components/MortgageCalculator";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Financiación e hipotecas en Madrid",
  description:
    "Conseguimos las mejores condiciones hipotecarias negociando con varias entidades. Calcula tu cuota con nuestra calculadora de hipoteca.",
};

const financingServices = [
  {
    title: "Préstamos personales",
    text: "Si necesitas financiación para reformas, decoración u otros gastos relacionados con tu propiedad, te ayudamos a conseguir el préstamo personal que necesitas.",
  },
  {
    title: "Financiación para inversores",
    text: "Si eres inversor inmobiliario, te ofrecemos soluciones de financiación adaptadas a tus necesidades y objetivos.",
  },
];

export default function FinanciacionPage() {
  return (
    <>
      <PageHero
        eyebrow="Financiación"
        title="Encuentra la Financiación Ideal para tu Propiedad en Madrid con VM Propiedades"
        subtitle="¿Estás buscando financiación para comprar tu vivienda o local comercial en Madrid? En VM Propiedades, tu agencia inmobiliaria de confianza, te ofrecemos un servicio de asesoramiento y gestión de financiación personalizado para ayudarte a encontrar las mejores opciones del mercado."
      />

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Hipotecas"
            title="Te Ayudamos a Conseguir la Mejor Hipoteca"
            subtitle="En VM Propiedades, trabajamos con las principales entidades bancarias para ofrecerte una amplia gama de productos hipotecarios que se adaptan a tus necesidades y presupuesto. Te asesoramos en la elección de la hipoteca que mejor se ajuste a tu perfil, te ayudamos a preparar la documentación necesaria y te acompañamos en todo el proceso hasta la firma del préstamo."
          />
        </Reveal>
        <Reveal delay={0.1}>
          <SectionHeading
            eyebrow="Otros Servicios de Financiación"
            title="Además de las hipotecas, también te ofrecemos esto"
            subtitle="Además de las hipotecas, en VM Propiedades también te ofrecemos otros servicios de financiación para que puedas hacer realidad tus proyectos inmobiliarios."
          />
        </Reveal>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {financingServices.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.06}>
              <div className="h-full border-t-2 border-terracotta bg-white p-7 shadow-sm">
                <h2 className="font-serif text-xl text-graphite">
                  {step.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-graphite-soft">
                  {step.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-cream-dark py-20">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Calculadora"
              title="¿Qué cuota pagarías?"
              subtitle="Haz números en un minuto. Cuando quieras afinar, un asesor prepara tu estudio personalizado gratis."
              align="center"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10">
              <MortgageCalculator />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-10 text-center">
              <Link
                href="/contacto"
                className="inline-block bg-terracotta px-8 py-4 text-[13px] font-medium uppercase tracking-widest text-cream transition-colors hover:bg-terracotta-dark"
              >
                Pedir estudio personalizado
              </Link>
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
              Con años de experiencia en el mercado inmobiliario y financiero
              de Madrid, en VM Propiedades nos hemos ganado la confianza de
              nuestros clientes gracias a nuestro profesionalismo,
              transparencia y dedicación. Nuestro equipo de expertos está
              siempre dispuesto a ayudarte y a responder a todas tus
              preguntas.
            </p>
            <Link
              href="/contacto"
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
