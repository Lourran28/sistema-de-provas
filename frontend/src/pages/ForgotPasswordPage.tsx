import { ArrowLeft, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { requestPasswordReset } from "../services/authService";
import { ApiRequestError } from "../services/httpClient";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await requestPasswordReset({ email });
      setIsSent(true);
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : "Não foi possível enviar a solicitação agora. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <section className="w-full max-w-md">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Redefinir senha</h1>
          <p className="mt-2 text-sm text-slate-500">
            Informe o e-mail da sua conta para receber o link de redefinição.
          </p>
        </div>

        {isSent ? (
          <div className="mt-7 rounded-lg border border-stone-200 bg-white p-6 shadow-panel sm:p-7">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
              <Mail aria-hidden="true" size={20} />
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-950">Confira seu e-mail</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Se existir uma conta com esse endereço, enviaremos um link válido por 15 minutos.
              Verifique também a caixa de spam.
            </p>
          </div>
        ) : (
          <form className="mt-7 space-y-5 rounded-lg border border-stone-200 bg-white p-6 shadow-panel sm:p-7" onSubmit={handleSubmit}>
            {error ? (
              <div aria-live="polite" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {error}
              </div>
            ) : null}

            <label className="block text-sm font-medium text-slate-700" htmlFor="reset-email">
              E-mail
              <input
                autoComplete="email"
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="reset-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="professor@escola.com"
                required
                type="email"
                value={email}
              />
            </label>

            <Button className="w-full" disabled={isSubmitting} icon={Mail} type="submit">
              {isSubmitting ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}

        <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-950" to="/login">
          <ArrowLeft aria-hidden="true" size={17} />
          Voltar para entrar
        </Link>
      </section>
    </AuthShell>
  );
}
