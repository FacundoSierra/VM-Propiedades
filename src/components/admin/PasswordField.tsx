"use client";

import { useState } from "react";
import { passwordRules } from "./settings";
import { fieldBase, fieldSizeTall, help as helpText, label as labelText } from "./ui";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  /** Cómo lo nombra el botón «Ver» para quien usa lector de pantalla: «la contraseña actual». */
  spokenName?: string;
  /** Una línea de ayuda debajo del campo. */
  help?: string;
  autoFocus?: boolean;
  /** El id del error que habla de este campo, si lo hay. */
  errorId?: string;
  /** Alto y letra: los de las pantallas sin sesión si no se dice otra cosa. */
  sizeClass?: string;
  className?: string;
}

/** Un campo de contraseña con «Ver», que la enseña mientras se escribe. */
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  spokenName = "la contraseña",
  help,
  autoFocus,
  errorId,
  sizeClass = fieldSizeTall,
  className,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const helpId = help ? `${id}-ayuda` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className={labelText}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          // Al verla, el móvil no debe poner mayúsculas ni corregir lo que se escribe.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={describedBy}
          className={`${fieldBase} ${sizeClass} pr-20`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-controls={id}
          aria-label={`${visible ? "Ocultar" : "Ver"} ${spokenName}`}
          className="absolute inset-y-0 right-0 min-w-16 px-3 font-medium text-panel-ink underline underline-offset-[3px] decoration-panel-line-strong hover:decoration-panel-ink"
        >
          {visible ? "Ocultar" : "Ver"}
        </button>
      </div>
      {help && (
        <p id={helpId} className={`${helpText} mt-1.5`}>
          {help}
        </p>
      )}
    </div>
  );
}

/**
 * Lo que falla en una contraseña nueva antes de mandarla, o `null` si vale.
 * Son las mismas frases que da el servidor, que lo vuelve a comprobar.
 */
export function newPasswordProblem(password: string, repeated: string) {
  if (password.length < passwordRules.minLength) {
    return `La contraseña tiene que tener al menos ${passwordRules.minLength} caracteres.`;
  }
  if (password.length > passwordRules.maxLength) {
    return `La contraseña tiene que tener como mucho ${passwordRules.maxLength} caracteres.`;
  }
  if (password !== repeated) {
    return "Las dos contraseñas nuevas no son iguales. Vuelve a escribirlas.";
  }
  return null;
}
