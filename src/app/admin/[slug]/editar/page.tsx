import Link from "next/link";
import { notFound } from "next/navigation";
import PropertyForm from "@/components/admin/PropertyForm";
import type { Property } from "@/data/properties";
import { readPropertiesFile } from "@/lib/github";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditarInmueblePage({ params }: Props) {
  const { slug } = await params;
  const { data } = await readPropertiesFile();
  const list = Array.isArray(data) ? (data as Property[]) : [];
  const property = list.find((p) => p.slug === slug);
  if (!property) notFound();

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          href="/admin"
          className="text-xs font-medium uppercase tracking-widest text-graphite-soft hover:text-terracotta"
        >
          ← Volver al panel
        </Link>
        <h1 className="mt-3 font-serif text-3xl text-graphite">
          Editar inmueble
        </h1>
        <div className="mt-8">
          <PropertyForm initial={property} />
        </div>
      </div>
    </div>
  );
}
