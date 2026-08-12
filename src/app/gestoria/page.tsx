import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Gestoría inmobiliaria en Madrid",
  description:
    "Notaría, registro, impuestos, plusvalías, herencias y cambios de titularidad. La gestoría de VM Propiedades se ocupa de todo el papeleo.",
};

const services = [
  {
    title: "Notaría y registro",
    text: "Preparación de escrituras, coordinación de firma e inscripción en el Registro de la Propiedad.",
  },
  {
    title: "Impuestos de la operación",
    text: "Liquidación de ITP, AJD, IVA en obra nueva y modelo correspondiente en cada compraventa.",
  },
  {
    title: "Plusvalía municipal",
    text: "Cálculo, presentación y recursos cuando el impuesto no procede o está mal calculado.",
  },
  {
    title: "Herencias y donaciones",
    text: "Adjudicación de herencias con inmuebles: cuaderno particional, impuesto de sucesiones y registro.",
  },
  {
    title: "Cambios de titularidad",
    text: "Suministros, comunidad de propietarios, catastro e IBI a nombre del nuevo propietario.",
  },
  {
    title: "Cédulas y certificados",
    text: "Certificado energético, nota simple, certificados de deuda y documentación técnica necesaria.",
  },
];

export default function GestoriaPage() {
  return (
    <>
      <PageHero
        eyebrow="Gestoría"
        title="Servicios Integrales de Gestoría en Madrid con VM Propiedades"
        subtitle="¿Necesitas ayuda con trámites y gestiones en Madrid? En VM Propiedades, tu agencia inmobiliaria de confianza, te ofrecemos un servicio integral de gestoría para particulares y empresas. Nuestro equipo de expertos te asesorará y te representará en todo tipo de gestiones, desde trámites administrativos hasta asuntos legales y fiscales."
      />

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Te ofrecemos servicios integrales de gestoría administrativa, fiscal, legal e inmobiliaria"
            title="Servicios de Gestoría Personalizados para tus Necesidades"
            subtitle="En VM Propiedades, entendemos que cada cliente es diferente y tiene necesidades específicas. Por eso, te ofrecemos un servicio de gestoría personalizado que se adapta a tus requerimientos."
          />
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.04} className="h-full">
              <div className="h-full bg-white p-8">
                <span className="font-serif text-lg text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-3 font-serif text-xl text-graphite">{s.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-graphite-soft">
                  {s.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-cream-dark py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 md:px-8 lg:grid-cols-[2fr_1fr]">
          <Reveal>
            <SectionHeading
              eyebrow="Cómo trabajamos"
              title="Ahorra Tiempo y Evita Complicaciones con Nuestra Gestoría"
              subtitle="En VM Propiedades, nos encargamos de todas las gestiones por ti, para que puedas ahorrar tiempo y evitar complicaciones. Nuestro equipo de profesionales está al día de las últimas novedades legislativas y administrativas, y te garantizamos un servicio eficiente y de calidad."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="border border-line bg-cream p-8 text-center">
              <p className="font-serif text-xl text-graphite">
                Pide asesoramiento
              </p>
              <p className="mt-3 text-sm leading-relaxed text-graphite-soft">
                En VM Propiedades ofrecemos un servicio integral de gestoría
                para particulares y empresas. Nuestro equipo de expertos te
                asesorará y te representará en todo tipo de gestiones, desde
                trámites administrativos hasta asuntos legales y fiscales.
              </p>
              <Link
                href="/contacto"
                className="mt-6 inline-block bg-terracotta px-7 py-3.5 text-[13px] font-medium uppercase tracking-widest text-cream transition-colors hover:bg-terracotta-dark"
              >
                MÁS INFORMACIÓN
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
              Con años de experiencia en el sector inmobiliario y de gestoría
              en Madrid, en VM Propiedades nos hemos ganado la confianza de
              nuestros clientes gracias a nuestro profesionalismo,
              transparencia y dedicación. Nuestro objetivo es ofrecerte un
              servicio integral y personalizado que te satisfaga al 100%.
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
