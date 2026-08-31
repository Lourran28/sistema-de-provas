import { CheckSquare, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { getContents } from "../services/contentService";
import { generateExam } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import { getSubjects } from "../services/subjectService";
import type { Content, Subject } from "../types/contents";
import { difficultyLabels, type QuestionDifficulty } from "../types/questions";
import type { QuestionDistributionMode } from "../types/exams";

export function GenerateExamPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [topic, setTopic] = useState("");
  const [totalScore, setTotalScore] = useState("10");
  const [totalQuestions, setTotalQuestions] = useState("5");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("MEDIUM");
  const [distributionMode, setDistributionMode] = useState<QuestionDistributionMode>("AUTO");
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  const [manualCounts, setManualCounts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([getSubjects(), getContents({ size: 100 })])
      .then(([nextSubjects, contentPage]) => {
        if (!ignore) {
          setSubjects(nextSubjects);
          setContents(contentPage.items);
        }
      })
      .catch((requestError: unknown) => {
        if (!ignore) {
          setError(getErrorMessage(requestError, "Não foi possível carregar seus conteúdos."));
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

  const selectedContents = useMemo(
    () => selectedContentIds.map((contentId) => contents.find((content) => content.id === contentId)).filter((content): content is Content => Boolean(content)),
    [contents, selectedContentIds]
  );
  const questionCount = Math.max(0, Number(totalQuestions) || 0);
  const automaticCounts = useMemo(() => calculateAutoDistribution(questionCount, selectedContents.length), [questionCount, selectedContents.length]);
  const manualTotal = selectedContents.reduce((total, content) => total + (Number(manualCounts[content.id]) || 0), 0);
  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));

  function toggleContent(content: Content) {
    const isAlreadySelected = selectedContentIds.includes(content.id);
    setSelectedContentIds((current) => {
      if (isAlreadySelected) {
        return current.filter((contentId) => contentId !== content.id);
      }
      return [...current, content.id];
    });
    if (!isAlreadySelected && content.subjectId) {
      setSubjectId((currentSubjectId) => currentSubjectId || content.subjectId || "");
    }
    if (!isAlreadySelected) {
      setManualCounts((currentCounts) => ({ ...currentCounts, [content.id]: currentCounts[content.id] ?? "1" }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (selectedContents.length === 0) {
      setError("Selecione pelo menos um conteúdo para gerar a prova.");
      return;
    }
    if (questionCount < selectedContents.length) {
      setError("A quantidade de questões deve ser igual ou maior que a quantidade de conteúdos selecionados.");
      return;
    }
    if (distributionMode === "MANUAL" && manualTotal !== questionCount) {
      setError("A soma das questões por conteúdo precisa ser igual ao total de questões.");
      return;
    }

    setIsSubmitting(true);
    try {
      const createdExam = await generateExam({
        subjectId: subjectId || undefined,
        title,
        classGroup: classGroup || undefined,
        topic: topic || undefined,
        totalScore: Number(totalScore),
        totalQuestions: questionCount,
        difficulty,
        distributionMode,
        contents: selectedContents.map((content, index) => ({
          contentId: content.id,
          questionCount: distributionMode === "AUTO" ? automaticCounts[index] : Number(manualCounts[content.id])
        }))
      });
      navigate(`/provas/${createdExam.id}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível gerar o rascunho da prova."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Gerar Prova</h1>
          <p className="mt-1 text-sm text-slate-500">Crie um rascunho usando somente os conteúdos que você selecionar.</p>
        </div>
        <Button disabled={isSubmitting || isLoading} icon={Sparkles} type="submit">
          {isSubmitting ? "Gerando..." : "Gerar rascunho"}
        </Button>
      </section>

      {error ? (
        <div aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700" htmlFor="generated-exam-title">
          Título da prova
          <input
            className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="generated-exam-title"
            maxLength={180}
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="generated-exam-subject">
          Disciplina
          <select
            className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="generated-exam-subject"
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
        <label className="block text-sm font-medium text-slate-700" htmlFor="generated-exam-class-group">
          Turma
          <input
            className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="generated-exam-class-group"
            maxLength={120}
            onChange={(event) => setClassGroup(event.target.value)}
            value={classGroup}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="generated-exam-topic">
          Assunto
          <input
            className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="generated-exam-topic"
            maxLength={160}
            onChange={(event) => setTopic(event.target.value)}
            value={topic}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="generated-exam-total-score">
          Nota total
          <input
            className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="generated-exam-total-score"
            min="0.01"
            onChange={(event) => setTotalScore(event.target.value)}
            required
            step="0.01"
            type="number"
            value={totalScore}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="generated-exam-question-count">
          Quantidade de questões
          <input
            className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="generated-exam-question-count"
            min="1"
            max="100"
            onChange={(event) => setTotalQuestions(event.target.value)}
            required
            type="number"
            value={totalQuestions}
          />
        </label>
      </section>

      <section className="flex flex-col gap-4 border-y border-stone-200 py-5 sm:flex-row sm:items-end sm:justify-between">
        <label className="block w-full text-sm font-medium text-slate-700 sm:max-w-56" htmlFor="generated-exam-difficulty">
          Dificuldade
          <select
            className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="generated-exam-difficulty"
            onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty)}
            value={difficulty}
          >
            {Object.entries(difficultyLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-wrap gap-3">
          <legend className="mb-2 text-sm font-medium text-slate-700">Distribuição das questões</legend>
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-slate-700">
            <input checked={distributionMode === "AUTO"} name="distribution-mode" onChange={() => setDistributionMode("AUTO")} type="radio" />
            Automática
          </label>
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-slate-700">
            <input checked={distributionMode === "MANUAL"} name="distribution-mode" onChange={() => setDistributionMode("MANUAL")} type="radio" />
            Manual
          </label>
        </fieldset>
      </section>

      <section>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Selecionar conteúdos</h2>
          <p className="mt-1 text-sm text-slate-500">Somente os materiais marcados abaixo serão usados para formular as questões.</p>
        </div>

        {isLoading ? (
          <Card className="mt-5 px-5 py-12 text-center text-sm text-slate-500">Carregando conteúdos...</Card>
        ) : contents.length === 0 ? (
          <Card className="mt-5 px-6 py-12 text-center">
            <CheckSquare aria-hidden="true" className="mx-auto text-teal-800" size={24} />
            <h3 className="mt-4 text-base font-semibold text-slate-950">Nenhum conteúdo cadastrado</h3>
            <p className="mt-2 text-sm text-slate-500">Cadastre conteúdos antes de gerar uma prova.</p>
          </Card>
        ) : (
          <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
            {contents.map((content) => {
              const selectedIndex = selectedContentIds.indexOf(content.id);
              const isSelected = selectedIndex >= 0;
              const automaticCount = selectedIndex >= 0 ? automaticCounts[selectedIndex] : 0;
              return (
                <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between" key={content.id}>
                  <label className="flex min-w-0 cursor-pointer items-start gap-3">
                    <input
                      checked={isSelected}
                      className="mt-1 h-4 w-4 rounded border-stone-300 text-teal-700 focus:ring-teal-700"
                      onChange={() => toggleContent(content)}
                      type="checkbox"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{content.title}</span>
                      <span className="mt-1 block text-sm text-slate-500">{content.subjectId ? subjectNames.get(content.subjectId) ?? "Disciplina removida" : "Sem disciplina"} · {content.topic}</span>
                    </span>
                  </label>
                  {isSelected ? (
                    distributionMode === "MANUAL" ? (
                      <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600" htmlFor={`content-count-${content.id}`}>
                        Questões
                        <input
                          className="h-10 w-20 rounded-lg border border-stone-300 px-2 text-center text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                          id={`content-count-${content.id}`}
                          min="1"
                          onChange={(event) => setManualCounts((current) => ({ ...current, [content.id]: event.target.value }))}
                          type="number"
                          value={manualCounts[content.id] ?? "1"}
                        />
                      </label>
                    ) : (
                      <span className="shrink-0 rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">{formatQuestionCount(automaticCount)}</span>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {selectedContents.length > 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            {distributionMode === "AUTO"
              ? `${selectedContents.length} ${selectedContents.length === 1 ? "conteúdo selecionado" : "conteúdos selecionados"}. A distribuição será feita automaticamente.`
              : `Distribuição manual: ${manualTotal} de ${formatQuestionCount(questionCount)} atribuídas.`}
          </p>
        ) : null}
      </section>
    </form>
  );
}

function calculateAutoDistribution(totalQuestions: number, contentCount: number) {
  if (contentCount === 0) {
    return [];
  }
  const base = Math.floor(totalQuestions / contentCount);
  const remainder = totalQuestions % contentCount;
  return Array.from({ length: contentCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function formatQuestionCount(count: number) {
  return `${count} ${count === 1 ? "questão" : "questões"}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}
