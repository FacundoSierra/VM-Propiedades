/**
 * Prepara las fotos en el navegador antes de subirlas: una foto del móvil pesa
 * 4–10 MB y, comprimida, se queda en unos cientos de KB. Así sube rápido y la
 * web carga ligera.
 */

/** Lado largo máximo. Las más pequeñas se quedan como están: no se amplían. */
const MAX_SIDE = 1800;
const JPEG_QUALITY = 0.82;

/** El navegador no sabe abrir el archivo (p. ej. un HEIC del iPhone en el Chrome de Windows). */
export class UnreadablePhotoError extends Error {
  constructor() {
    super("Esta foto no se puede abrir aquí: súbela desde el móvil.");
    this.name = "UnreadablePhotoError";
  }
}

/** Devuelve la foto como JPEG, girada como se hizo y con 1800 px de lado largo como mucho. */
export async function compressPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UnreadablePhotoError();
  }

  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se ha podido preparar la foto.");

    // Un PNG con transparencia saldría con el fondo negro en JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    // Safari tarda en soltar la memoria de los canvas: se vacía a mano.
    canvas.width = 0;
    canvas.height = 0;
    if (!blob) throw new Error("No se ha podido preparar la foto.");
    return blob;
  } finally {
    bitmap.close();
  }
}
