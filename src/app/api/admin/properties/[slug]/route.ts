import { NextResponse } from "next/server";
import type { Property } from "@/data/properties";
import { readPropertiesFile, writePropertiesFile } from "@/lib/github";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function PUT(request: Request, { params }: Params) {
  const { slug } = await params;
  let input: Partial<Property>;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  try {
    const { data, sha } = await readPropertiesFile();
    const list = Array.isArray(data) ? (data as Property[]) : [];
    const index = list.findIndex((p) => p.slug === slug);
    if (index === -1) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    const updatedProperty: Property = {
      ...list[index],
      ...input,
      slug: list[index].slug,
    };
    const updated = [...list];
    updated[index] = updatedProperty;

    await writePropertiesFile(
      updated,
      sha,
      `Editar inmueble: ${updatedProperty.title}`,
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/properties] Error editando inmueble:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error inesperado" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { slug } = await params;
  try {
    const { data, sha } = await readPropertiesFile();
    const list = Array.isArray(data) ? (data as Property[]) : [];
    const updated = list.filter((p) => p.slug !== slug);
    if (updated.length === list.length) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    await writePropertiesFile(updated, sha, `Eliminar inmueble: ${slug}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/properties] Error eliminando inmueble:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error inesperado" },
      { status: 500 },
    );
  }
}
