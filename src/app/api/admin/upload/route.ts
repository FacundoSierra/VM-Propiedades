import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { PHOTO_PREFIX } from "@/lib/photoCleanup";
import { jsonError, requireTeam } from "@/lib/panelAuth";

/**
 * Da permiso para subir una foto a Vercel Blob (REQ-001, 5.2). La foto no pasa
 * por aquí (las funciones de Vercel no admiten más de 4,5 MB): el navegador la
 * sube directamente a una dirección firmada que se devuelve.
 *
 * Usa el sistema de Blob sin clave (`BLOB_STORE_ID` y las credenciales OIDC que
 * Vercel da a cada función), que es como Vercel conecta hoy los almacenes nuevos:
 * no hay `BLOB_READ_WRITE_TOKEN`, y `handleUpload` sin esa variable no funciona.
 * `issueSignedToken` pide a Blob un permiso solo para esa foto, y
 * `handleUploadPresigned` lo convierte en la dirección firmada.
 *
 * - Solo para cuentas del equipo (401 sin sesión, 403 si no es del equipo).
 * - Solo bajo `inmuebles/`, JPEG, PNG o WebP y como mucho 15 MB.
 * - El almacén tiene que ser público: uno privado rechaza la subida.
 * - Sin `onUploadCompleted`: Blob no llama de vuelta a esta ruta, así que se
 *   puede proteger entera. La URL se guarda en la base al pulsar «Guardar».
 */
const UPLOAD_FAILED = "No se pudo preparar la subida";
// El panel comprime cada foto en el navegador (JPEG de 1800 px). PNG y WebP
// quedan por si una no se pudiera comprimir.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 15 * 1024 * 1024;
/** Lo que vale el permiso: de sobra para subir una foto, aunque la conexión sea lenta. */
const PERMISSION_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  let body: HandleUploadPresignedBody;
  try {
    body = (await request.json()) as HandleUploadPresignedBody;
  } catch {
    return jsonError(400, UPLOAD_FAILED);
  }

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      // La librería exige esta clave aunque solo sirve para los avisos de «subida
      // terminada», que aquí no se usan. Vercel la pone sola al conectar el
      // almacén; si faltara, un valor cualquiera deja dar permisos y hace que
      // cualquier aviso falso falle al comprobarse.
      webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY || "sin-avisos-de-subida",
      getSignedToken: async (pathname) => {
        if (!pathname.startsWith(PHOTO_PREFIX) || pathname.includes("..")) {
          throw new Error(`Ruta de subida no permitida: ${pathname}`);
        }
        const validUntil = Date.now() + PERMISSION_MS;
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          validUntil,
        });
        return {
          token,
          urlOptions: {
            validUntil,
            allowedContentTypes: ALLOWED_TYPES,
            maximumSizeInBytes: MAX_BYTES,
            addRandomSuffix: true,
            // El nombre no se repite nunca (sufijo al azar): se puede guardar un año.
            cacheControlMaxAge: 31_536_000,
          },
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[admin/upload] No se ha podido dar permiso para subir:", error);
    return jsonError(400, UPLOAD_FAILED);
  }
}
