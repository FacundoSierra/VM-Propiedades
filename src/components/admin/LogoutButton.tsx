"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/adminApi";
import { usePanelHref } from "./PanelLinks";

const headerStyle =
  "inline-flex min-h-11 items-center font-medium text-panel-muted transition-colors hover:text-panel-ink disabled:opacity-60 md:min-h-0";

/** Sin `className`, el «Salir» discreto de la barra de arriba. */
export default function LogoutButton({ className = headerStyle }: { className?: string }) {
  const router = useRouter();
  const href = usePanelHref();
  const [leaving, setLeaving] = useState(false);

  async function handleLogout() {
    setLeaving(true);
    // Aunque falle la llamada, se le lleva a entrar: si la sesión sigue viva, el panel le deja pasar.
    await logout().catch(() => undefined);
    router.push(href("/login"));
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={leaving}
      // El editor avisa antes de salir si hay cambios sin guardar.
      data-leave-guard
      className={className}
    >
      Salir
    </button>
  );
}
