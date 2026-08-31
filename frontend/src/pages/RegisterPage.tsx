import { ArrowRight, Eye, EyeOff, GraduationCap } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { useAuth } from "../features/auth/useAuth";
import { ApiRequestError } from "../services/httpClient";

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmation) {
      setError("As senhas precisam ser iguais.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({ name, email, password });
      navigate("/dashboard", { replace: true });
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
          <h1 className="text-2xl font-semibold text-slate-950">Criar conta</h1>
          <p className="mt-2 text-sm text-slate-500">Cadastre-se para começar a organizar suas avaliações.</p>
        </div>

        <form className="mt-7 space-y-5 rounded-lg border border-stone-200 bg-white p-6 shadow-panel sm:p-7" onSubmit={handleSubmit}>
          {error ? (
            <div aria-live="polite" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {error}
            </div>
          ) : null}

          <label className="block text-sm font-medium text-slate-700" htmlFor="name">
            Nome completo
            <input
              autoComplete="name"
              className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              id="name"
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              required
              value={name}
            />
          </label>

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
            <PasswordInput
              autoComplete="new-password"
              id="password"
              onChange={setPassword}
              value={password}
              visible={isPasswordVisible}
              onToggleVisibility={() => setIsPasswordVisible((visible) => !visible)}
            />
          </div>

          <div className="block text-sm font-medium text-slate-700">
            <label htmlFor="confirmation">Confirmar senha</label>
            <PasswordInput
              autoComplete="new-password"
              id="confirmation"
              onChange={setConfirmation}
              value={confirmation}
              visible={isPasswordVisible}
              onToggleVisibility={() => setIsPasswordVisible((visible) => !visible)}
            />
          </div>

          <Button className="w-full" disabled={isSubmitting} icon={ArrowRight} type="submit">
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Já possui conta?{" "}
          <Link className="font-semibold text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950" to="/login">
            Entrar
          </Link>
        </p>
      </section>
    </AuthShell>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiRequestError ? error.message : "Não foi possível criar a conta agora. Tente novamente.";
}

type PasswordInputProps = {
  autoComplete: string;
  id: string;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
  value: string;
  visible: boolean;
};

function PasswordInput({ autoComplete, id, onChange, onToggleVisibility, value, visible }: PasswordInputProps) {
  return (
    <div className="relative mt-2">
      <input
        autoComplete={autoComplete}
        className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 pr-11 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        id={id}
        minLength={8}
        onChange={(event) => onChange(event.target.value)}
        required
        type={visible ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-700"
        onClick={onToggleVisibility}
        title={visible ? "Ocultar senha" : "Mostrar senha"}
        type="button"
      >
        {visible ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
      </button>
    </div>
  );
}
