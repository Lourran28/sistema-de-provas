import { ArrowRight, Eye, EyeOff, GraduationCap, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { useAuth } from "../features/auth/useAuth";
import { ApiRequestError } from "../services/httpClient";

type LocationState = {
  from?: { pathname?: string };
  passwordChanged?: boolean;
};

export function LoginPage() {
  const { signIn, signInDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/dashboard";
  const isLocalDemoAvailable = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoSignIn() {
    setError("");
    setIsSubmitting(true);
    try {
      await signInDemo();
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <section className="w-full max-w-md">
        <div className="mb-8 lg:hidden">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-teal-700 text-white">
            <GraduationCap aria-hidden="true" size={23} />
          </div>
          <p className="mt-4 text-base font-semibold text-slate-950">Sistema de Provas</p>
          <p className="mt-1 text-sm text-slate-500">Painel do professor</p>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Entrar</h1>
          <p className="mt-2 text-sm text-slate-500">Use seus dados para acessar o painel.</p>
        </div>

        <form className="mt-7 space-y-5 rounded-lg border border-stone-200 bg-white p-6 shadow-panel sm:p-7" onSubmit={handleSubmit}>
          {(location.state as LocationState | null)?.passwordChanged ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
              Senha alterada. Entre novamente com sua nova senha.
            </div>
          ) : null}
          {error ? (
            <div aria-live="polite" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {error}
            </div>
          ) : null}

          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            E-mail
            <input
              autoComplete="email"
              className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="professor@escola.com"
              required
              type="email"
              value={email}
            />
          </label>

          <div className="block text-sm font-medium text-slate-700">
            <label htmlFor="password">Senha</label>
            <div className="relative mt-2">
              <input
                autoComplete="current-password"
                className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 pr-11 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type={isPasswordVisible ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-700"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                title={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                type="button"
              >
                {isPasswordVisible ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
              </button>
            </div>
            <div className="mt-2 text-right">
              <Link
                className="font-semibold text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950"
                to="/esqueci-senha"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <Button className="w-full" disabled={isSubmitting} icon={ArrowRight} type="submit">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>

          {isLocalDemoAvailable ? (
            <Button className="w-full" disabled={isSubmitting} icon={Sparkles} onClick={() => void handleDemoSignIn()} variant="secondary">
              Entrar na demonstração
            </Button>
          ) : null}
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Ainda não possui conta?{" "}
          <Link className="font-semibold text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950" to="/cadastro">
            Criar conta
          </Link>
        </p>
      </section>
    </AuthShell>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiRequestError ? error.message : "Não foi possível entrar agora. Tente novamente.";
}
