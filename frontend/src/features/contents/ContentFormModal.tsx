import { Save } from "lucide-react";
import { type FormEvent, useState } from "react";

import { ModalDialog } from "../../components/ui/ModalDialog";
import { Button } from "../../components/ui/Button";
import { ApiRequestError } from "../../services/httpClient";
import type { Content, ContentInput, Subject } from "../../types/contents";

type ContentFormModalProps = {
  content?: Content;
  onClose: () => void;
  onSave: (input: ContentInput) => Promise<void>;
  subjects: Subject[];
  topics: string[];
};

export function ContentFormModal({ content, onClose, onSave, subjects, topics }: ContentFormModalProps) {
  const [subjectId, setSubjectId] = useState(content?.subjectId ?? "");
  const [title, setTitle] = useState(content?.title ?? "");
  const [topic, setTopic] = useState(content?.topic ?? "");
  const [theme, setTheme] = useState(content?.theme ?? "");
  const [body, setBody] = useState(content?.body ?? "");
  const [notes, setNotes] = useState(content?.notes ?? "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onSave({
        subjectId: subjectId || undefined,
        title,
        topic,
        theme: theme || undefined,
        body,
        notes: notes || undefined
      });
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalDialog onClose={onClose} title={content ? "Editar conteúdo" : "Novo conteúdo"}>
      <form className="divide-y divide-stone-200" onSubmit={handleSubmit}>
        <div className="space-y-5 px-5 py-6 sm:px-6">
          {error ? (
            <div aria-live="polite" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {error}
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="content-title">
              Título
              <input
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="content-title"
                maxLength={180}
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700" htmlFor="content-subject">
              Disciplina
              <select
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="content-subject"
                onChange={(event) => setSubjectId(event.target.value)}
                value={subjectId}
              >
                <option value="">Sem disciplina</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700" htmlFor="content-topic">
              Assunto
              <input
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="content-topic"
                list="content-topic-options"
                maxLength={160}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Selecione ou digite um assunto"
                required
                value={topic}
              />
              <datalist id="content-topic-options">
                {topics.map((option) => <option key={option} value={option} />)}
              </datalist>
            </label>

            <label className="block text-sm font-medium text-slate-700" htmlFor="content-theme">
              Tema
              <input
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="content-theme"
                maxLength={160}
                onChange={(event) => setTheme(event.target.value)}
                value={theme}
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700" htmlFor="content-body">
            Material de referência
            <textarea
              className="mt-2 min-h-48 w-full resize-y rounded-lg border border-stone-300 px-3 py-3 leading-6 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              id="content-body"
              maxLength={50000}
              onChange={(event) => setBody(event.target.value)}
              required
              value={body}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700" htmlFor="content-notes">
            Observações
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-lg border border-stone-300 px-3 py-3 leading-6 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              id="content-notes"
              maxLength={10000}
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>
        </div>

        <footer className="flex flex-wrap justify-end gap-3 px-5 py-4 sm:px-6">
          <Button disabled={isSubmitting} onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={isSubmitting} icon={Save} type="submit">
            {isSubmitting ? "Salvando..." : "Salvar conteúdo"}
          </Button>
        </footer>
      </form>
    </ModalDialog>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiRequestError ? error.message : "Não foi possível salvar o conteúdo.";
}
