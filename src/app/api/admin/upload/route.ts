import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

/**
 * Genera el token de subida directa a Vercel Blob. El archivo en sí NO pasa
 * por esta función (eso limitaría cada foto a 4,5 MB, el máximo de cuerpo
 * de una función de Vercel) — el navegador sube el archivo directamente a
 * Blob usando el token que devolvemos aquí.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/heic",
            "image/heif",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 25 * 1024 * 1024, // 25 MB por foto
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[admin/upload] Subida completada:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[admin/upload] Error generando token de subida:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo preparar la subida",
      },
      { status: 400 },
    );
  }
}
