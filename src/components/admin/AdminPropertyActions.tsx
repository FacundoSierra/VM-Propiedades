"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { Property, PropertyStatus } from "@/data/properties";
import { propertyStatusLabels } from "@/data/properties";

export default function AdminPropertyActions({
  property,
}: {
  property: Property;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<PropertyStatus>(property.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(next: PropertyStatus) {
    const previous = status;
    setStatus(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/properties/${property.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setStatus(previous);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `¿Eliminar "${property.title}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/properties/${property.slug}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={status}
        disabled={saving || deleting}
        onChange={(e) => handleStatusChange(e.target.value as PropertyStatus)}
        className="field w-auto !py-1.5 text-xs"
      >
        {Object.entries(propertyStatusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Link
        href={`/admin/${property.slug}/editar`}
        className="text-xs font-medium uppercase tracking-widest text-terracotta underline"
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-xs font-medium uppercase tracking-widest text-graphite-soft underline hover:text-terracotta disabled:opacity-50"
      >
        {deleting ? "Eliminando…" : "Eliminar"}
      </button>
      {error && <span className="text-xs text-terracotta">{error}</span>}
    </div>
  );
}
