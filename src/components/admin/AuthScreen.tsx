import Image from "next/image";
import { panelDisplayHost } from "@/lib/panelHost";

/** El marco de las pantallas sin sesión: entrar, recuperar la contraseña y elegir una nueva. */
export default function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-6 py-8">
      <div className="w-full max-w-[380px]">
        <Image
          src="/logo.png"
          alt="VM Propiedades"
          width={518}
          height={700}
          preload
          className="mx-auto h-32 w-auto"
        />
        {children}
        <p className="mt-10 text-center text-[13px] text-panel-muted">{panelDisplayHost}</p>
      </div>
    </div>
  );
}
