/**
 * Clases del panel que se repiten. Botones rectos y sin sombras; en el móvil,
 * todo lo que se pulsa mide 44 px o más.
 *
 * Las medidas van aparte de la forma y el color para no juntar dos alturas en
 * el mismo elemento (Tailwind no garantiza cuál de las dos gana).
 */

const buttonShape =
  "inline-flex items-center justify-center whitespace-nowrap px-[18px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const primaryColors =
  "bg-panel-accent text-white hover:bg-panel-accent-dark disabled:hover:bg-panel-accent";

const secondaryColors =
  "bg-panel-surface text-panel-ink shadow-[inset_0_0_0_1px_var(--panel-field)] hover:bg-panel-surface-2";

export const buttonPrimary = `${buttonShape} ${primaryColors} min-h-11 md:min-h-[38px]`;
export const buttonSecondary = `${buttonShape} ${secondaryColors} min-h-11 md:min-h-[38px]`;

/** Los de las barras fijas de abajo del móvil y la pantalla de entrar: más altos. */
export const buttonPrimaryTall = `${buttonShape} ${primaryColors} min-h-12 text-[15px]`;
export const buttonSecondaryTall = `${buttonShape} ${secondaryColors} min-h-12 text-[15px]`;

/** El botón «Editar» de la lista. */
export const buttonGhost =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap px-3 font-medium text-panel-ink shadow-[inset_0_0_0_1px_var(--panel-line-strong)] transition-colors hover:bg-panel-surface-2 md:min-h-8";

/** Acción secundaria escrita como texto subrayado («Copiar el enlace», «Deshacer»). */
export const textButton =
  "inline-flex min-h-11 items-center font-medium text-panel-ink underline underline-offset-[3px] decoration-panel-line-strong transition-colors hover:decoration-panel-ink disabled:cursor-not-allowed disabled:text-panel-muted disabled:no-underline md:min-h-0";

/**
 * Forma de los campos, sin alto ni tamaño de letra. Con el foco, el borde
 * engorda en vez de dibujar un contorno aparte.
 */
export const fieldBase =
  "panel-field block w-full min-w-0 border border-panel-field bg-white px-3 text-panel-ink placeholder:text-panel-muted focus-visible:border-panel-ink focus-visible:shadow-[inset_0_0_0_1px_var(--panel-ink)] focus-visible:outline-none disabled:bg-panel-surface-2";

/** Alto y letra del campo normal: 16 px en el móvil para que el iPhone no haga zoom al escribir. */
export const fieldSize = "h-12 text-base md:h-10 md:text-sm";

/** Los de las pantallas sin sesión (entrar, recuperar la contraseña): igual de altos en todas partes. */
export const fieldSizeTall = "h-12 text-base";

export const field = `${fieldBase} ${fieldSize}`;

/** Los desplegables necesitan sitio a la derecha para la flecha. */
export const selectField = `${field} pr-10`;

export const textareaField = `${fieldBase} min-h-[150px] resize-y py-2.5 text-base leading-[22px] md:text-sm`;

export const label = "mb-2 block font-medium text-panel-ink";

/** Cada caja blanca del panel. */
export const card = "bg-panel-surface p-4 md:p-6";

export const cardTitle = "text-base font-semibold text-panel-ink";

export const help = "text-[13px] leading-5 text-panel-muted";

/** El titular de las pantallas sin sesión. Sin contorno: recibe el foco al cambiar de paso. */
export const authHeading = "mt-9 text-2xl font-semibold text-panel-ink outline-none";

export const authLead = "mt-1.5 text-panel-muted";

/** El enlace de texto de debajo del botón («¿Has olvidado la contraseña?», «Volver a entrar»). */
export const authLink =
  "mt-3 flex min-h-11 items-center justify-center text-center font-medium text-panel-ink underline underline-offset-[3px]";
