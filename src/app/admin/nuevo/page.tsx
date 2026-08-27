import Link from "next/link";
import PropertyForm from "@/components/admin/PropertyForm";

export default function NuevoInmueblePage() {
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
          Añadir inmueble
        </h1>
        <div className="mt-8">
          <PropertyForm />
        </div>
      </div>
    </div>
  );
}
