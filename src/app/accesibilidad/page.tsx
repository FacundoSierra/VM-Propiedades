import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Accesibilidad",
  robots: { index: false },
};

export default function AccesibilidadPage() {
  return (
    <LegalPage title="Declaración de accesibilidad">
      <p>
        {site.name} se compromete a hacer accesible su sitio web de conformidad
        con las pautas de accesibilidad para el contenido web WCAG 2.1 en su
        nivel AA.
      </p>
      <h2>Medidas adoptadas</h2>
      <p>
        Este sitio se ha desarrollado con HTML semántico, textos alternativos en
        las imágenes, contraste de color suficiente, navegación completa por
        teclado, etiquetas en todos los campos de formulario y respeto a la
        preferencia de movimiento reducido del sistema.
      </p>
      <h2>Contenido no accesible</h2>
      <p>
        Los mapas embebidos de terceros pueden presentar limitaciones de
        accesibilidad ajenas a este sitio. Ofrecemos como alternativa los datos
        de contacto y dirección en formato texto.
      </p>
      <h2>Comunicación de incidencias</h2>
      <p>
        Si encuentras alguna barrera de accesibilidad navegando por este sitio,
        escríbenos a {site.email} e intentaremos resolverla lo antes posible.
      </p>
    </LegalPage>
  );
}
