/**
 * Lo que depende de cómo funciona el panel por dentro, en un solo sitio.
 *
 * Se entra con una cuenta (correo y contraseña) y los inmuebles se guardan en
 * una base de datos que la web lee al momento: un cambio se ve en cuanto se
 * guarda. Si eso cambiara, basta con tocar este archivo: las pantallas leen de aquí.
 */
export const panelSettings = {
  /** Con cuentas, la pantalla de entrar pide el correo y enseña «¿Has olvidado la contraseña?». */
  accounts: true,
  /** Adónde lleva «¿Has olvidado la contraseña?» cuando hay cuentas. Sin prefijo: pasa por `usePanelHref()`. */
  recoverPasswordHref: "/recuperar",
} as const;

/**
 * Las reglas de la contraseña. Son las mismas que comprueba el servidor (y los
 * ajustes de Auth de Supabase): aquí solo sirven para avisar antes de enviar.
 */
export const passwordRules = {
  minLength: 10,
  maxLength: 72,
} as const;

/** Lo que se le dice al guardar, según cuánto tarda la web en enseñar el cambio. */
export const savedNotices = {
  /** Un inmueble que está en la web, o que acaba de salir de ella. */
  saved: "Guardado. Ya se ve en la web.",
  /** Un borrador: no sale en la web, así que no hay nada que esperar. */
  savedDraft: "Guardado.",
  published: "Publicado. Ya está en la web.",
} as const;
