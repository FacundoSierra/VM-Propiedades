import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de cookies",
  robots: { index: false },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies">
      <p>
        Una cookie es un pequeño archivo que se descarga en tu dispositivo al
        acceder a determinadas páginas web para almacenar y recuperar
        información sobre la navegación.
      </p>
      <h2>Cookies que utiliza este sitio</h2>
      <p>
        Este sitio web utiliza únicamente cookies técnicas imprescindibles para
        su funcionamiento. No se utilizan cookies publicitarias ni de
        seguimiento de terceros. Si en el futuro se incorporan herramientas de
        analítica o marketing, se solicitará tu consentimiento previo mediante
        un banner de configuración.
      </p>
      <h2>Cookies de terceros</h2>
      <p>
        El mapa embebido de OpenStreetMap puede instalar cookies propias al
        cargarse. Puedes consultar su política en osmfoundation.org.
      </p>
      <h2>Cómo desactivar las cookies</h2>
      <p>
        Puedes permitir, bloquear o eliminar las cookies desde la configuración
        de tu navegador (Chrome, Firefox, Safari, Edge). Ten en cuenta que
        bloquear cookies técnicas puede afectar al funcionamiento del sitio.
      </p>
      <p>
        Para cualquier duda sobre esta política puedes escribir a {site.email}.
      </p>
    </LegalPage>
  );
}
