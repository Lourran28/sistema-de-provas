import { Save } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "../../components/ui/Button";
import { ModalDialog } from "../../components/ui/ModalDialog";
import { ApiRequestError } from "../../services/httpClient";
import type { Student, StudentInput } from "../../types/students";

type StudentFormModalProps = {
  onClose: () => void;
  onSave: (input: StudentInput) => Promise<void>;
  student?: Student;
};

export function StudentFormModal({ onClose, onSave, student }: StudentFormModalProps) {
  const [name, setName] = useState(student?.name ?? "");
  const [identifier, setIdentifier] = useState(student?.identifier ?? "");
  const [classGroup, setClassGroup] = useState(student?.classGroup ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onSave({ name, identifier: identifier || undefined, classGroup });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível salvar o aluno.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalDialog onClose={onClose} title={student ? "Editar aluno" : "Novo aluno"}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-5 px-5 py-6 sm:px-6">
          {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{error}</div> : null}
          <label className="block text-sm font-medium text-slate-700" htmlFor="student-name">
            Nome do aluno
            <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="student-name" maxLength={180} onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="student-class-group">
              Turma
              <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="student-class-group" maxLength={120} onChange={(event) => setClassGroup(event.target.value)} required value={classGroup} />
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="student-identifier">
              Matrícula ou identificação
              <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="student-identifier" maxLength={80} onChange={(event) => setIdentifier(event.target.value)} value={identifier} />
            </label>
          </div>
        </div>
        <footer className="flex flex-wrap justify-end gap-3 border-t border-stone-200 px-5 py-4 sm:px-6">
          <Button disabled={isSaving} onClick={onClose} type="button" variant="secondary">Cancelar</Button>
          <Button disabled={isSaving} icon={Save} type="submit">{isSaving ? "Salvando..." : "Salvar aluno"}</Button>
        </footer>
      </form>
    </ModalDialog>
  );
}
