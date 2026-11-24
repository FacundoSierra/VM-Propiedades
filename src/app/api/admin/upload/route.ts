import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { PHOTO_PREFIX } from "@/lib/photoCleanup";
import { jsonError, requireTeam } from "@/lib/panelAuth";

/**
 * Firma la subida directa de una foto a Vercel Blob (REQ-001, 5.2). La foto no
 * pasa por aquí (las funciones de Vercel no admiten más de 4,5 MB): el navegador
 * la sube directamente con el token que se devuelve.
 *
 * - Solo para cuentas del equipo (401 sin sesión, 403 si no es del equipo).
 * - Solo bajo `inmuebles/`, JPEG, PNG o WebP y como mucho 15 MB.
 * - Sin `onUploadCompleted`: Vercel no llama de vuelta a esta ruta, así que se
 *   puede proteger entera. La URL se guarda en la base al pulsar «Guardar».
 */
const UPLOAD_FAILED = "No se pudo preparar la subida";

export async function POST(request: Request) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return jsonError(400, UPLOAD_FAILED);
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(PHOTO_PREFIX) || pathname.includes("..")) {
          throw new Error(`Ruta de subida no permitida: ${pathname}`);
        }
        return {
          // El panel comprime cada foto en el navegador (JPEG de 1800 px). PNG
          // y WebP quedan por si una no se pudiera comprimir.
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 15 * 1024 * 1024,
          addRandomSuffix: true,
          // El nombre no se repite nunca (sufijo al azar): se puede guardar un año.
          cacheControlMaxAge: 31_536_000,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[admin/upload] No se ha podido firmar la subida:", error);
    return jsonError(400, UPLOAD_FAILED);
  }
}
