import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  robots: { index: false },
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <p>
        De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica
        3/2018 (LOPDGDD), se informa a los usuarios de este sitio web sobre el
        tratamiento de sus datos personales.
      </p>
      <h2>Responsable del tratamiento</h2>
      <p>
        {site.name} · {site.email} · {site.phone}. [Completar con razón social y
        NIF antes de publicar.]
      </p>
      <h2>Finalidad</h2>
      <p>
        Los datos facilitados a través de los formularios de contacto y
        valoración se utilizan exclusivamente para atender tu solicitud,
        elaborar la valoración pedida y mantener la comunicación comercial
        derivada de ella. No se toman decisiones automatizadas ni se elaboran
        perfiles.
      </p>
      <h2>Legitimación</h2>
      <p>
        La base legal del tratamiento es el consentimiento que prestas al marcar
        la casilla de aceptación de esta política y, en su caso, la ejecución de
        medidas precontractuales solicitadas por ti.
      </p>
      <h2>Conservación y destinatarios</h2>
      <p>
        Los datos se conservan mientras dure la relación o hasta que solicites
        su supresión. No se ceden a terceros salvo obligación legal o
        proveedores necesarios para prestar el servicio (alojamiento web, email)
        con los que existe contrato de encargo de tratamiento.
      </p>
      <h2>Derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión,
        oposición, limitación y portabilidad escribiendo a {site.email}. También
        puedes reclamar ante la Agencia Española de Protección de Datos
        (aepd.es).
      </p>
    </LegalPage>
  );
}
