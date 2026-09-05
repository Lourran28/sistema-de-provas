import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { useAuth } from "../features/auth/useAuth";
import { resetPassword } from "../services/authService";
import { ApiRequestError } from "../services/httpClient";

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const token = (new URLSearchParams(location.hash.slice(1)).get("token")
    ?? new URLSearchParams(location.search).get("token"))?.trim() ?? "";
  const hasValidToken = /^[A-Za-z0-9_-]{43}$/.test(token);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isSubmitting) return;
    if (!hasValidToken) {
      setError("Este link de redefinição é inválido.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas informadas não são iguais.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("A senha é longa demais. Use no máximo 72 bytes, considerando acentos e símbolos.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ token, newPassword: password });
      signOut();
      setPassword("");
      setConfirmation("");
      setIsComplete(true);
      navigate("/redefinir-senha", { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError
          ? requestError.fieldErrors.newPassword ?? requestError.fieldErrors.token ?? requestError.message
          : "Não foi possível redefinir a senha agora. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <meta name="referrer" content="no-referrer" />
      <section className="w-full max-w-md">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Criar nova senha</h1>
          <p className="mt-2 text-sm text-slate-500">Escolha uma nova senha com pelo menos 8 caracteres.</p>
        </div>

        {isComplete ? (
          <div className="mt-7 rounded-lg border border-stone-200 bg-white p-6 shadow-panel sm:p-7">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <KeyRound aria-hidden="true" size={20} />
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-950">Senha redefinida</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Sua nova senha já está ativa. Agora você pode entrar normalmente.</p>
            <Link
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800"
              to="/login"
            >
              Entrar
            </Link>
          </div>
        ) : (
          <form className="mt-7 space-y-5 rounded-lg border border-stone-200 bg-white p-6 shadow-panel sm:p-7" onSubmit={handleSubmit}>
            {error || !hasValidToken ? (
              <div aria-live="polite" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {error || "Este link de redefinição é inválido."}
              </div>
            ) : null}

            <PasswordInput
              autoComplete="new-password"
              id="new-password"
              label="Nova senha"
              onChange={(value) => { setPassword(value); setError(""); }}
              value={password}
              visible={isPasswordVisible}
            />
            <PasswordInput
              autoComplete="new-password"
              id="confirm-password"
              label="Confirmar nova senha"
              onChange={(value) => { setConfirmation(value); setError(""); }}
              value={confirmation}
              visible={isPasswordVisible}
            />

            <button
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-800"
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              type="button"
            >
              {isPasswordVisible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
              {isPasswordVisible ? "Ocultar senhas" : "Mostrar senhas"}
            </button>

            <Button className="w-full" disabled={isSubmitting || !hasValidToken} icon={KeyRound} type="submit">
              {isSubmitting ? "Salvando..." : "Salvar nova senha"}
            </Button>
            <Link className="block text-center text-sm font-semibold text-teal-800 underline underline-offset-4" to="/esqueci-senha">
              Solicitar novo link
            </Link>
          </form>
        )}

        {!isComplete ? (
          <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-950" to="/login">
            <ArrowLeft aria-hidden="true" size={17} />
            Voltar para entrar
          </Link>
        ) : null}
      </section>
    </AuthShell>
  );
}

type PasswordInputProps = {
  autoComplete: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
  visible: boolean;
};

function PasswordInput({ autoComplete, id, label, onChange, value, visible }: PasswordInputProps) {
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      <input
        autoComplete={autoComplete}
        className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        id={id}
        minLength={8}
        maxLength={72}
        onChange={(event) => onChange(event.target.value)}
        required
        type={visible ? "text" : "password"}
        value={value}
      />
    </label>
  );
}
