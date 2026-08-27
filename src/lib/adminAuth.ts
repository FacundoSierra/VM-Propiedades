/**
 * Autenticación mínima del panel /admin: una única contraseña compartida
 * (variable de entorno ADMIN_PASSWORD), sin usuarios ni base de datos.
 *
 * Usa la Web Crypto API (`crypto.subtle`) en vez del módulo `crypto` de
 * Node porque este archivo se ejecuta tanto en rutas normales (Node)
 * como en el middleware (Edge), y `crypto.subtle` está disponible en
 * ambos entornos.
 */

export const ADMIN_COOKIE_NAME = "vm_admin_session";

const SALT = "vm-propiedades-admin-v1";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getExpectedSessionValue(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return sha256Hex(`${SALT}:${password}`);
}

export async function checkPassword(candidate: string): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return candidate === password;
}

export async function isValidSession(
  cookieValue: string | undefined,
): Promise<boolean> {
  const expected = await getExpectedSessionValue();
  if (!expected || !cookieValue) return false;
  return cookieValue === expected;
}
