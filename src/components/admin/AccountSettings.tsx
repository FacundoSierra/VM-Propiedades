import ChangePasswordForm from "./ChangePasswordForm";
import LogoutButton from "./LogoutButton";
import { buttonSecondary, card, cardTitle, help } from "./ui";

/** «Mi cuenta»: el correo (solo para verlo), cambiar la contraseña y salir. */
export default function AccountSettings({ email }: { email: string | null }) {
  return (
    <>
      <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em] text-panel-ink md:text-[26px] md:leading-8">
        Mi cuenta
      </h1>

      <div className="mt-5 grid max-w-[640px] grid-cols-1 gap-4 md:mt-7 md:gap-5">
        <section className={card} aria-labelledby="account-email-title">
          <h2 id="account-email-title" className={cardTitle}>
            Tu correo
          </h2>
          {email ? (
            <p className="mt-2 font-medium text-panel-ink [overflow-wrap:anywhere]">{email}</p>
          ) : (
            <p className="mt-2 text-panel-muted">Ahora no se puede leer. Recarga la página.</p>
          )}
          <p className={`${help} mt-1.5`}>
            Es con el que entras en el panel. Para cambiarlo, avisa a quien te mantiene la web.
          </p>
        </section>

        <ChangePasswordForm email={email} />

        <section className={card} aria-labelledby="account-logout-title">
          <h2 id="account-logout-title" className={cardTitle}>
            Salir
          </h2>
          <p className={`${help} mt-1`}>
            Cierra la sesión en este dispositivo. Para volver a entrar, te pedirá el correo y la
            contraseña.
          </p>
          <LogoutButton className={`${buttonSecondary} mt-4 w-full md:w-auto`} />
        </section>
      </div>
    </>
  );
}
