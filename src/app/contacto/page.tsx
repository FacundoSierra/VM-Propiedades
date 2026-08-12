import type { Metadata } from "next";
import ContactForm from "@/components/forms/ContactForm";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacta con VM Propiedades: gestion@vm-propiedades.es, 685 187 399 o WhatsApp. Estamos en Madrid.",
};

export default function ContactoPage() {
  return (
    <>
      <PageHero
        eyebrow="Contacto"
        title="Contacta con VM Propiedades"
        subtitle="¿Tienes alguna pregunta o necesitas más información sobre nuestros servicios? En VM Propiedades, estamos a tu disposición para ayudarte en todo lo que necesites. Puedes contactarnos por teléfono, correo electrónico o visitarnos en nuestra oficina en Madrid. Estaremos encantados de atenderte y resolver todas tus dudas."
      />

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1fr_1.5fr]">
        <Reveal>
          <div className="space-y-8">
            <div className="border-l-2 border-gold pl-6">
              <p className="text-xs font-medium uppercase tracking-widest text-graphite-soft">
                Email
              </p>
              <a
                href={`mailto:${site.email}`}
                className="mt-1 block font-serif text-xl text-graphite hover:text-terracotta"
              >
                {site.email}
              </a>
            </div>
            <div className="border-l-2 border-gold pl-6">
              <p className="text-xs font-medium uppercase tracking-widest text-graphite-soft">
                Teléfono y WhatsApp
              </p>
              <a
                href={`tel:${site.phoneHref}`}
                className="mt-1 block font-serif text-xl text-graphite hover:text-terracotta"
              >
                {site.phone}
              </a>
              <a
                href={site.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-terracotta underline"
              >
                Abrir chat de WhatsApp
              </a>
            </div>
            <div className="border-l-2 border-gold pl-6">
              <p className="text-xs font-medium uppercase tracking-widest text-graphite-soft">
                Zona de trabajo
              </p>
              <p className="mt-1 font-serif text-xl text-graphite">
                Madrid y alrededores
              </p>
            </div>
            <div className="overflow-hidden border border-line">
              <iframe
                title="Mapa de Madrid"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-3.7420%2C40.4050%2C-3.6650%2C40.4450&layer=mapnik"
                className="h-72 w-full"
                loading="lazy"
              />
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="border border-line bg-white p-6 md:p-10">
            <ContactForm />
          </div>
        </Reveal>
      </section>
    </>
  );
}
