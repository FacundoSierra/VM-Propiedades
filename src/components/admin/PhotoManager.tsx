"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { countLabel } from "./format";
import { isPending, type PhotoUploadQueue, type UploadItem } from "./photoQueue";
import { cardTitle, card, help, textButton } from "./ui";

interface PhotoManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  queue: PhotoUploadQueue;
}

/** Cuánto hay que mantener pulsada una foto con el dedo para moverla. */
const LONG_PRESS_MS = 350;
/** Cerca del borde de la pantalla, la página se desplaza sola mientras se arrastra. */
const EDGE_PX = 72;

type Control = "photo" | "before" | "after";

function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const photoAction =
  "inline-flex min-h-11 items-center text-panel-ink underline underline-offset-2 decoration-panel-line-strong hover:decoration-panel-ink md:min-h-6";

const orderButton =
  "inline-flex min-h-11 items-center justify-center bg-panel-surface text-[13px] font-medium text-panel-ink shadow-[inset_0_0_0_1px_var(--panel-line-strong)] hover:bg-panel-surface-2 disabled:cursor-not-allowed disabled:text-panel-muted disabled:opacity-50 md:min-h-8 md:text-xs";

export default function PhotoManager({ images, onChange, queue }: PhotoManagerProps) {
  const uploads = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getServerSnapshot);
  const [dragging, setDragging] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [removed, setRemoved] = useState<{ url: string; index: number } | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cells = useRef(new Map<string, HTMLElement>());
  const focusTarget = useRef<{ url: string; control: Control } | null>(null);
  // Los gestos viven fuera de React (escuchan en `window`): leen siempre la última lista.
  const latest = useRef({ images, onChange });
  useEffect(() => {
    latest.current = { images, onChange };
  });

  // Después de mover o quitar una foto, el foco sigue a la foto (o al botón que se pulsó).
  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    const photo = `[data-photo="${CSS.escape(target.url)}"]`;
    const el =
      sectionRef.current?.querySelector<HTMLElement>(`${photo}[data-control="${target.control}"]:not(:disabled)`) ??
      sectionRef.current?.querySelector<HTMLElement>(`${photo}[data-control="photo"]`);
    el?.focus();
  });

  useEffect(() => () => queue.dispose(), [queue]);

  const total = images.length;

  function moveTo(url: string, to: number, control: Control) {
    const from = images.indexOf(url);
    if (from === -1 || to < 0 || to >= total || to === from) return;
    onChange(move(images, from, to));
    focusTarget.current = { url, control };
    setAnnouncement(
      to === 0 ? `La foto ${from + 1} es ahora la portada.` : `Foto movida al puesto ${to + 1} de ${total}.`,
    );
  }

  function remove(url: string) {
    const index = images.indexOf(url);
    if (index === -1) return;
    const next = images.filter((u) => u !== url);
    onChange(next);
    setRemoved({ url, index });
    setAnnouncement("Foto quitada.");
    const neighbour = next[Math.min(index, next.length - 1)];
    if (neighbour) focusTarget.current = { url: neighbour, control: "photo" };
    else inputRef.current?.focus();
  }

  function undoRemove() {
    if (!removed || images.includes(removed.url)) return;
    const next = [...images];
    next.splice(Math.min(removed.index, next.length), 0, removed.url);
    onChange(next);
    focusTarget.current = { url: removed.url, control: "photo" };
    setRemoved(null);
    setAnnouncement("Foto recuperada.");
  }

  function addFiles(files: FileList | File[] | null) {
    const list = Array.from(files ?? []).filter((f) => f.type === "" || f.type.startsWith("image/"));
    if (list.length === 0) return;
    queue.add(list);
    setAnnouncement(`${countLabel(list.length, "foto", "fotos")} en camino.`);
  }

  function indexAt(x: number, y: number) {
    let best = -1;
    let bestDistance = Infinity;
    latest.current.images.forEach((url, i) => {
      const rect = cells.current.get(url)?.getBoundingClientRect();
      if (!rect || bestDistance === 0) return;
      const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      const distance = inside
        ? 0
        : Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  }

  /**
   * Arrastrar para ordenar. Con el ratón empieza al moverlo; con el dedo, al
   * mantener la foto pulsada (si se mueve antes, es que quería desplazar la página).
   */
  function startPress(e: ReactPointerEvent<HTMLElement>, url: string) {
    if (e.button !== 0 || latest.current.images.length < 2) return;
    const pointerId = e.pointerId;
    const isMouse = e.pointerType === "mouse";
    const start = { x: e.clientX, y: e.clientY };
    const last = { x: e.clientX, y: e.clientY };
    let active = false;
    let frame = 0;
    if (isMouse) e.preventDefault();

    const reorder = () => {
      const to = indexAt(last.x, last.y);
      const list = latest.current.images;
      const from = list.indexOf(url);
      if (to !== -1 && from !== -1 && to !== from) latest.current.onChange(move(list, from, to));
    };

    const autoScroll = () => {
      if (!active) return;
      const speed =
        last.y < EDGE_PX ? -(EDGE_PX - last.y) / 4 : last.y > window.innerHeight - EDGE_PX ? (last.y - (window.innerHeight - EDGE_PX)) / 4 : 0;
      if (speed !== 0) {
        window.scrollBy(0, speed);
        reorder();
      }
      frame = requestAnimationFrame(autoScroll);
    };

    const begin = () => {
      active = true;
      setDragging(url);
      frame = requestAnimationFrame(autoScroll);
    };
    const timer = isMouse ? undefined : window.setTimeout(begin, LONG_PRESS_MS);

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      last.x = ev.clientX;
      last.y = ev.clientY;
      if (!active) {
        const moved = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
        if (isMouse && moved > 4) begin();
        else if (!isMouse && moved > 10) end();
        if (!active) return;
      }
      reorder();
    };
    // Con el dedo, mientras se arrastra no se desplaza la página.
    const onTouchMove = (ev: TouchEvent) => {
      if (active && ev.cancelable) ev.preventDefault();
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) end();
    };
    function end() {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      if (active) {
        active = false;
        setDragging(null);
        const list = latest.current.images;
        const at = list.indexOf(url);
        setAnnouncement(at === 0 ? "Foto movida: ahora es la portada." : `Foto movida al puesto ${at + 1} de ${list.length}.`);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
  }

  function onDropFiles(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  const pendingItems = uploads.items.filter(isPending);
  const waiting = uploads.items.filter((i) => i.status === "waiting");
  const shown = uploads.items.filter((i) => i.status !== "waiting");
  // Las que no se pueden abrir lo dicen en su casilla: reintentarlas no serviría de nada.
  const failed = uploads.items.filter((i) => i.status === "failed");
  const busy = pendingItems.length > 0;
  const progress = uploads.batchTotal
    ? (uploads.batchDone +
        pendingItems.reduce((sum, i) => sum + (i.status === "uploading" ? i.progress : 0), 0)) /
      uploads.batchTotal
    : 0;

  return (
    <section ref={sectionRef} className={card} aria-labelledby="fotos-titulo">
      <h2 id="fotos-titulo" className={cardTitle}>
        Fotos <span className="font-normal text-panel-muted">· {total}</span>
      </h2>
      <p className={`${help} mt-0.5`}>
        La primera es la portada.{" "}
        <span className="hidden md:pointer-fine:inline">Arrastra las fotos para cambiar el orden.</span>
        <span className="md:pointer-fine:hidden">
          Mantén pulsada una foto para moverla, o usa «Antes» y «Después».
        </span>{" "}
        Se comprimen solas al subirlas.
      </p>

      {busy && (
        <div className="mt-4 bg-panel-surface-2 p-4">
          <p className="font-semibold text-panel-ink">
            Subiendo {Math.min(uploads.batchDone + 1, uploads.batchTotal)} de{" "}
            {countLabel(uploads.batchTotal, "foto", "fotos")}
          </p>
          <div
            role="progressbar"
            aria-label="Fotos subidas"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="mt-2.5 h-1.5 bg-white"
          >
            <span
              className="block h-full bg-panel-accent transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-2.5 text-[13px] text-panel-muted">
            Se comprimen antes de subir: ocupan poco y suben rápido. Hasta que terminen no se puede
            guardar.
          </p>
        </div>
      )}

      {!busy && failed.length > 0 && (
        <p className="mt-4 text-panel-error">
          {failed.length === 1
            ? "Una foto no se ha subido. Reinténtala o quítala."
            : `${failed.length} fotos no se han subido. Reinténtalas o quítalas.`}
        </p>
      )}

      {removed && !images.includes(removed.url) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[13px] text-panel-muted">
          Has quitado una foto.
          <button type="button" onClick={undoRemove} className={`${textButton} text-[13px]`}>
            Deshacer
          </button>
        </p>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-4 md:gap-x-3.5">
        {images.map((url, i) => {
          const local = uploads.previews[url];
          const n = i + 1;
          return (
            <li key={url} className="min-w-0">
              <div
                ref={(el) => {
                  if (el) cells.current.set(url, el);
                  else cells.current.delete(url);
                }}
                role="img"
                aria-label={`Foto ${n} de ${total}${i === 0 ? ", portada" : ""}`}
                tabIndex={-1}
                data-photo={url}
                data-control="photo"
                onPointerDown={(e) => startPress(e, url)}
                onContextMenu={(e) => e.preventDefault()}
                className={`panel-photo relative aspect-[4/3] cursor-grab overflow-hidden rounded-[3px] bg-panel-surface-2 ${
                  dragging === url
                    ? "cursor-grabbing opacity-60 outline-2 outline-offset-2 outline-panel-accent"
                    : ""
                }`}
              >
                {local ? (
                  // Copia local de una foto recién subida: no hace falta descargarla otra vez.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={local} alt="" draggable={false} className="h-full w-full object-cover" />
                ) : (
                  <Image
                    src={url}
                    alt=""
                    fill
                    draggable={false}
                    sizes="(min-width: 768px) 190px, 45vw"
                    className="object-cover"
                  />
                )}
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 inline-flex h-5 items-center bg-panel-ink px-1.5 text-[11px] font-medium text-white">
                    Portada
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between gap-2 text-[13px] md:text-xs">
                {i === 0 ? (
                  <span className="inline-flex min-h-11 items-center text-panel-muted md:min-h-6">
                    Es la portada
                  </span>
                ) : (
                  <button
                    type="button"
                    data-photo={url}
                    data-control="cover"
                    aria-label={`Foto ${n}: hacer portada`}
                    onClick={() => moveTo(url, 0, "photo")}
                    className={photoAction}
                  >
                    Hacer portada
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Foto ${n}: quitar`}
                  onClick={() => remove(url)}
                  className={`${photoAction} text-panel-muted`}
                >
                  Quitar
                </button>
              </div>

              {/*
                En el móvil y en las pantallas táctiles salen siempre. En el ordenador con ratón se
                arrastra, y estos botones aparecen al llegar a ellos con el teclado.
              */}
              <div className="mt-1 grid grid-cols-2 gap-2 md:pointer-fine:sr-only md:pointer-fine:focus-within:not-sr-only md:pointer-fine:focus-within:grid">
                <button
                  type="button"
                  data-photo={url}
                  data-control="before"
                  aria-label={`Foto ${n}: antes`}
                  disabled={i === 0}
                  onClick={() => moveTo(url, i - 1, "before")}
                  className={orderButton}
                >
                  Antes
                </button>
                <button
                  type="button"
                  data-photo={url}
                  data-control="after"
                  aria-label={`Foto ${n}: después`}
                  disabled={i === total - 1}
                  onClick={() => moveTo(url, i + 1, "after")}
                  className={orderButton}
                >
                  Después
                </button>
              </div>
            </li>
          );
        })}

        {shown.map((item) => (
          <UploadTile key={item.id} item={item} queue={queue} />
        ))}

        {waiting.length > 0 && (
          <li className="grid aspect-[4/3] place-content-center rounded-[3px] bg-panel-surface-2 px-2 text-center text-[13px] text-panel-muted">
            {shown.length > 0 ? `Y ${waiting.length} más en cola` : `${countLabel(waiting.length, "foto", "fotos")} en cola`}
          </li>
        )}

        <li>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropFiles}
            className="grid aspect-[4/3] cursor-pointer place-content-center gap-0.5 rounded-[3px] bg-panel-surface-2 px-2 text-center shadow-[inset_0_0_0_1px_var(--panel-line-strong)] transition-colors hover:shadow-[inset_0_0_0_1px_var(--panel-field)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-panel-ink"
          >
            <input
              ref={inputRef}
              id="inm-fotos"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <span className="font-semibold text-panel-ink">Añadir fotos</span>
            <span className="text-xs text-panel-muted">Desde el móvil o el ordenador</span>
          </label>
        </li>
      </ul>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

function UploadTile({ item, queue }: { item: UploadItem; queue: PhotoUploadQueue }) {
  const failed = item.status === "failed";
  const unreadable = item.status === "unreadable";

  return (
    <li className="min-w-0">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-panel-surface-2">
        {item.previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.previewUrl} alt="" className="h-full w-full object-cover opacity-45" />
        )}
        {item.status === "preparing" && (
          <span className="absolute inset-0 grid place-content-center px-2 text-center text-[13px] text-panel-muted">
            Preparando…
          </span>
        )}
        {item.status === "uploading" && (
          <span className="absolute inset-x-1.5 bottom-1.5 text-[11px] font-medium text-panel-ink">
            Subiendo
            <span className="mt-0.5 block h-[3px] bg-panel-ink/15">
              <span
                className="block h-full bg-panel-accent"
                style={{ width: `${Math.round(item.progress * 100)}%` }}
              />
            </span>
          </span>
        )}
        {(failed || unreadable) && (
          <span className="absolute inset-0 grid place-content-center bg-white/80 px-2 text-center text-[12px] leading-4 text-panel-error">
            {unreadable ? item.error : "No se ha subido"}
          </span>
        )}
      </div>
      {(failed || unreadable) && (
        <div className="mt-1 flex items-center justify-between gap-2 text-[13px] md:text-xs">
          {failed ? (
            <button
              type="button"
              aria-label={`Reintentar ${item.name}`}
              onClick={() => queue.retry(item.id)}
              className={photoAction}
            >
              Reintentar
            </button>
          ) : (
            <span className="min-w-0 truncate text-panel-muted" title={item.name}>
              {item.name}
            </span>
          )}
          <button
            type="button"
            aria-label={`Quitar ${item.name}`}
            onClick={() => queue.discard(item.id)}
            className={`${photoAction} text-panel-muted`}
          >
            Quitar
          </button>
        </div>
      )}
    </li>
  );
}
