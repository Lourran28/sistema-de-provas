import { ChevronLeft, ChevronRight, CircleHelp, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirmation } from "../components/ui/confirmationContext";
import { MathText } from "../components/ui/MathText";
import { QuestionFormModal } from "../features/questions/QuestionFormModal";
import { getContents } from "../services/contentService";
import { ApiRequestError } from "../services/httpClient";
import { clearQuestions, createQuestion, deleteQuestion, getQuestions, updateQuestion } from "../services/questionService";
import { ModalDialog } from "../components/ui/ModalDialog";
import { createSubject, getSubjects } from "../services/subjectService";
import type { Content, Subject } from "../types/contents";
import { difficultyLabels, type Question, type QuestionDifficulty, type QuestionFilters, type QuestionInput, type QuestionPage } from "../types/questions";

const initialPage: QuestionPage = {
  items: [],
  page: { number: 0, size: 12, totalElements: 0, totalPages: 0 }
};

export function QuestionsPage() {
  const { confirm } = useConfirmation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [questionPage, setQuestionPage] = useState<QuestionPage>(initialPage);
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>();
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadReferenceData = useCallback(async () => {
    const [nextSubjects, contentPage] = await Promise.all([getSubjects(), getContents({ size: 100 })]);
    setSubjects(nextSubjects);
    setContents(contentPage.items);
  }, []);

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setQuestionPage(await getQuestions(filters));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível carregar suas questões."));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReferenceData().catch((requestError: unknown) => setError(getErrorMessage(requestError, "Não foi possível carregar os dados de apoio.")));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReferenceData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQuestions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      search: search.trim() || undefined,
      subjectId: subjectId || undefined,
      difficulty: difficulty || undefined,
      page: 0,
      size: 12
    });
  }

  function clearFilters() {
    setSearch("");
    setSubjectId("");
    setDifficulty("");
    setFilters({ page: 0, size: 12 });
  }

  async function saveQuestion(input: QuestionInput) {
    if (editingQuestion) {
      await updateQuestion(editingQuestion.id, input);
    } else {
      await createQuestion(input);
    }
    await loadQuestions();
  }

  async function createAndSelectSubject(name: string) {
    const subject = await createSubject({ name, description: "" });
    setSubjects((current) => [...current, subject].sort((first, second) => first.name.localeCompare(second.name, "pt-BR")));
    return subject;
  }

  async function removeQuestion(question: Question) {
    if (!(await confirm({
      confirmLabel: "Excluir questão",
      description: "Esta questão não poderá ser usada em novas provas. As provas e versões que já a utilizam serão preservadas.",
      title: "Excluir questão",
      variant: "danger"
    }))) {
      return;
    }
    try {
      await deleteQuestion(question.id);
      if (questionPage.items.length === 1 && questionPage.page.number > 0) {
        setFilters((current) => ({ ...current, page: questionPage.page.number - 1 }));
      } else {
        await loadQuestions();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível excluir a questão."));
    }
  }

  async function clearQuestionBank() {
    setIsClearing(true);
    setError("");
    try {
      const result = await clearQuestions();
      setNotice(
        result.archivedCount > 0
          ? `${result.deletedCount} ${questionLabel(result.deletedCount)} excluída${result.deletedCount === 1 ? "" : "s"}. ${result.archivedCount} ${questionLabel(result.archivedCount)} já usada${result.archivedCount === 1 ? "" : "s"} em prova foi arquivada para preservar o histórico.`
          : `${result.deletedCount} ${questionLabel(result.deletedCount)} excluída${result.deletedCount === 1 ? "" : "s"} do banco.`
      );
      setSearch("");
      setSubjectId("");
      setDifficulty("");
      setFilters({ page: 0, size: 12 });
      setIsClearModalOpen(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível limpar o banco de questões."));
    } finally {
      setIsClearing(false);
    }
  }

  function openNewQuestion() {
    setEditingQuestion(undefined);
    setIsQuestionModalOpen(true);
  }

  function openEditQuestion(question: Question) {
    setEditingQuestion(question);
    setIsQuestionModalOpen(true);
  }

  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));
  const contentNames = new Map(contents.map((content) => [content.id, content.title]));

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Banco de Questões</h1>
          <p className="mt-1 text-sm text-slate-500">Questões reutilizáveis para montar suas próximas avaliações.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="border-rose-300 text-rose-700 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-800"
            disabled={questionPage.page.totalElements === 0 || isClearing}
            icon={Trash2}
            onClick={() => setIsClearModalOpen(true)}
            type="button"
            variant="secondary"
          >
            Limpar banco
          </Button>
          <Button icon={Plus} onClick={openNewQuestion} type="button">
            Nova questão
          </Button>
        </div>
      </section>

      <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto_auto]" onSubmit={applyFilters}>
        <label className="relative block">
          <span className="sr-only">Pesquisar questões</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
          <input
            className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar pelo enunciado"
            type="search"
            value={search}
          />
        </label>
        <select
          aria-label="Filtrar por disciplina"
          className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          onChange={(event) => setSubjectId(event.target.value)}
          value={subjectId}
        >
          <option value="">Todas as disciplinas</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por dificuldade"
          className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty | "")}
          value={difficulty}
        >
          <option value="">Todas as dificuldades</option>
          {Object.entries(difficultyLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
        <Button aria-label="Limpar filtros" className="h-11 w-11 px-0" icon={X} onClick={clearFilters} title="Limpar filtros" type="button" variant="ghost" />
      </form>

      {error ? (
        <div aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {notice}
        </div>
      ) : null}

      <QuestionTable
        contentNames={contentNames}
        isLoading={isLoading}
        onEdit={openEditQuestion}
        onRemove={(question) => void removeQuestion(question)}
        questions={questionPage.items}
        subjectNames={subjectNames}
      />

      {questionPage.page.totalPages > 1 ? (
        <nav aria-label="Paginação de questões" className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {questionPage.page.totalElements} {questionPage.page.totalElements === 1 ? "questão" : "questões"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Página anterior"
              className="h-9 w-9 px-0"
              disabled={questionPage.page.number === 0}
              icon={ChevronLeft}
              onClick={() => setFilters((current) => ({ ...current, page: questionPage.page.number - 1 }))}
              title="Página anterior"
              variant="secondary"
            />
            <span className="min-w-20 text-center text-sm font-medium text-slate-700">
              {questionPage.page.number + 1} de {questionPage.page.totalPages}
            </span>
            <Button
              aria-label="Próxima página"
              className="h-9 w-9 px-0"
              disabled={questionPage.page.number + 1 >= questionPage.page.totalPages}
              icon={ChevronRight}
              onClick={() => setFilters((current) => ({ ...current, page: questionPage.page.number + 1 }))}
              title="Próxima página"
              variant="secondary"
            />
          </div>
        </nav>
      ) : null}

      {isQuestionModalOpen ? (
        <QuestionFormModal
          contents={contents}
          onClose={() => setIsQuestionModalOpen(false)}
          onCreateSubject={createAndSelectSubject}
          onSave={saveQuestion}
          question={editingQuestion}
          subjects={subjects}
        />
      ) : null}

      {isClearModalOpen ? (
        <ModalDialog onClose={() => { if (!isClearing) { setIsClearModalOpen(false); } }} title="Limpar banco de questões">
          <div className="px-5 py-5 sm:px-6">
            <p className="text-sm leading-6 text-slate-700">As questões que não foram usadas em provas serão excluídas definitivamente.</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Questões já presentes em provas serão removidas deste banco e arquivadas para preservar versões, gabaritos e resultados existentes.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={isClearing} onClick={() => setIsClearModalOpen(false)} variant="secondary">Cancelar</Button>
              <Button className="border-rose-300 text-rose-700 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-800" disabled={isClearing} icon={Trash2} onClick={() => void clearQuestionBank()} variant="secondary">
                {isClearing ? "Limpando..." : "Limpar banco"}
              </Button>
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </div>
  );
}

type QuestionTableProps = {
  contentNames: Map<string, string>;
  isLoading: boolean;
  onEdit: (question: Question) => void;
  onRemove: (question: Question) => void;
  questions: Question[];
  subjectNames: Map<string, string>;
};

function QuestionTable({ contentNames, isLoading, onEdit, onRemove, questions, subjectNames }: QuestionTableProps) {
  if (isLoading) {
    return <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando questões...</Card>;
  }

  if (questions.length === 0) {
    return (
      <Card className="px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
          <CircleHelp aria-hidden="true" size={22} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhuma questão encontrada</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Cadastre uma questão para reutilizá-la ao montar provas.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Enunciado</th>
              <th className="px-5 py-3">Disciplina</th>
              <th className="px-5 py-3">Dificuldade</th>
              <th className="px-5 py-3">Conteúdo</th>
              <th className="w-28 px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {questions.map((question) => (
              <tr className="text-sm text-slate-700" key={question.id}>
                <td className="max-w-md px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-semibold text-slate-900"><MathText text={question.statement} /></div>
                      <p className="mt-1 text-xs text-slate-500">{question.alternatives.length} alternativas</p>
                    </div>
                    {question.imageUrl ? <img alt="Imagem de apoio da questão" className="h-12 w-16 shrink-0 border border-stone-200 bg-stone-50 object-cover" loading="lazy" referrerPolicy="no-referrer" src={question.imageUrl} /> : null}
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{question.subjectId ? subjectNames.get(question.subjectId) ?? "Disciplina removida" : "Sem disciplina"}</td>
                <td className="px-5 py-4">
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">{difficultyLabels[question.difficulty]}</span>
                </td>
                <td className="max-w-48 truncate px-5 py-4 text-slate-600">{question.contentIds[0] ? contentNames.get(question.contentIds[0]) ?? "Conteúdo removido" : "Manual"}</td>
                <td className="px-5 py-4">
                  <QuestionActions onEdit={onEdit} onRemove={onRemove} question={question} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-stone-200 md:hidden">
        {questions.map((question) => (
          <article className="space-y-3 px-4 py-4" key={question.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="line-clamp-2 text-sm font-semibold text-slate-900"><MathText text={question.statement} /></div>
                {question.imageUrl ? <img alt="Imagem de apoio da questão" className="mt-2 h-20 w-full border border-stone-200 bg-stone-50 object-contain" loading="lazy" referrerPolicy="no-referrer" src={question.imageUrl} /> : null}
                <p className="mt-1 text-sm text-slate-500">{difficultyLabels[question.difficulty]}</p>
              </div>
              <QuestionActions onEdit={onEdit} onRemove={onRemove} question={question} />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-stone-100 px-2 py-1">{question.subjectId ? subjectNames.get(question.subjectId) ?? "Disciplina removida" : "Sem disciplina"}</span>
              <span className="rounded-md bg-teal-50 px-2 py-1 text-teal-800">{question.alternatives.length} alternativas</span>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

function QuestionActions({ onEdit, onRemove, question }: Pick<QuestionTableProps, "onEdit" | "onRemove"> & { question: Question }) {
  return (
    <div className="flex justify-end gap-1">
      <Button aria-label="Editar questão" className="h-9 w-9 px-0" icon={Pencil} onClick={() => onEdit(question)} title="Editar questão" variant="ghost" />
      <Button
        aria-label="Excluir questão"
        className="h-9 w-9 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
        icon={Trash2}
        onClick={() => onRemove(question)}
        title="Excluir questão"
        variant="ghost"
      />
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function questionLabel(count: number) {
  return count === 1 ? "questão" : "questões";
}
