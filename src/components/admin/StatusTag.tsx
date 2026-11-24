import { panelStatusLabels, type PropertyStatus } from "@/data/properties";

const styles: Record<PropertyStatus, string> = {
  disponible: "bg-panel-ok-bg text-panel-ok-ink",
  reservado: "bg-panel-res-bg text-panel-res-ink",
  vendido: "bg-panel-ven-bg text-panel-ven-ink",
  borrador: "bg-panel-bor-bg text-panel-bor-ink",
  oculto: "bg-panel-ocu-bg text-panel-ocu-ink",
};

/** La etiqueta de color de cada estado, con el nombre que tiene en el panel. */
export default function StatusTag({ status }: { status: PropertyStatus }) {
  return (
    <span
      className={`inline-flex h-[22px] flex-none items-center rounded-[3px] px-2 text-xs font-medium whitespace-nowrap ${styles[status]}`}
    >
      {panelStatusLabels[status]}
    </span>
  );
}
