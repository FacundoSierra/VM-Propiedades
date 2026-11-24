"use client";

import { useEffect, useRef } from "react";
import PropertyDetail from "@/components/PropertyDetail";
import type { Property } from "@/data/properties";
import { buttonPrimaryTall, buttonSecondaryTall } from "./ui";

interface PropertyPreviewProps {
  open: boolean;
  onClose: () => void;
  /** El inmueble tal como está en el formulario, aunque no se haya guardado. */
  property: Property;
  /** La segunda frase de la franja: qué falta para que esto sea lo que se ve. */
  status: string;
  actionLabel: string;
  onAction: () => void;
  actionDisabled: boolean;
  error: string | null;
}

/**
 * La ficha pública a pantalla completa, con lo que hay en el formulario. Es un
 * `<dialog>`: deja el editor detrás sin poder tocarlo, se cierra con Escape y
 * devuelve el foco al botón que la abrió.
 */
export default function PropertyPreview({
  open,
  onClose,
  property,
  status,
  actionLabel,
  onAction,
  actionDisabled,
  error,
}: PropertyPreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    dialog.showModal();
    // Que lo primero que se lea sea el aviso, no un botón.
    noticeRef.current?.focus({ preventScroll: true });
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      opener?.focus({ preventScroll: true });
    };
  }, [open]);

  // Botones sobre la franja oscura: el contorno del foco va en claro para que se vea.
  const onDark =
    "inline-flex min-h-11 items-center justify-center whitespace-nowrap px-5 font-medium transition-colors focus-visible:outline-cream disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="vista-previa-aviso"
      onClose={onClose}
      className="panel-preview fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-cream p-0 text-base text-graphite"
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex flex-none flex-wrap items-center justify-between gap-x-8 gap-y-3 bg-graphite px-5 py-3 text-cream md:px-8">
            <p id="vista-previa-aviso" ref={noticeRef} tabIndex={-1} className="outline-none">
              <strong className="font-semibold">Vista previa.</strong> Así se verá en la web.
              {status && ` ${status}`}
            </p>
            <div className="hidden gap-2.5 md:flex">
              <button
                type="button"
                onClick={onClose}
                className={`${onDark} text-cream shadow-[inset_0_0_0_1px_rgb(247_245_241/0.5)] hover:bg-white/10`}
              >
                Seguir editando
              </button>
              <button
                type="button"
                onClick={onAction}
                disabled={actionDisabled}
                className={`${onDark} bg-panel-accent text-white hover:bg-panel-accent-dark`}
              >
                {actionLabel}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="flex-none bg-white px-5 py-3 text-sm text-panel-error md:px-8">
              {error}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <PropertyDetail property={property} preview />
          </div>

          <div className="grid flex-none grid-cols-[1.4fr_1fr] gap-2.5 bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--color-line)] md:hidden">
            <button type="button" onClick={onClose} className={buttonSecondaryTall}>
              Seguir editando
            </button>
            <button
              type="button"
              onClick={onAction}
              disabled={actionDisabled}
              className={buttonPrimaryTall}
            >
              {actionLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
