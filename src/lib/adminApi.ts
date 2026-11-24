/**
 * Todas las llamadas del panel al servidor, en un solo sitio. Las pantallas
 * solo usan estas funciones: si cambia cómo se guarda por dentro (otra API,
 * otra base de datos, otro almacén de fotos), se cambia aquí y nada más.
 *
 * Cada función devuelve lo que pide o lanza un `AdminApiError` con la frase
 * que se le puede enseñar tal cual a quien usa el panel.
 */
import { upload } from "@vercel/blob/client";
import type { Property } from "@/data/properties";
import { slugify } from "@/lib/propertyRules";

/** Lo que el panel puede cambiar de un inmueble. El resto lo pone el servidor. */
export type PropertyInput = Omit<Property, "slug" | "updatedAt" | "publishedAt">;

export class AdminApiError extends Error {
  constructor(
    message: string,
    /** 0 si no hubo respuesta (sin conexión). */
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

const OFFLINE = "No se ha podido conectar. Revisa la conexión y vuelve a intentarlo.";
const SESSION_CLOSED =
  "Se ha cerrado la sesión. Abre el panel en otra pestaña, entra y vuelve a guardar aquí: así no pierdes lo que has escrito.";

/**
 * Las rutas que se usan sin sesión. Su 401 no es «se ha cerrado la sesión»:
 * es su propia respuesta (la contraseña no es correcta, por ejemplo).
 */
const PUBLIC_ROUTES = new Set([
  "/api/admin/login",
  "/api/admin/password/forgot",
  "/api/admin/password/reset",
]);

async function request<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new AdminApiError(OFFLINE, 0);
  }
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (!res.ok) {
    const serverMessage = typeof body?.error === "string" ? body.error : null;
    if (res.status === 401 && !PUBLIC_ROUTES.has(url)) {
      throw new AdminApiError(SESSION_CLOSED, 401);
    }
    throw new AdminApiError(
      serverMessage ?? "Algo ha fallado. Vuelve a intentarlo en un momento.",
      res.status,
    );
  }
  return body as T;
}

function json(method: string, data?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  };
}

/** Entra en el panel. Si va bien, la sesión queda en las cookies. */
export async function login(credentials: { email: string; password: string }) {
  await request<{ ok: true }>("/api/admin/login", json("POST", credentials));
}

export async function logout() {
  await request<{ ok: true }>("/api/admin/logout", json("POST"));
}

/**
 * Pide el enlace para elegir una contraseña nueva. El servidor responde lo
 * mismo exista o no la cuenta, para no decir qué correos tienen una.
 */
export async function requestPasswordReset(email: string) {
  await request<{ ok: true }>("/api/admin/password/forgot", json("POST", { email }));
}

/**
 * Guarda la contraseña nueva con el `token_hash` del enlace del correo. El
 * enlace se gasta aquí, no al abrirlo. Si va bien, la sesión queda iniciada.
 */
export async function resetPassword(tokenHash: string, password: string) {
  await request<{ ok: true }>(
    "/api/admin/password/reset",
    json("POST", { tokenHash, password }),
  );
}

/** Cambia la contraseña desde «Mi cuenta». Pide la actual. */
export async function changePassword(current: string, password: string) {
  await request<{ ok: true }>("/api/admin/password/change", json("POST", { current, password }));
}

export async function createProperty(data: PropertyInput): Promise<Property> {
  const res = await request<{ property: Property }>("/api/admin/properties", json("POST", data));
  return res.property;
}

/** Acepta el inmueble entero o solo una parte, p. ej. `{ status: "vendido" }`. */
export async function updateProperty(
  slug: string,
  data: Partial<PropertyInput>,
): Promise<Property> {
  const res = await request<{ property: Property }>(
    `/api/admin/properties/${encodeURIComponent(slug)}`,
    json("PUT", data),
  );
  return res.property;
}

export async function deleteProperty(slug: string) {
  await request<{ ok: true }>(`/api/admin/properties/${encodeURIComponent(slug)}`, json("DELETE"));
}

/**
 * Sube una foto ya comprimida y devuelve su dirección pública. Va directa del
 * navegador al almacén, sin pasar por una función del servidor (que no admite
 * cuerpos de más de 4,5 MB).
 */
export async function uploadPhoto(
  photo: Blob,
  originalName: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const base = slugify(originalName.replace(/\.[^.]+$/, "")) || "foto";
  try {
    const blob = await upload(`inmuebles/${Date.now()}-${base}.jpg`, photo, {
      access: "public",
      handleUploadUrl: "/api/admin/upload",
      contentType: photo.type || "image/jpeg",
      onUploadProgress: onProgress ? ({ percentage }) => onProgress(percentage / 100) : undefined,
    });
    return blob.url;
  } catch {
    throw new AdminApiError(
      navigator.onLine ? "No se ha podido subir." : "Sin conexión. No se ha podido subir.",
      0,
    );
  }
}
