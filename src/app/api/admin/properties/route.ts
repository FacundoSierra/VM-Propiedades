import { NextResponse } from "next/server";
import type { Property } from "@/data/properties";
import { readPropertiesFile, writePropertiesFile } from "@/lib/github";

function slugify(text: string) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export async function POST(request: Request) {
  let input: Partial<Property>;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!input.title || !input.zone || !input.address) {
    return NextResponse.json(
      { error: "Título, zona y dirección son obligatorios" },
      { status: 400 },
    );
  }

  try {
    const { data, sha } = await readPropertiesFile();
    const list = Array.isArray(data) ? (data as Property[]) : [];

    const base = slugify(input.title) || "inmueble";
    let slug = base;
    let suffix = 2;
    while (list.some((p) => p.slug === slug)) {
      slug = `${base}-${suffix++}`;
    }

    const newProperty: Property = {
      slug,
      title: input.title,
      type: input.type ?? "piso",
      operation: input.operation ?? "venta",
      status: input.status ?? "disponible",
      price: Number(input.price) || 0,
      zone: input.zone,
      address: input.address,
      sqm: Number(input.sqm) || 0,
      rooms: Number(input.rooms) || 0,
      baths: Number(input.baths) || 1,
      description: input.description ?? "",
      features: Array.isArray(input.features) ? input.features : [],
      images: Array.isArray(input.images) ? input.images : [],
      featured: Boolean(input.featured),
    };

    const updated = [...list, newProperty];
    await writePropertiesFile(updated, sha, `Añadir inmueble: ${newProperty.title}`);

    return NextResponse.json({ ok: true, slug });
  } catch (e) {
    console.error("[admin/properties] Error creando inmueble:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error inesperado" },
      { status: 500 },
    );
  }
}
