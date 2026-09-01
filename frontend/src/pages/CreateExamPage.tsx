import { ArrowRight, CheckSquare, Search, Save } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ExamCreationModeSwitch } from "../features/exams/ExamCreationModeSwitch";
import { getContents } from "../services/contentService";
import { createExam } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import { getQuestions } from "../services/questionService";
import { getSubjects } from "../services/subjectService";
import type { Content, Subject } from "../types/contents";
import { examKindLabels, type ExamKind } from "../types/exams";
import { difficultyLabels, type Question } from "../types/questions";

export function CreateExamPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [topic, setTopic] = useState("");
  const [examDate, setExamDate] = useState("");
  const [totalScore, setTotalScore] = useState("10");
  const [kind, setKind] = useState<ExamKind>("PROVA");
  const [instructions, setInstructions] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    Promise.all([getSubjects(), getContents({ size: 100 }), getQuestions({ size: 100 })])
      .then(([nextSubjects, contentPage, questionPage]) => {
        if (!ignore) {
          setSubjects(nextSubjects);
          setContents(contentPage.items);
          setQuestions(questionPage.items);
        }
      })
      .catch((requestError: unknown) => {
        if (!ignore) {
          setError(getErrorMessage(requestError, "Não foi possível carregar as questões disponíveis."));
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const visibleQuestions = useMemo(() => {
    const normalizedSearch = questionSearch.trim().toLocaleLowerCase("pt-BR");
    return questions.filter((question) => {
      const matchesSearch = !normalizedSearch || question.statement.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
      const matchesSubject = !subjectId || !question.subjectId || question.subjectId === subjectId;
      return matchesSearch && matchesSubject;
    });
  }, [questionSearch, questions, subjectId]);

  const selectedCount = selectedQuestionIds.length;
  const scorePerQuestion = selectedCount > 0 ? Number(totalScore || 0) / selectedCount : 0;
  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));
  const contentNames = new Map(contents.map((content) => [content.id, content.title]));

  function toggleQuestion(questionId: string) {
    setSelectedQuestionIds((current) =>
      current.includes(questionId) ? current.filter((selectedId) => selectedId !== questionId) : [...current, questionId]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (selectedQuestionIds.length === 0) {
      setError("Selecione pelo menos uma questão para criar a prova.");
      return;
    }
    if (kind === "SIMULADO" && selectedQuestionIds.length !== 21) {
      setError("O simulado precisa ter exatamente 21 questões.");
      return;
    }

    setIsSubmitting(true);
    try {
      const createdExam = await createExam({
        subjectId: subjectId || undefined,
        title,
        classGroup: classGroup || undefined,
        topic: topic || undefined,
        instructions: instructions || undefined,
        examDate: examDate || undefined,
        totalScore: Number(totalScore),
        questionIds: selectedQuestionIds,
        kind
      });
      setSuccess(`“${createdExam.title}” foi criada como rascunho.`);
      setTitle("");
      setClassGroup("");
      setTopic("");
      setExamDate("");
      setInstructions("");
      setSelectedQuestionIds([]);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível criar a prova."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Criar Prova</h1>
          <p className="mt-1 text-sm text-slate-500">Monte uma prova manual selecionando questões do seu banco.</p>
        </div>
        <Button disabled={isSubmitting || isLoading} icon={Save} type="submit">
          {isSubmitting ? "Criando..." : "Salvar rascunho"}
        </Button>
      </section>

      <ExamCreationModeSwitch mode="manual" />

      {error ? (
        <div aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900" role="status">
          <span>{success}</span>
          <Link className="font-semibold underline underline-offset-4" to="/provas">
            Ver provas
          </Link>
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium text-slate-700">Formato</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(["PROVA", "SIMULADO"] as ExamKind[]).map((option) => (
                  <label
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium ${kind === option ? "border-teal-700 bg-teal-50 text-teal-900" : "border-stone-300 bg-white text-slate-700"}`}
                    key={option}
                  >
                    <input
                      checked={kind === option}
                      className="h-4 w-4 border-stone-300 text-teal-700 focus:ring-teal-700"
                      name="exam-kind"
                      onChange={() => setKind(option)}
                      type="radio"
                    />
                    <span>{option === "SIMULADO" ? "Simulado (21 questões)" : examKindLabels[option]}</span>
                  </label>
                ))}
              </div>
              {kind === "SIMULADO" ? <p className="mt-2 text-xs leading-5 text-slate-500">Selecione exatamente 21 questões do banco para montar o simulado.</p> : null}
            </fieldset>
            <label className="block text-sm font-medium text-slate-700" htmlFor="exam-title">
              Título da prova
              <input
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="exam-title"
                maxLength={180}
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="exam-subject">
              Disciplina
              <select
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="exam-subject"
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
            <label className="block text-sm font-medium text-slate-700" htmlFor="exam-class-group">
              Turma
              <input
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="exam-class-group"
                maxLength={120}
                onChange={(event) => setClassGroup(event.target.value)}
                value={classGroup}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="exam-topic">
              Assunto
              <input
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="exam-topic"
                maxLength={160}
                onChange={(event) => setTopic(event.target.value)}
                value={topic}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="exam-date">
              Data da prova
              <input
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="exam-date"
                onChange={(event) => setExamDate(event.target.value)}
                type="date"
                value={examDate}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="exam-total-score">
              Nota total
              <input
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="exam-total-score"
                min="0.01"
                onChange={(event) => setTotalScore(event.target.value)}
                required
                step="0.01"
                type="number"
                value={totalScore}
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700" htmlFor="exam-instructions">
            Instruções ao aluno
            <textarea
              className="mt-2 min-h-28 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-3 leading-6 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              id="exam-instructions"
              maxLength={10000}
              onChange={(event) => setInstructions(event.target.value)}
              value={instructions}
            />
          </label>
        </div>

        <aside className="border-l-0 border-stone-200 xl:border-l xl:pl-5">
          <p className="text-sm font-semibold text-slate-950">Resumo</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <dt>Questões selecionadas</dt>
              <dd className="font-semibold text-slate-950">{selectedCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <dt>Formato</dt>
              <dd className="font-semibold text-slate-950">{examKindLabels[kind]}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <dt>Nota total</dt>
              <dd className="font-semibold text-slate-950">{formatScore(Number(totalScore || 0))}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <dt>Nota por questão</dt>
              <dd className="font-semibold text-slate-950">{selectedCount ? formatScore(scorePerQuestion) : "-"}</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm leading-6 text-slate-500">{kind === "SIMULADO" ? "O simulado será criado com 21 questões em rascunho." : "A prova será criada como rascunho."} Você poderá revisar antes de gerar versões oficiais.</p>
        </aside>
      </section>

      <section className="border-t border-stone-200 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Selecionar questões</h2>
            <p className="mt-1 text-sm text-slate-500">Escolha as questões que farão parte desta prova.</p>
          </div>
          <label className="relative block w-full sm:w-80">
            <span className="sr-only">Buscar questões</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
            <input
              className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setQuestionSearch(event.target.value)}
              placeholder="Buscar questão"
              type="search"
              value={questionSearch}
            />
          </label>
        </div>

        {isLoading ? (
          <Card className="mt-5 px-5 py-12 text-center text-sm text-slate-500">Carregando questões...</Card>
        ) : visibleQuestions.length === 0 ? (
          <Card className="mt-5 px-6 py-12 text-center">
            <CheckSquare aria-hidden="true" className="mx-auto text-teal-800" size={24} />
            <h3 className="mt-4 text-base font-semibold text-slate-950">Nenhuma questão disponível</h3>
            <p className="mt-2 text-sm text-slate-500">Cadastre questões no Banco de Questões antes de montar uma prova.</p>
          </Card>
        ) : (
          <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
            {visibleQuestions.map((question) => {
              const isSelected = selectedQuestionIds.includes(question.id);
              return (
                <label className="flex cursor-pointer items-start gap-3 px-1 py-4" key={question.id}>
                  <input
                    checked={isSelected}
                    className="mt-1 h-4 w-4 rounded border-stone-300 text-teal-700 focus:ring-teal-700"
                    onChange={() => toggleQuestion(question.id)}
                    type="checkbox"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{question.statement}</span>
                    <span className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span>{question.subjectId ? subjectNames.get(question.subjectId) ?? "Disciplina removida" : "Sem disciplina"}</span>
                      <span>{difficultyLabels[question.difficulty]}</span>
                      {question.contentIds[0] ? <span>{contentNames.get(question.contentIds[0]) ?? "Conteúdo removido"}</span> : null}
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className={isSelected ? "text-teal-800" : "text-stone-300"} size={18} />
                </label>
              );
            })}
          </div>
        )}
      </section>
    </form>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function formatScore(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} pontos`;
}
