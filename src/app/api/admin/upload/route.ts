import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo no válido" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Solo se permiten imágenes" },
      { status: 400 },
    );
  }

  try {
    const blob = await put(`inmuebles/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("[admin/upload] Error subiendo imagen:", e);
    // Ruta solo accesible para el admin autenticado: es seguro mostrar el
    // motivo real del error para poder diagnosticarlo desde el propio panel.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo subir la imagen" },
      { status: 500 },
    );
  }
}
