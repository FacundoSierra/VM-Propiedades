"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  MAX_FEATURED,
  isPublic,
  panelStatusLabels,
  propertyTypeLabels,
  type Operation,
  type Property,
  type PropertyStatus,
  type PropertyType,
} from "@/data/properties";
import {
  createProperty,
  deleteProperty,
  updateProperty,
  type PropertyInput,
} from "@/lib/adminApi";
import { canDelete, joinEs, missingForPublish } from "@/lib/propertyRules";
import { site } from "@/lib/site";
import { formatAmount, savedAt } from "./format";
import { usePanelHref } from "./PanelLinks";
import PhotoManager from "./PhotoManager";
import { PhotoUploadQueue } from "./photoQueue";
import PropertyPreview from "./PropertyPreview";
import { savedNotices } from "./settings";
import StatusTag from "./StatusTag";
import {
  buttonPrimary,
  buttonPrimaryTall,
  buttonSecondary,
  buttonSecondaryTall,
  card,
  cardTitle,
  field,
  help,
  label,
  selectField,
  textButton,
  textareaField,
} from "./ui";

interface PropertyFormProps {
  /** El inmueble guardado. Sin él, es un alta. */
  initial?: Property;
  /** Las zonas que ya hay, para sugerirlas al escribir. */
  zones: string[];
  /** Cuántos publicados hay en la portada sin contar este. */
  featuredOthers: number;
  /** Se acaba de dar de alta: nada más llegar se dice que está guardado. */
  justCreated?: boolean;
}

/** Lo que hay en el formulario. Los números van como texto para poder dejarlos vacíos. */
interface FormState {
  title: string;
  operation: Operation;
  type: PropertyType;
  price: string;
  zone: string;
  address: string;
  rooms: string;
  baths: string;
  sqm: string;
  description: string;
  featuresText: string;
  images: string[];
  status: PropertyStatus;
  featured: boolean;
}

const statuses = Object.keys(panelStatusLabels) as PropertyStatus[];

const statusHelp: Record<PropertyStatus, string> = {
  borrador: "Solo lo ves tú",
  disponible: "Sale en la web",
  reservado: "Sale con el cartel “Reservado”",
  vendido: "Sale con el cartel “Vendido”",
  oculto: "No sale en la web",
};

function toForm(p?: Property): FormState {
  return {
    title: p?.title ?? "",
    operation: p?.operation ?? "venta",
    type: p?.type ?? "piso",
    price: p && p.price > 0 ? String(p.price) : "",
    zone: p?.zone ?? "",
    address: p?.address ?? "",
    rooms: p ? String(p.rooms) : "",
    baths: p ? String(p.baths) : "",
    sqm: p && p.sqm > 0 ? String(p.sqm) : "",
    description: p?.description ?? "",
    featuresText: p?.features.join("\n") ?? "",
    images: p?.images ?? [],
    status: p?.status ?? "borrador",
    featured: Boolean(p?.featured),
  };
}

function toInput(f: FormState): PropertyInput {
  return {
    title: f.title.trim(),
    type: f.type,
    operation: f.operation,
    status: f.status,
    price: Number(f.price) || 0,
    zone: f.zone.trim(),
    address: f.address.trim(),
    sqm: Number(f.sqm) || 0,
    rooms: Number(f.rooms) || 0,
    baths: Number(f.baths) || 0,
    description: f.description.trim(),
    features: f.featuresText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    images: f.images,
    featured: f.featured && f.status === "disponible",
  };
}

/** Para saber si hay cambios sin guardar: compara lo que se mandaría, no cómo está escrito. */
function fingerprint(f: FormState) {
  return JSON.stringify(toInput(f));
}

function onlyDigits(value: string, max: number) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, max);
}

/** Qué se le dice al guardar, según si el inmueble está en la web, entra o sale de ella. */
function noticeFor(before: Property | null, after: Property) {
  if (isPublic(after) && !(before && isPublic(before))) return savedNotices.published;
  if (isPublic(after) || (before && isPublic(before))) return savedNotices.saved;
  return savedNotices.savedDraft;
}

/** Un número con los puntos de los miles mientras se escribe, sin que el cursor salte al final. */
function AmountInput({
  id,
  value,
  onValueChange,
  suffix,
  maxDigits,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  suffix: string;
  maxDigits: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const digitsBefore = caret.current;
    if (!input || digitsBefore === null) return;
    caret.current = null;
    let position = 0;
    let seen = 0;
    while (position < input.value.length && seen < digitsBefore) {
      if (/\d/.test(input.value[position])) seen++;
      position++;
    }
    input.setSelectionRange(position, position);
  });

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value ? formatAmount(value) : ""}
        onChange={(e) => {
          const raw = e.target.value;
          caret.current = raw.slice(0, e.target.selectionStart ?? raw.length).replace(/\D/g, "").length;
          onValueChange(onlyDigits(raw, maxDigits));
        }}
        // Hueco a la derecha para la unidad: «€/mes» ocupa más que «€» o «m²».
        className={`${field} ${suffix.length > 2 ? "pr-16" : "pr-9"} tabular-nums`}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-panel-muted"
      >
        {suffix}
      </span>
    </div>
  );
}

export default function PropertyForm({
  initial,
  zones,
  featuredOthers,
  justCreated = false,
}: PropertyFormProps) {
  const router = useRouter();
  const href = usePanelHref();
  const isNew = !initial;

  const [saved, setSaved] = useState<Property | null>(initial ?? null);
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [baseline, setBaseline] = useState(() => fingerprint(toForm(initial)));
  const [queue] = useState(
    () => new PhotoUploadQueue((url) => setForm((f) => ({ ...f, images: [...f.images, url] }))),
  );
  const uploading = useSyncExternalStore(queue.subscribe, queue.isBusy, queue.isBusyOnServer);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    justCreated && initial ? noticeFor(null, initial) : null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"ok" | "error" | null>(null);

  const leaveDialog = useRef<HTMLDialogElement>(null);
  const stayButton = useRef<HTMLButtonElement>(null);
  const deleteQuestion = useRef<HTMLParagraphElement>(null);
  const pendingLeave = useRef<HTMLElement | null>(null);
  const leaving = useRef(false);

  const dirty = fingerprint(form) !== baseline || uploading;
  const wasPublished = Boolean(saved?.publishedAt || (saved && isPublic(saved)));
  const onWeb = Boolean(saved && isPublic(saved));
  const missing = isPublic(form) ? missingForPublish(toInput(form)) : [];
  const featuredOn = form.featured && form.status === "disponible";
  const featuredCount = featuredOthers + (featuredOn ? 1 : 0);
  const canFeature = form.status === "disponible" && (form.featured || featuredOthers < MAX_FEATURED);
  const heading = saved ? saved.title : "Nuevo inmueble";
  const publicUrl = saved ? `${site.url}/inmuebles/${saved.slug}` : null;
  const blocked = saving || uploading || deleting;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Tras dar de alta se llega con `?guardado=1`: se quita para que al recargar no vuelva a decirlo.
  useEffect(() => {
    if (justCreated) window.history.replaceState(null, "", window.location.pathname);
  }, [justCreated]);

  // Si hay cambios sin guardar (o fotos subiendo), se avisa antes de salir de la página.
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      e.preventDefault();
      e.returnValue = "";
    };

    // Los enlaces del panel cambian de página sin recargar: se paran aquí y se pregunta dentro de la página.
    const onClick = (e: MouseEvent) => {
      if (leaving.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = (e.target as Element | null)?.closest<HTMLElement>("a[href], [data-leave-guard]");
      if (!target) return;
      if (target instanceof HTMLAnchorElement) {
        if (target.target && target.target !== "_self") return;
        const url = new URL(target.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      }
      e.preventDefault();
      e.stopPropagation();
      pendingLeave.current = target;
      leaveDialog.current?.showModal();
      stayButton.current?.focus();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function leaveAnyway() {
    const target = pendingLeave.current;
    leaveDialog.current?.close();
    if (!target) return;
    leaving.current = true;
    target.click();
  }

  async function save(overrides: Partial<FormState> = {}) {
    if (blocked) return;
    const next = { ...form, ...overrides };
    const data = toInput(next);
    setError(null);
    setNotice(null);

    if (!data.title) {
      setError("Ponle un título al inmueble.");
      return;
    }
    if (isPublic(data)) {
      const lacking = missingForPublish(data);
      if (lacking.length > 0) {
        setError(`Para que salga en la web falta ${joinEs(lacking)}.`);
        return;
      }
    }
    if (saved && fingerprint(next) === baseline) {
      setNotice("No hay cambios sin guardar.");
      setPreviewOpen(false);
      return;
    }

    setSaving(true);
    try {
      if (!saved) {
        const created = await createProperty(data);
        leaving.current = true;
        router.push(href(`/${created.slug}/editar?guardado=1`));
        return;
      }
      const property = await updateProperty(saved.slug, data);
      const fresh = toForm(property);
      // Si ha escrito algo mientras se guardaba, no se le borra.
      setForm((current) => (fingerprint(current) === fingerprint(next) ? fresh : current));
      setBaseline(fingerprint(fresh));
      setNotice(noticeFor(saved, property));
      setSaved(property);
      setPreviewOpen(false);
      setSaving(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido guardar. Vuelve a intentarlo.");
      setSaving(false);
    }
  }

  function openPreview() {
    setError(null);
    setPreviewOpen(true);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void save();
  }

  // Intro en un campo no guarda: cada guardado vuelve a publicar la web.
  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
  }

  async function removeProperty() {
    if (!saved) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProperty(saved.slug);
      leaving.current = true;
      router.push(href("/"));
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "No se ha podido borrar. Vuelve a intentarlo.");
      setDeleting(false);
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied("ok");
    } catch {
      setCopied("error");
    }
    window.setTimeout(() => setCopied(null), 2500);
  }

  const publishFromPreview = form.status === "borrador" || form.status === "oculto";
  const previewProperty: Property = {
    ...toInput(form),
    slug: saved?.slug ?? "vista-previa",
    // Un borrador se enseña como saldrá al publicarlo, sin cartel.
    status: isPublic(form) ? form.status : "disponible",
  };

  const statusLine = error ? null : notice && !dirty ? notice : uploading ? "Cuando terminen de subir las fotos, ya se puede guardar." : null;
  const messages = (
    <>
      {error && (
        <p role="alert" className="text-panel-error">
          {error}
        </p>
      )}
      <p role="status" className={statusLine ? "text-panel-ink" : "sr-only"}>
        {statusLine}
      </p>
    </>
  );

  const saveLabel = saving ? "Guardando…" : isNew ? "Guardar" : "Guardar cambios";
  const photoCount = saved?.images.length ?? 0;

  return (
    <>
      <form onSubmit={onSubmit} onKeyDown={onKeyDown} noValidate className="pb-20 md:pb-0">
        <nav aria-label="Miga de pan" className="text-[13px] text-panel-muted">
          <Link href={href("/")} className="text-panel-ink hover:underline">
            Tus inmuebles
          </Link>{" "}
          / <span aria-current="page">{heading}</span>
        </nav>

        <div className="mt-1 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
          <h1 className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[22px] leading-7 font-semibold tracking-[-0.01em] text-panel-ink md:text-[26px] md:leading-8">
            <span className="min-w-0 [overflow-wrap:anywhere]">{heading}</span>
            {saved && <StatusTag status={saved.status} />}
          </h1>
          <div className="hidden flex-none gap-2.5 md:flex">
            <button type="button" onClick={openPreview} className={buttonSecondary}>
              Ver vista previa
            </button>
            <button type="submit" disabled={blocked} className={buttonPrimary}>
              {saveLabel}
            </button>
          </div>
        </div>

        <div className="mt-3 hidden space-y-1 md:block">{messages}</div>

        <div className="mt-5 grid grid-cols-1 items-start gap-5 md:mt-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
          <div className="min-w-0 space-y-5">
            <section className={card} aria-labelledby="datos-titulo">
              <h2 id="datos-titulo" className={cardTitle}>
                Datos del inmueble
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-3">
                <div className="md:col-span-3">
                  <label htmlFor="inm-titulo" className={label}>
                    Título
                  </label>
                  <input
                    id="inm-titulo"
                    required
                    maxLength={120}
                    autoComplete="off"
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    className={field}
                  />
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-x-4 md:col-span-2 md:gap-x-5">
                  <div className="min-w-0">
                    <label htmlFor="inm-operacion" className={label}>
                      Operación
                    </label>
                    <select
                      id="inm-operacion"
                      value={form.operation}
                      onChange={(e) => update("operation", e.target.value as Operation)}
                      className={selectField}
                    >
                      <option value="venta">Venta</option>
                      <option value="alquiler">Alquiler</option>
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="inm-tipo" className={label}>
                      Tipo
                    </label>
                    <select
                      id="inm-tipo"
                      value={form.type}
                      onChange={(e) => update("type", e.target.value as PropertyType)}
                      className={selectField}
                    >
                      {Object.entries(propertyTypeLabels).map(([value, text]) => (
                        <option key={value} value={value}>
                          {text}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="min-w-0">
                  <label htmlFor="inm-precio" className={label}>
                    Precio
                    <span className="sr-only">
                      {form.operation === "alquiler" ? ", en euros al mes" : ", en euros"}
                    </span>
                  </label>
                  <AmountInput
                    id="inm-precio"
                    value={form.price}
                    onValueChange={(v) => update("price", v)}
                    suffix={form.operation === "alquiler" ? "€/mes" : "€"}
                    maxDigits={9}
                  />
                </div>

                <div className="min-w-0">
                  <label htmlFor="inm-zona" className={label}>
                    Zona
                  </label>
                  <input
                    id="inm-zona"
                    list="inm-zonas"
                    maxLength={80}
                    autoComplete="off"
                    value={form.zone}
                    onChange={(e) => update("zone", e.target.value)}
                    className={field}
                  />
                  <datalist id="inm-zonas">
                    {zones.map((z) => (
                      <option key={z} value={z} />
                    ))}
                  </datalist>
                </div>

                <div className="min-w-0 md:col-span-2">
                  <label htmlFor="inm-direccion" className={label}>
                    Dirección que se ve en la web
                  </label>
                  <input
                    id="inm-direccion"
                    maxLength={160}
                    autoComplete="off"
                    aria-describedby="inm-direccion-ayuda"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    className={field}
                  />
                  <p id="inm-direccion-ayuda" className={`${help} mt-1.5`}>
                    Sale en la ficha. Si no quieres dar la calle exacta, pon solo el barrio.
                  </p>
                </div>

                <div className="grid min-w-0 grid-cols-3 gap-x-4 md:col-span-3 md:gap-x-5">
                  <div className="min-w-0">
                    <label htmlFor="inm-habitaciones" className={label}>
                      Habitaciones
                    </label>
                    <input
                      id="inm-habitaciones"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.rooms}
                      onChange={(e) => update("rooms", onlyDigits(e.target.value, 2))}
                      className={`${field} tabular-nums`}
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="inm-banos" className={label}>
                      Baños
                    </label>
                    <input
                      id="inm-banos"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.baths}
                      onChange={(e) => update("baths", onlyDigits(e.target.value, 2))}
                      className={`${field} tabular-nums`}
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="inm-superficie" className={label}>
                      Superficie<span className="sr-only">, en metros cuadrados</span>
                    </label>
                    <AmountInput
                      id="inm-superficie"
                      value={form.sqm}
                      onValueChange={(v) => update("sqm", v)}
                      suffix="m²"
                      maxDigits={6}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className={card}>
              <h2 className={cardTitle}>
                <label htmlFor="inm-descripcion">Descripción</label>
              </h2>
              <textarea
                id="inm-descripcion"
                rows={6}
                maxLength={5000}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className={`${textareaField} mt-4`}
              />
            </section>

            <section className={card}>
              <h2 className={cardTitle}>
                <label htmlFor="inm-caracteristicas">Características</label>
              </h2>
              <p id="inm-caracteristicas-ayuda" className={`${help} mt-0.5`}>
                Una por línea, por ejemplo «Terraza de 30 m²» o «Garaje incluido». En la ficha salen
                como una lista.
              </p>
              <textarea
                id="inm-caracteristicas"
                rows={6}
                aria-describedby="inm-caracteristicas-ayuda"
                value={form.featuresText}
                onChange={(e) => update("featuresText", e.target.value)}
                className={`${textareaField} mt-4`}
              />
            </section>

            <PhotoManager
              images={form.images}
              onChange={(images) => update("images", images)}
              queue={queue}
            />
          </div>

          <aside className="min-w-0 space-y-5" aria-label="Estado y publicación">
            <section className={card} aria-labelledby="estado-titulo">
              <h2 id="estado-titulo" className={cardTitle}>
                Estado
              </h2>
              <div role="radiogroup" aria-labelledby="estado-titulo" className="mt-3.5">
                {statuses.map((s) => {
                  const locked = s === "borrador" && wasPublished;
                  return (
                    <label
                      key={s}
                      className="flex cursor-pointer gap-3 border-t border-panel-line py-2.5 first:border-t-0 has-[:disabled]:cursor-not-allowed"
                    >
                      <input
                        type="radio"
                        name="estado"
                        value={s}
                        checked={form.status === s}
                        disabled={locked}
                        onChange={() => update("status", s)}
                        aria-describedby={`estado-${s}-ayuda`}
                        className="panel-radio"
                      />
                      <span className="min-w-0">
                        <span className={`block font-medium ${locked ? "text-panel-muted" : "text-panel-ink"}`}>
                          {panelStatusLabels[s]}
                        </span>
                        <span id={`estado-${s}-ayuda`} className="block text-[13px] text-panel-muted">
                          {locked ? "Ya ha salido en la web. Para quitarlo, ocúltalo." : statusHelp[s]}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p role="status" className={missing.length > 0 ? "mt-3 text-[13px] text-panel-error" : "sr-only"}>
                {missing.length > 0 && `Para que salga en la web falta ${joinEs(missing)}.`}
              </p>
            </section>

            <section className={card} aria-labelledby="portada-titulo">
              <h2 id="portada-titulo" className={cardTitle}>
                Portada de la web
              </h2>
              <label className="mt-3.5 flex cursor-pointer gap-3 has-[:disabled]:cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={featuredOn}
                  disabled={!canFeature}
                  onChange={(e) => update("featured", e.target.checked)}
                  aria-describedby="portada-ayuda"
                  className="panel-check"
                />
                <span className="min-w-0">
                  <span className={`block font-medium ${canFeature ? "text-panel-ink" : "text-panel-muted"}`}>
                    Destacar en la portada
                  </span>
                  <span id="portada-ayuda" className="block text-[13px] text-panel-muted">
                    Tienes {featuredCount} de {MAX_FEATURED} destacadas.
                    {form.status !== "disponible"
                      ? " Solo se destacan los publicados."
                      : !canFeature
                        ? " Quita uno de la portada para destacar este."
                        : ""}
                  </span>
                </span>
              </label>
            </section>

            <section className={card} aria-labelledby="direccion-titulo">
              <h2 id="direccion-titulo" className={cardTitle}>
                Su dirección en la web
              </h2>
              {publicUrl && saved ? (
                <>
                  <p className="mt-3 bg-panel-surface-2 px-3 py-2.5 text-[13px] text-panel-ink [overflow-wrap:anywhere]">
                    {publicUrl.replace(/^https?:\/\//, "")}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <button type="button" onClick={copyLink} className={textButton}>
                      Copiar el enlace
                    </button>
                    <span role="status" className="text-[13px] text-panel-muted">
                      {copied === "ok" ? "Copiado" : copied === "error" ? "No se ha podido copiar" : ""}
                    </span>
                  </div>
                  <p className={`${help} mt-1.5`}>
                    No cambia aunque edites el inmueble, así los enlaces que hayas compartido siguen
                    funcionando.
                    {!onWeb && " Funcionará cuando lo publiques."}
                  </p>
                </>
              ) : (
                <p className={`${help} mt-1.5`}>Se crea al guardar, a partir del título.</p>
              )}
            </section>

            {saved && (
              <section className={card} aria-labelledby="borrar-titulo">
                <h2 id="borrar-titulo" className={cardTitle}>
                  Borrar
                </h2>
                {!canDelete(saved) ? (
                  <p className={`${help} mt-1`}>
                    Para borrar un inmueble que está en la web, ocúltalo primero. Así nunca se borra
                    nada por error.
                  </p>
                ) : confirmingDelete ? (
                  <div className="mt-2">
                    <p ref={deleteQuestion} tabIndex={-1} className="text-panel-ink outline-none">
                      ¿Borrar «{saved.title}»
                      {photoCount === 0 ? "" : photoCount === 1 ? " y su foto" : ` y sus ${photoCount} fotos`}? No se
                      puede deshacer. Si solo quieres quitarlo de la web, ocúltalo.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={removeProperty}
                        disabled={deleting}
                        className={buttonPrimary}
                      >
                        {deleting ? "Borrando…" : "Sí, borrar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        disabled={deleting}
                        className={buttonSecondary}
                      >
                        Cancelar
                      </button>
                    </div>
                    {deleteError && (
                      <p role="alert" className="mt-3 text-panel-error">
                        {deleteError}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingDelete(true);
                      setDeleteError(null);
                      requestAnimationFrame(() => deleteQuestion.current?.focus());
                    }}
                    className={`${textButton} mt-1 text-panel-error decoration-panel-error/40 hover:decoration-panel-error`}
                  >
                    Borrar este inmueble
                  </button>
                )}
              </section>
            )}

            {saved?.updatedAt && (
              <p className="text-[13px] text-panel-muted" suppressHydrationWarning>
                {savedAt(saved.updatedAt)}
              </p>
            )}
          </aside>
        </div>

        {/* Móvil: los botones quedan siempre a mano, abajo. */}
        <div className="fixed inset-x-0 bottom-0 z-30 bg-panel-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--panel-line)] md:hidden">
          <div className={`space-y-1 text-[13px] leading-5 ${error || statusLine ? "mb-2.5" : ""}`}>{messages}</div>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={openPreview} className={buttonSecondaryTall}>
              Ver vista previa
            </button>
            <button type="submit" disabled={blocked} className={buttonPrimaryTall}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </form>

      {/* Fuera del formulario: la ficha lleva su propio formulario de contacto. */}
      <PropertyPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        property={previewProperty}
        status={
          !onWeb
            ? "Todavía no está publicado."
            : dirty
              ? "Todavía no has guardado los cambios."
              : ""
        }
        actionLabel={saving ? "Guardando…" : publishFromPreview ? "Publicar" : isNew ? "Guardar" : "Guardar cambios"}
        onAction={() => void save(publishFromPreview ? { status: "disponible" } : {})}
        actionDisabled={blocked || (!publishFromPreview && !isNew && !dirty)}
        error={previewOpen ? error : null}
      />

      <dialog
        ref={leaveDialog}
        aria-labelledby="salir-titulo"
        aria-describedby="salir-texto"
        onClose={() => {
          pendingLeave.current = null;
        }}
        className="panel-leave m-auto w-[calc(100%-2rem)] max-w-[420px] border-0 bg-panel-surface p-6 text-panel-text"
      >
        <h2 id="salir-titulo" className="text-lg font-semibold text-panel-ink">
          Tienes cambios sin guardar
        </h2>
        <p id="salir-texto" className="mt-1.5 text-panel-muted">
          {uploading ? "Hay fotos subiendo. Si sales ahora, se pierden." : "Si sales ahora, se pierden."}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={leaveAnyway} className={buttonSecondary}>
            Salir sin guardar
          </button>
          <button
            ref={stayButton}
            type="button"
            onClick={() => leaveDialog.current?.close()}
            className={buttonPrimary}
          >
            Seguir editando
          </button>
        </div>
      </dialog>
    </>
  );
}
