"use client";

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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Error subiendo imagen");
        uploaded.push(json.url);
      }
      update("images", [...form.images, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error subiendo imágenes");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    update(
      "images",
      form.images.filter((i) => i !== url),
    );
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
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          className="block text-sm text-graphite-soft"
        />
        {uploading && (
          <p className="mt-2 text-xs text-graphite-soft">Subiendo…</p>
        )}
        {form.images.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {form.images.map((url) => (
              <div
                key={url}
                className="relative aspect-square overflow-hidden border border-line"
              >
                {/* Vista previa en el panel: no requiere next/image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute right-1 top-1 bg-graphite/80 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-cream"
                >
                  Quitar
                </button>
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
        Destacar en la portada
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
