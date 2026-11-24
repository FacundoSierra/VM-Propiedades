/**
 * Traduce los errores de la base al guardar un inmueble a la frase que enseña
 * el panel, con su código HTTP (REQ-001, sección 4.7 de la spec).
 *
 * - Las reglas las garantiza la base (disparador `properties_before_write`) y
 *   avisan con `P0001` y un mensaje que empieza por `vm:`.
 * - Los `check` de la tabla dan `23514`, con el nombre de la restricción
 *   (`properties_<campo>_valido`); escribir una columna sin permiso, `42501`.
 * - Las frases son las que daba antes `applyChange` de `propertyRules.ts`, que
 *   ya conocen las pantallas.
 *
 * Funciones puras: el detalle técnico no sale nunca en la frase, se devuelve
 * aparte (`log`) para que la ruta lo escriba en el log del servidor.
 */
import { MAX_FEATURED, panelStatusLabels, type PropertyStatus } from "@/data/properties";
import { joinEs } from "@/lib/propertyRules";

export type DbError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type TranslatedError = {
  status: number;
  error: string;
  /** Lo que va al log del servidor, si hace falta. Nunca se enseña. */
  log?: string;
};

/** Lo que falta para publicar, como lo dice la base → como lo dice el panel. */
const MISSING_WORDS: Record<string, string> = {
  titulo: "el título",
  zona: "la zona",
  direccion: "la dirección",
  precio: "el precio",
  superficie: "la superficie",
  descripcion: "la descripción",
  fotos: "al menos una foto",
};

export const SAVE_FAILED = "No se ha podido guardar. Vuelve a intentarlo en un momento.";
export const NO_PERMISSION = "Tu cuenta no tiene permiso para cambiar inmuebles.";
export const INVALID_DATA = "Hay un dato que no es válido. Revisa el formulario.";

/** El 409 de borrar algo que está en la web, con su estado si se sabe. */
export function cannotDeleteMessage(status?: PropertyStatus | null) {
  const where = status
    ? `Este inmueble está ${panelStatusLabels[status].toLowerCase()} y sale en la web.`
    : "Este inmueble sale en la web.";
  return `${where} Para borrarlo, ocúltalo antes: así nunca se borra nada por error.`;
}

function describe(error: DbError) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" · ");
}

/**
 * @param context.status El estado que tenía el inmueble (para el 409 de borrar).
 */
export function translatePropertyError(
  error: DbError | null | undefined,
  context: { status?: PropertyStatus | null } = {},
): TranslatedError {
  if (!error) return { status: 500, error: SAVE_FAILED, log: "error vacío" };
  const code = error.code ?? "";
  const message = (error.message ?? "").trim();

  if (code === "P0001" && message.startsWith("vm:")) {
    const rule = message.slice(3);

    if (rule.startsWith("faltan:")) {
      const keys = rule.slice("faltan:".length).split(",").map((k) => k.trim()).filter(Boolean);
      const words = keys.map((k) => MISSING_WORDS[k]);
      if (words.length > 0 && words.every(Boolean)) {
        return { status: 422, error: `Para que salga en la web falta ${joinEs(words)}.` };
      }
      return { status: 500, error: SAVE_FAILED, log: `Lista de «faltan» desconocida: ${describe(error)}` };
    }

    switch (rule) {
      case "no_vuelve_a_borrador":
        return {
          status: 422,
          error:
            "Un inmueble que ya ha salido en la web no vuelve a borrador. Para quitarlo de la web, ocúltalo.",
        };
      case "destacadas_llenas":
        return {
          status: 422,
          error: `Ya hay ${MAX_FEATURED} inmuebles en la portada. Quita uno antes de destacar este.`,
        };
      case "no_se_puede_borrar":
        return { status: 409, error: cannotDeleteMessage(context.status) };
      case "fotos_no_validas":
        return { status: 422, error: "Alguna foto no se ha subido bien. Quítala y vuelve a subirla." };
      case "caracteristicas":
        return {
          status: 422,
          error: "Revisa las características: como mucho 40, y cada una de 120 caracteres como mucho.",
        };
      case "slug_fijo":
        return { status: 422, error: "La dirección de un inmueble en la web no se puede cambiar." };
      default:
        return { status: 500, error: SAVE_FAILED, log: `Regla desconocida: ${describe(error)}` };
    }
  }

  // Un `check` de la tabla: el nombre de la restricción va al log.
  if (code === "23514") return { status: 422, error: INVALID_DATA, log: describe(error) };
  // Un dato con un formato que Postgres no acepta (un número, una lista).
  if (code.startsWith("22")) return { status: 422, error: INVALID_DATA, log: describe(error) };
  if (code === "42501") return { status: 403, error: NO_PERMISSION, log: describe(error) };

  return { status: 500, error: SAVE_FAILED, log: describe(error) };
}
