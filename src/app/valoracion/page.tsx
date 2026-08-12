import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ValuationForm from "@/components/forms/ValuationForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Valoración gratuita de tu inmueble en Madrid",
  description:
    "Solicita una valoración gratuita y sin compromiso de tu piso, chalet o local en Madrid. Respuesta en menos de 24 horas laborables.",
};

const reasons = [
  {
    title: "Valoración para Vendedores y Compradores",
    text: "En VM Propiedades, ofrecemos servicios de valoración tanto para vendedores que desean conocer el precio óptimo para su propiedad, como para compradores que quieren asegurarse de que están pagando un precio justo.",
  },
  {
    title: "¿Por qué Valorar tu Propiedad con VM Propiedades?",
    text: "Contamos con un equipo de expertos en el mercado inmobiliario de Madrid que te proporcionarán una valoración precisa y objetiva de tu propiedad. Utilizamos las herramientas y los datos más actualizados para analizar las características de tu inmueble, la ubicación, las tendencias del mercado y otros factores relevantes que influyen en el precio.",
  },
];

export default function ValoracionPage() {
  return (
    <>
      <PageHero
        eyebrow="Valoración"
        title="Valoración Profesional de Inmuebles en Madrid con VM Propiedades"
        subtitle="¿Quieres saber el valor real de tu propiedad en Madrid? En VM Propiedades, tu agencia inmobiliaria de confianza, te ofrecemos un servicio de valoración profesional y gratuito para ayudarte a determinar el precio de mercado de tu inmueble."
      />

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <Reveal>
            <div className="space-y-8">
              {reasons.map((r) => (
                <div key={r.title} className="border-l-2 border-gold pl-6">
                  <h2 className="font-serif text-xl text-graphite">{r.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-soft">
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 border border-line bg-cream-dark p-6 text-sm leading-relaxed text-graphite-soft">
              ¿Prefieres hablar directamente?{" "}
              <a href={`tel:${site.phoneHref}`} className="text-terracotta underline">
                {site.phone}
              </a>{" "}
              o escríbenos por{" "}
              <a
                href={site.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terracotta underline"
              >
                WhatsApp
              </a>
              .
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.05}>
          <div className="border border-line bg-white p-6 md:p-10">
            <p className="font-serif text-xl text-graphite">
              Solicita tu Valoración Gratuita
            </p>
            <p className="mt-2 text-sm leading-relaxed text-graphite-soft">
              Rellena el formulario correspondiente y uno de nuestros expertos
              se pondrá en contacto contigo para programar una visita y
              realizar la valoración de tu inmueble.
            </p>
            <div className="mt-6">
              <ValuationForm />
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        <Reveal>
          <div className="bg-graphite px-8 py-14 text-center text-cream md:px-16">
            <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight md:text-4xl">
              Confía en la Experiencia de VM Propiedades
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream/70">
              Con años de experiencia en el mercado inmobiliario de Madrid, en
              VM Propiedades nos hemos ganado la confianza de nuestros clientes
              gracias a nuestro profesionalismo, transparencia y dedicación.
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
