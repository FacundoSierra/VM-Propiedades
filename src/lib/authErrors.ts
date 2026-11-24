/**
 * Las frases del acceso al panel (entrar, recuperar y cambiar la contraseña) y
 * la traducción de los errores de Supabase Auth (REQ-001, sección 8.2).
 *
 * Funciones puras. Los errores de Auth se distinguen por `error.code`
 * (`AuthError` de `@supabase/auth-js`). La contraseña actual mal da
 * `current_password_invalid` en el servidor de Auth de hoy
 * (`internal/api/apierrors/errorcode.go`); `current_password_mismatch` se
 * acepta también por si cambia de nombre.
 */

export const PASSWORD_MIN = 10;
/** bcrypt solo usa los primeros 72 bytes: más larga, Supabase la rechaza. */
export const PASSWORD_MAX = 72;

export const MSG = {
  badRequest: "La petición no es válida. Recarga la página y vuelve a intentarlo.",
  missingCredentials: "Escribe tu correo y tu contraseña.",
  wrongCredentials: "El correo o la contraseña no son correctos.",
  tooManyAttempts: "Demasiados intentos. Espera unos minutos y vuelve a probar.",
  invalidEmail: "Escribe un correo válido.",
  emailRateLimit: "Espera un minuto antes de pedir otro enlace.",
  linkExpired: "El enlace ha caducado o ya se ha usado. Pide otro.",
  tooShort: `La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres.`,
  tooLong: `La contraseña tiene que tener como mucho ${PASSWORD_MAX} caracteres.`,
  samePassword: "La contraseña nueva tiene que ser distinta de la anterior.",
  weakPassword: "Esa contraseña es demasiado fácil. Elige otra.",
  wrongCurrent: "La contraseña actual no es correcta.",
  generic: "Algo ha fallado. Vuelve a intentarlo en un momento.",
} as const;

export type AuthFailure = { status: number; error: string; log?: string };

/** Lo que no cumple la contraseña nueva, antes de mandarla a Supabase. */
export function newPasswordProblem(password: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN) return MSG.tooShort;
  if (password.length > PASSWORD_MAX || new TextEncoder().encode(password).length > PASSWORD_MAX) {
    return MSG.tooLong;
  }
  return null;
}

/** Un correo con forma de correo (Supabase comprueba el resto). */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

type AuthErrorLike = { code?: string | null; status?: number | null; message?: string | null; name?: string | null };

function describe(error: AuthErrorLike) {
  return [error.name, error.status, error.code, error.message].filter((x) => x !== undefined && x !== null && x !== "").join(" · ");
}

function isRateLimited(error: AuthErrorLike) {
  return (
    error.code === "over_request_rate_limit" ||
    error.code === "over_email_send_rate_limit" ||
    error.status === 429
  );
}

/** `signInWithPassword`. Tampoco se dice si la cuenta existe o no está confirmada. */
export function translateLoginError(error: AuthErrorLike): AuthFailure {
  if (isRateLimited(error)) return { status: 429, error: MSG.tooManyAttempts, log: describe(error) };
  if (
    error.code === "invalid_credentials" ||
    error.code === "email_not_confirmed" ||
    error.code === "user_banned" ||
    error.code === "validation_failed"
  ) {
    return { status: 401, error: MSG.wrongCredentials };
  }
  return { status: 500, error: MSG.generic, log: describe(error) };
}

/** `verifyOtp({ type: 'recovery' })`. El 400 es solo para el enlace caducado o usado. */
export function translateVerifyError(error: AuthErrorLike): AuthFailure {
  if (isRateLimited(error)) return { status: 429, error: MSG.tooManyAttempts, log: describe(error) };
  const status = error.status ?? 0;
  if (error.code === "otp_expired" || error.code === "otp_disabled" || (status >= 400 && status < 500)) {
    return { status: 400, error: MSG.linkExpired, log: describe(error) };
  }
  return { status: 500, error: MSG.generic, log: describe(error) };
}

/** `updateUser({ password, current_password? })`, al recuperar y al cambiar. */
export function translateUpdatePasswordError(error: AuthErrorLike): AuthFailure {
  switch (error.code) {
    case "current_password_invalid":
    case "current_password_mismatch":
    case "current_password_required":
      return { status: 422, error: MSG.wrongCurrent };
    case "same_password":
      return { status: 422, error: MSG.samePassword };
    case "weak_password":
      return { status: 422, error: MSG.weakPassword, log: describe(error) };
  }
  if (isRateLimited(error)) return { status: 429, error: MSG.tooManyAttempts, log: describe(error) };
  return { status: 500, error: MSG.generic, log: describe(error) };
}
