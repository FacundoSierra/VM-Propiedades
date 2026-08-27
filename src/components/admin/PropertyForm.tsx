"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type {
  Operation,
  Property,
  PropertyStatus,
  PropertyType,
} from "@/data/properties";
import { propertyStatusLabels, propertyTypeLabels } from "@/data/properties";

interface PropertyFormProps {
  initial?: Property;
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "error";
  error?: string;
}

export default function PropertyForm({ initial }: PropertyFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    type: initial?.type ?? ("piso" as PropertyType),
    operation: initial?.operation ?? ("venta" as Operation),
    status: initial?.status ?? ("disponible" as PropertyStatus),
    price: initial?.price ?? 0,
    zone: initial?.zone ?? "",
    address: initial?.address ?? "",
    sqm: initial?.sqm ?? 0,
    rooms: initial?.rooms ?? 1,
    baths: initial?.baths ?? 1,
    description: initial?.description ?? "",
    featuresText: initial?.features?.join("\n") ?? "",
    images: initial?.images ?? ([] as string[]),
    featured: initial?.featured ?? false,
  });
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploading = pending.some((p) => p.status === "uploading");

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const toUpload: PendingImage[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading" as const,
    }));

    // Vista previa instantánea: aparecen ya, sin esperar a que terminen de subir.
    setPending((prev) => [...prev, ...toUpload]);
    toUpload.forEach(uploadOne);
  }

  async function uploadOne(item: PendingImage) {
    try {
      // Sube directamente desde el navegador a Vercel Blob (no pasa por
      // nuestro servidor), así no hay límite de 4,5 MB por foto.
      const blob = await upload(
        `inmuebles/${Date.now()}-${item.file.name}`,
        item.file,
        {
          access: "public",
          handleUploadUrl: "/api/admin/upload",
        },
      );

      setForm((f) => ({ ...f, images: [...f.images, blob.url] }));
      setPending((prev) => prev.filter((p) => p.id !== item.id));
      URL.revokeObjectURL(item.previewUrl);
    } catch (e) {
      setPending((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                status: "error",
                error: e instanceof Error ? e.message : "Error al subir",
              }
            : p,
        ),
      );
    }
  }

  function retryUpload(item: PendingImage) {
    setPending((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, status: "uploading", error: undefined } : p)),
    );
    uploadOne(item);
  }

  function discardPending(id: string) {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function removeImage(url: string) {
    update(
      "images",
      form.images.filter((i) => i !== url),
    );
  }

  function makeCover(url: string) {
    update("images", [url, ...form.images.filter((i) => i !== url)]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title,
      type: form.type,
      operation: form.operation,
      status: form.status,
      price: Number(form.price) || 0,
      zone: form.zone,
      address: form.address,
      sqm: Number(form.sqm) || 0,
      rooms: Number(form.rooms) || 0,
      baths: Number(form.baths) || 1,
      description: form.description,
      features: form.featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      images: form.images,
      featured: form.featured,
    };

    try {
      const url = isEdit
        ? `/api/admin/properties/${initial!.slug}`
        : "/api/admin/properties";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="border border-terracotta bg-white p-3 text-sm text-terracotta">
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="form-label">Título *</label>
          <input
            required
            className="field"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div>
          <label className="form-label">Tipo</label>
          <select
            className="field"
            value={form.type}
            onChange={(e) => update("type", e.target.value as PropertyType)}
          >
            {Object.entries(propertyTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Operación</label>
          <select
            className="field"
            value={form.operation}
            onChange={(e) => update("operation", e.target.value as Operation)}
          >
            <option value="venta">Venta</option>
            <option value="alquiler">Alquiler</option>
          </select>
        </div>
        <div>
          <label className="form-label">Estado</label>
          <select
            className="field"
            value={form.status}
            onChange={(e) => update("status", e.target.value as PropertyStatus)}
          >
            {Object.entries(propertyStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">
            Precio (€{form.operation === "alquiler" ? "/mes" : ""})
          </label>
          <input
            type="number"
            min={0}
            className="field"
            value={form.price}
            onChange={(e) => update("price", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="form-label">Zona *</label>
          <input
            required
            className="field"
            value={form.zone}
            onChange={(e) => update("zone", e.target.value)}
          />
        </div>
        <div>
          <label className="form-label">Dirección *</label>
          <input
            required
            className="field"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>
        <div>
          <label className="form-label">Superficie (m²)</label>
          <input
            type="number"
            min={0}
            className="field"
            value={form.sqm}
            onChange={(e) => update("sqm", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="form-label">Habitaciones</label>
          <input
            type="number"
            min={0}
            className="field"
            value={form.rooms}
            onChange={(e) => update("rooms", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="form-label">Baños</label>
          <input
            type="number"
            min={0}
            className="field"
            value={form.baths}
            onChange={(e) => update("baths", Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className="form-label">Descripción</label>
        <textarea
          rows={4}
          className="field resize-y"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div>
        <label className="form-label">Características (una por línea)</label>
        <textarea
          rows={5}
          className="field resize-y"
          value={form.featuresText}
          onChange={(e) => update("featuresText", e.target.value)}
          placeholder={"Terraza de 30 m²\nReformado en 2023\nGaraje incluido"}
        />
      </div>

      <div>
        <label className="form-label">Fotos</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="block text-sm text-graphite-soft"
        />
        <p className="mt-1 text-xs text-graphite-soft">
          La primera foto (marcada como "Portada") es la que se ve en el
          catálogo. Pasa el ratón sobre una foto para quitarla o marcarla
          como portada.
        </p>

        {(form.images.length > 0 || pending.length > 0) && (
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {form.images.map((url, i) => (
              <div
                key={url}
                className="group relative aspect-square overflow-hidden border border-line"
              >
                {/* Vista previa en el panel: no requiere next/image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 bg-terracotta px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-cream">
                    Portada
                  </span>
                )}
                <div className="absolute inset-0 flex items-end justify-center gap-1 bg-graphite/0 p-1.5 opacity-0 transition-opacity group-hover:bg-graphite/40 group-hover:opacity-100">
                  {i !== 0 && (
                    <button
                      type="button"
                      onClick={() => makeCover(url)}
                      className="bg-cream px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-graphite"
                    >
                      Portada
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="bg-graphite px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-cream"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}

            {pending.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square overflow-hidden border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt=""
                  className={`h-full w-full object-cover ${item.status === "uploading" ? "opacity-60" : "opacity-40"}`}
                />
                {item.status === "uploading" && (
                  <span className="absolute inset-x-0 bottom-0 bg-graphite/80 px-1.5 py-1 text-center text-[10px] uppercase tracking-widest text-cream">
                    Subiendo…
                  </span>
                )}
                {item.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-graphite/80 p-1.5 text-center">
                    <span className="text-[10px] text-cream">{item.error}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => retryUpload(item)}
                        className="bg-terracotta px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-cream"
                      >
                        Reintentar
                      </button>
                      <button
                        type="button"
                        onClick={() => discardPending(item.id)}
                        className="bg-cream px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-graphite"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-graphite-soft">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => update("featured", e.target.checked)}
          className="h-4 w-4 accent-terracotta"
        />
        Destacar en la portada del inicio
      </label>

      <button
        type="submit"
        disabled={saving || uploading}
        className="bg-terracotta px-8 py-3.5 text-[13px] font-medium uppercase tracking-widest text-cream transition-colors hover:bg-terracotta-dark disabled:opacity-60"
      >
        {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Publicar inmueble"}
      </button>
    </form>
  );
}
