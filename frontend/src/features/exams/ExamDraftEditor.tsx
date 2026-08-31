import { ChevronDown, ChevronUp, Search, Save, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import { ApiRequestError } from "../../services/httpClient";
import type { Exam, ExamInput } from "../../types/exams";
import type { Content, Subject } from "../../types/contents";
import { difficultyLabels, type Question } from "../../types/questions";

type ExamDraftEditorProps = {
  contents: Content[];
  exam: Exam;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (input: ExamInput) => Promise<void>;
  questions: Question[];
  subjects: Subject[];
};

export function ExamDraftEditor({ contents, exam, isSaving, onCancel, onSave, questions, subjects }: ExamDraftEditorProps) {
  const [title, setTitle] = useState(exam.title);
  const [subjectId, setSubjectId] = useState(exam.subjectId ?? "");
  const [classGroup, setClassGroup] = useState(exam.classGroup ?? "");
  const [topic, setTopic] = useState(exam.topic ?? "");
  const [description, setDescription] = useState(exam.description ?? "");
  const [instructions, setInstructions] = useState(exam.instructions ?? "");
  const [examDate, setExamDate] = useState(exam.examDate ?? "");
  const [totalScore, setTotalScore] = useState(String(exam.totalScore));
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(() => exam.questions.map((question) => question.questionId));
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const contentNames = useMemo(() => new Map(contents.map((content) => [content.id, content.title])), [contents]);
  const subjectNames = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject.name])), [subjects]);
  const visibleQuestions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    return questions.filter((question) => {
      const matchesSearch = !normalizedSearch || question.statement.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
      const matchesSubject = !subjectId || !question.subjectId || question.subjectId === subjectId;
      return matchesSearch && matchesSubject;
    });
  }, [questions, search, subjectId]);
  const selectedQuestions = selectedQuestionIds.map((id) => ({ id, question: questionById.get(id) }));
  const scorePerQuestion = selectedQuestionIds.length > 0 ? Number(totalScore || 0) / selectedQuestionIds.length : 0;

  function toggleQuestion(questionId: string) {
    setSelectedQuestionIds((current) => current.includes(questionId)
      ? current.filter((selectedId) => selectedId !== questionId)
      : [...current, questionId]);
  }

  function changeSubject(nextSubjectId: string) {
    setSubjectId(nextSubjectId);
    if (!nextSubjectId) {
      return;
    }
    setSelectedQuestionIds((current) => current.filter((questionId) => {
      const question = questionById.get(questionId);
      return !question?.subjectId || question.subjectId === nextSubjectId;
    }));
  }

  function moveQuestion(questionId: string, direction: -1 | 1) {
    setSelectedQuestionIds((current) => {
      const currentIndex = current.indexOf(questionId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const score = Number(totalScore);
    if (selectedQuestionIds.length === 0) {
      setError("Selecione pelo menos uma questão para salvar a prova.");
      return;
    }
    if (!Number.isFinite(score) || score <= 0) {
      setError("Informe uma nota total maior que zero.");
      return;
    }
    try {
      await onSave({
        subjectId: subjectId || undefined,
        title,
        classGroup: classGroup || undefined,
        topic: topic || undefined,
        description: description || undefined,
        instructions: instructions || undefined,
        examDate: examDate || undefined,
        totalScore: score,
        questionIds: selectedQuestionIds
      });
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível salvar o rascunho.");
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-4 border-y border-stone-200 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-800">Edição do rascunho</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Ajuste a composição antes de aprovar</h2>
          <p className="mt-1 text-sm text-slate-500">As versões oficiais permanecem protegidas; este editor só funciona enquanto a prova ainda é um rascunho.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button disabled={isSaving} onClick={onCancel} type="button" variant="secondary">Cancelar</Button>
          <Button disabled={isSaving} icon={Save} type="submit">{isSaving ? "Salvando..." : "Salvar alterações"}</Button>
        </div>
      </section>

      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="draft-exam-title">
            Título da prova
            <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="draft-exam-title" maxLength={180} onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <label className="block text-sm font-medium text-slate-700" htmlFor="draft-exam-subject">
            Disciplina
            <select className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="draft-exam-subject" onChange={(event) => changeSubject(event.target.value)} value={subjectId}>
              <option value="">Sem disciplina</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700" htmlFor="draft-exam-class-group">
            Turma
            <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="draft-exam-class-group" maxLength={120} onChange={(event) => setClassGroup(event.target.value)} value={classGroup} />
          </label>
          <label className="block text-sm font-medium text-slate-700" htmlFor="draft-exam-topic">
            Assunto
            <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="draft-exam-topic" maxLength={160} onChange={(event) => setTopic(event.target.value)} value={topic} />
          </label>
          <label className="block text-sm font-medium text-slate-700" htmlFor="draft-exam-date">
            Data da prova
            <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="draft-exam-date" onChange={(event) => setExamDate(event.target.value)} type="date" value={examDate} />
          </label>
          <label className="block text-sm font-medium text-slate-700" htmlFor="draft-exam-score">
            Nota total
            <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="draft-exam-score" min="0.01" onChange={(event) => setTotalScore(event.target.value)} required step="0.01" type="number" value={totalScore} />
          </label>
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2" htmlFor="draft-exam-description">
            Descrição interna
            <textarea className="mt-2 min-h-24 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-3 leading-6 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="draft-exam-description" maxLength={10000} onChange={(event) => setDescription(event.target.value)} value={description} />
          </label>
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2" htmlFor="draft-exam-instructions">
            Instruções ao aluno
            <textarea className="mt-2 min-h-28 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-3 leading-6 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="draft-exam-instructions" maxLength={10000} onChange={(event) => setInstructions(event.target.value)} value={instructions} />
          </label>
        </div>

        <aside className="border border-stone-200 bg-white p-4 shadow-panel">
          <p className="text-sm font-semibold text-slate-950">Resumo</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3"><dt className="text-slate-600">Questões</dt><dd className="font-semibold text-slate-950">{selectedQuestionIds.length}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-slate-600">Nota total</dt><dd className="font-semibold text-slate-950">{formatScore(Number(totalScore || 0))}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-slate-600">Por questão</dt><dd className="font-semibold text-slate-950">{selectedQuestionIds.length ? formatScore(scorePerQuestion) : "-"}</dd></div>
          </dl>
          <p className="mt-5 border-t border-stone-200 pt-4 text-xs leading-5 text-slate-500">A nota será redistribuída automaticamente conforme a ordem das questões selecionadas.</p>
        </aside>
      </section>

      <section className="border-t border-stone-200 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Questões da prova</h2>
            <p className="mt-1 text-sm text-slate-500">Use as setas para definir a ordem que aparecerá antes do embaralhamento das versões.</p>
          </div>
          <span className="text-sm font-semibold text-teal-800">{selectedQuestionIds.length} selecionadas</span>
        </div>
        <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
          {selectedQuestions.map(({ id, question }, index) => (
            <article className="flex items-start gap-3 py-4" key={id}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-bold text-slate-700">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{question?.statement ?? "Questão não disponível"}</p>
                {question ? <p className="mt-1 text-xs text-slate-500">{question.subjectId ? subjectNames.get(question.subjectId) ?? "Disciplina removida" : "Sem disciplina"} · {difficultyLabels[question.difficulty]}{question.contentIds[0] ? ` · ${contentNames.get(question.contentIds[0]) ?? "Conteúdo removido"}` : ""}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button aria-label={`Mover questão ${index + 1} para cima`} className="h-9 w-9 px-0" disabled={index === 0} icon={ChevronUp} onClick={() => moveQuestion(id, -1)} title="Mover para cima" type="button" variant="ghost" />
                <Button aria-label={`Mover questão ${index + 1} para baixo`} className="h-9 w-9 px-0" disabled={index === selectedQuestions.length - 1} icon={ChevronDown} onClick={() => moveQuestion(id, 1)} title="Mover para baixo" type="button" variant="ghost" />
                <Button aria-label={`Remover questão ${index + 1}`} className="h-9 w-9 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800" icon={Trash2} onClick={() => toggleQuestion(id)} title="Remover questão" type="button" variant="ghost" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-200 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Adicionar do banco de questões</h2>
            <p className="mt-1 text-sm text-slate-500">As questões compatíveis com a disciplina escolhida aparecem abaixo.</p>
          </div>
          <label className="relative block w-full sm:w-80">
            <span className="sr-only">Buscar questão</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
            <input className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar questão" type="search" value={search} />
          </label>
        </div>
        <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
          {visibleQuestions.map((question) => {
            const isSelected = selectedQuestionIds.includes(question.id);
            return (
              <label className="flex cursor-pointer items-start gap-3 px-1 py-4" key={question.id}>
                <input checked={isSelected} className="mt-1 h-4 w-4 rounded border-stone-300 text-teal-700 focus:ring-teal-700" onChange={() => toggleQuestion(question.id)} type="checkbox" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{question.statement}</span>
                  <span className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600"><span>{difficultyLabels[question.difficulty]}</span>{question.contentIds[0] ? <span>{contentNames.get(question.contentIds[0]) ?? "Conteúdo removido"}</span> : null}</span>
                </span>
              </label>
            );
          })}
          {visibleQuestions.length === 0 ? <p className="px-1 py-5 text-sm text-slate-500">Nenhuma questão corresponde à busca ou à disciplina selecionada.</p> : null}
        </div>
      </section>
    </form>
  );
}

function formatScore(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} pontos`;
}
