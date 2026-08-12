import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Aviso legal",
  robots: { index: false },
};

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso legal">
      <p>
        En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la
        Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se
        informa de que este sitio web es titularidad de <strong>{site.name}</strong>.
      </p>
      <h2>Datos identificativos</h2>
      <p>
        Titular: {site.name} · Email: {site.email} · Teléfono: {site.phone} ·
        Domicilio: {site.address}. [Completar con razón social, NIF y datos
        registrales antes de publicar.]
      </p>
      <h2>Objeto</h2>
      <p>
        Este sitio web tiene por objeto ofrecer información sobre los servicios
        de intermediación inmobiliaria de {site.name}: compra-venta, alquiler,
        gestoría, financiación y valoración de inmuebles en Madrid.
      </p>
      <h2>Propiedad intelectual</h2>
      <p>
        Los contenidos de este sitio (textos, imágenes, diseño y código) están
        protegidos por derechos de propiedad intelectual. Queda prohibida su
        reproducción total o parcial sin autorización expresa del titular.
      </p>
      <h2>Responsabilidad</h2>
      <p>
        La información sobre inmuebles publicada tiene carácter orientativo y no
        constituye oferta contractual. {site.name} no se hace responsable de
        errores u omisiones ni de los contenidos de sitios enlazados de
        terceros.
      </p>
    </LegalPage>
  );
}
