import { CheckCircle2, LogOut, Pencil, Save, ShieldCheck, UserRound, X } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../features/auth/useAuth";
import { ApiRequestError } from "../services/httpClient";

export function ProfilePage() {
  const { signOut, updateProfile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!user) {
    return null;
  }

  function cancelEditing() {
    if (!user) {
      return;
    }
    setName(user.name);
    setEmail(user.email);
    setError("");
    setIsEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      setNotice("Dados atualizados com sucesso.");
      setIsEditing(false);
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível atualizar seus dados.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Perfil</h1>
          <p className="mt-1 text-sm text-slate-500">Mantenha seus dados básicos atualizados.</p>
        </div>
        {!isEditing ? <Button icon={Pencil} onClick={() => { setName(user.name); setEmail(user.email); setError(""); setNotice(""); setIsEditing(true); }} variant="secondary">Editar dados</Button> : null}
      </section>

      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}
      {notice ? <div aria-live="polite" className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status"><CheckCircle2 aria-hidden="true" size={18} />{notice}</div> : null}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 border-b border-stone-200 bg-stone-50 px-5 py-5">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-teal-700 text-white">
            <UserRound aria-hidden="true" size={24} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-950">{user.name}</p>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        {isEditing ? (
          <form className="space-y-5 px-5 py-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700" htmlFor="profile-name">
              Nome
              <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 font-normal text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="profile-name" maxLength={160} onChange={(event) => setName(event.target.value)} required value={name} />
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="profile-email">
              E-mail
              <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 font-normal text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="profile-email" maxLength={180} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <div className="flex flex-wrap justify-end gap-3 border-t border-stone-200 pt-5">
              <Button disabled={isSaving} icon={X} onClick={cancelEditing} variant="secondary">Cancelar</Button>
              <Button disabled={isSaving} icon={Save} type="submit">{isSaving ? "Salvando..." : "Salvar dados"}</Button>
            </div>
          </form>
        ) : (
          <dl className="divide-y divide-stone-200">
            <ProfileRow label="Nome" value={user.name} />
            <ProfileRow label="E-mail" value={user.email} />
            <div className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-4">
              <dt className="text-sm font-medium text-slate-500">Função</dt>
              <dd className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <ShieldCheck aria-hidden="true" className="text-teal-700" size={17} />
                {user.role === "ADMIN" ? "Administrador" : "Professor"}
              </dd>
            </div>
          </dl>
        )}

        <div className="border-t border-stone-200 px-5 py-4">
          <Button icon={LogOut} onClick={signOut} variant="ghost">Sair da conta</Button>
        </div>
      </Card>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}
