import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "../../components/ui/Button";
import { useConfirmation } from "../../components/ui/confirmationContext";
import { ModalDialog } from "../../components/ui/ModalDialog";
import { createSubject, deleteSubject, updateSubject } from "../../services/subjectService";
import { ApiRequestError } from "../../services/httpClient";
import type { Subject, SubjectInput } from "../../types/contents";

type SubjectManagerModalProps = {
  onClose: () => void;
  onRefresh: () => Promise<void>;
  subjects: Subject[];
};

const emptySubject: SubjectInput = { name: "", description: "" };

export function SubjectManagerModal({ onClose, onRefresh, subjects }: SubjectManagerModalProps) {
  const { confirm } = useConfirmation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<SubjectInput>(emptySubject);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function startEditing(subject?: Subject) {
    setError("");
    setEditingId(subject?.id ?? null);
    setInput(subject ? { name: subject.name, description: subject.description ?? "" } : emptySubject);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      if (editingId) {
        await updateSubject(editingId, input);
      } else {
        await createSubject(input);
      }
      await onRefresh();
      startEditing();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(subject: Subject) {
    if (!(await confirm({
      confirmLabel: "Excluir disciplina",
      description: `Excluir a disciplina “${subject.name}”? Conteúdos e provas já cadastrados serão preservados.`,
      title: "Excluir disciplina",
      variant: "danger"
    }))) {
      return;
    }

    setError("");
    try {
      await deleteSubject(subject.id);
      await onRefresh();
      if (editingId === subject.id) {
        startEditing();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  return (
    <ModalDialog onClose={onClose} title="Disciplinas">
      <div className="grid divide-y divide-stone-200 lg:grid-cols-[1fr_280px] lg:divide-x lg:divide-y-0">
        <div className="max-h-[56vh] overflow-y-auto px-5 py-5 sm:px-6">
          {error ? (
            <div aria-live="polite" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {error}
            </div>
          ) : null}

          {subjects.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">Nenhuma disciplina cadastrada.</p>
          ) : (
            <ul className="divide-y divide-stone-200">
              {subjects.map((subject) => (
                <li className="flex items-center justify-between gap-3 py-3" key={subject.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{subject.name}</p>
                    {subject.description ? <p className="mt-1 truncate text-sm text-slate-500">{subject.description}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      aria-label={`Editar ${subject.name}`}
                      className="h-9 w-9 px-0"
                      icon={Pencil}
                      onClick={() => startEditing(subject)}
                      title="Editar disciplina"
                      variant="ghost"
                    />
                    <Button
                      aria-label={`Excluir ${subject.name}`}
                      className="h-9 w-9 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      icon={Trash2}
                      onClick={() => void handleDelete(subject)}
                      title="Excluir disciplina"
                      variant="ghost"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="space-y-4 px-5 py-5 sm:px-6" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">{editingId ? "Editar disciplina" : "Nova disciplina"}</h3>
            {editingId ? (
              <Button className="h-8 px-2 text-xs" icon={Plus} onClick={() => startEditing()} type="button" variant="ghost">
                Nova
              </Button>
            ) : null}
          </div>

          <label className="block text-sm font-medium text-slate-700" htmlFor="subject-name">
            Nome
            <input
              className="mt-2 h-10 w-full rounded-lg border border-stone-300 px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              id="subject-name"
              maxLength={140}
              onChange={(event) => setInput((current) => ({ ...current, name: event.target.value }))}
              required
              value={input.name}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700" htmlFor="subject-description">
            Descrição
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              id="subject-description"
              maxLength={2000}
              onChange={(event) => setInput((current) => ({ ...current, description: event.target.value }))}
              value={input.description}
            />
          </label>

          <Button className="w-full" disabled={isSaving} icon={Save} type="submit">
            {isSaving ? "Salvando..." : editingId ? "Salvar alteração" : "Adicionar disciplina"}
          </Button>
        </form>
      </div>
    </ModalDialog>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiRequestError ? error.message : "Não foi possível salvar a disciplina.";
}
