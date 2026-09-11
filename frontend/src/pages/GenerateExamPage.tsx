import { BookOpen, CheckCircle2, Shuffle, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirmation } from "../components/ui/confirmationContext";
import { ExamCreationModeSwitch } from "../features/exams/ExamCreationModeSwitch";
import { createExam } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import { getQuestions } from "../services/questionService";
import { deleteSubject, getSubjects } from "../services/subjectService";
import type { Subject } from "../types/contents";
import { examKindLabels, type ExamKind } from "../types/exams";
import { difficultyLabels, type Question, type QuestionDifficulty } from "../types/questions";

type QuestionTypeFilter = "ALL" | "OBJECTIVE" | "DISCURSIVE";

export function GenerateExamPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [keyword, setKeyword] = useState("");
  const [examDate, setExamDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [totalScore, setTotalScore] = useState("10");
  const [totalQuestions, setTotalQuestions] = useState("5");
  const [kind, setKind] = useState<ExamKind>("PROVA");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("MIXED");
  const [questionType, setQuestionType] = useState<QuestionTypeFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([getSubjects(), getQuestions({ size: 100 })])
      .then(([nextSubjects, questionPage]) => {
        if (!ignore) {
          setSubjects(nextSubjects);
          setQuestions(questionPage.items);
        }
      })
      .catch((requestError: unknown) => {
        if (!ignore) setError(getErrorMessage(requestError, "Não foi possível carregar o Banco de Questões."));
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const eligibleQuestions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("pt-BR");
    return questions.filter((question) => {
      if (question.status !== "ACTIVE") return false;
      if (subjectId && question.subjectId !== subjectId) return false;
      if (difficulty !== "MIXED" && question.difficulty !== difficulty) return false;
      if (questionType === "DISCURSIVE" && question.questionType !== "DISCURSIVE") return false;
      if (questionType === "OBJECTIVE" && question.questionType === "DISCURSIVE") return false;
      return !normalizedKeyword || question.statement.toLocaleLowerCase("pt-BR").includes(normalizedKeyword);
    });
  }, [difficulty, keyword, questionType, questions, subjectId]);

  const requestedCount = Math.max(0, Number(totalQuestions) || 0);
  const objectiveCount = eligibleQuestions.filter((question) => question.questionType !== "DISCURSIVE").length;
  const discursiveCount = eligibleQuestions.length - objectiveCount;

  function changeKind(nextKind: ExamKind) {
    setKind(nextKind);
    if (nextKind === "SIMULADO") setTotalQuestions("21");
  }

  async function removeSelectedSubject() {
    const subject = subjects.find((item) => item.id === subjectId);
    if (!subject || !(await confirm({
      confirmLabel: "Excluir disciplina",
      description: `Excluir a disciplina “${subject.name}”? Provas e questões existentes serão preservadas como “Sem disciplina”.`,
      title: "Excluir disciplina",
      variant: "danger"
    }))) return;

    setError("");
    try {
      await deleteSubject(subject.id);
      setSubjects((current) => current.filter((item) => item.id !== subject.id));
      setSubjectId("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível excluir a disciplina."));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (requestedCount < 1) {
      setError("Informe pelo menos uma questão.");
      return;
    }
    if (kind === "SIMULADO" && requestedCount !== 21) {
      setError("O simulado precisa ter exatamente 21 questões.");
      return;
    }
    if (eligibleQuestions.length < requestedCount) {
      setError(`O banco possui ${formatQuestionCount(eligibleQuestions.length)} com esses filtros. Reduza a quantidade ou altere os filtros.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedQuestions = shuffle(eligibleQuestions).slice(0, requestedCount);
      const createdExam = await createExam({
        subjectId: subjectId || undefined,
        title,
        classGroup: classGroup.trim() || undefined,
        topic: keyword.trim() || undefined,
        instructions: instructions.trim() || undefined,
        examDate: examDate || undefined,
        totalScore: Number(totalScore),
        questionIds: selectedQuestions.map((question) => question.id),
        kind
      });
      navigate(`/provas/${createdExam.id}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível sortear e criar o rascunho."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Sortear do Banco</h1>
          <p className="mt-1 text-sm text-slate-500">Monte um rascunho sorteando questões que já foram revisadas e salvas.</p>
        </div>
        <Button disabled={isSubmitting || isLoading || eligibleQuestions.length < requestedCount} icon={Shuffle} type="submit">
          {isSubmitting ? "Sorteando..." : "Sortear e criar"}
        </Button>
      </section>

      <ExamCreationModeSwitch mode="generated" />

      {error ? <div aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}

      <fieldset className="border-y border-stone-200 py-5">
        <legend className="text-sm font-medium text-slate-700">Formato</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(["PROVA", "SIMULADO"] as ExamKind[]).map((option) => (
            <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium ${kind === option ? "border-teal-700 bg-teal-50 text-teal-900" : "border-stone-300 bg-white text-slate-700"}`} key={option}>
              <input checked={kind === option} className="h-4 w-4 border-stone-300 text-teal-700 focus:ring-teal-700" name="random-exam-kind" onChange={() => changeKind(option)} type="radio" />
              <span>{option === "SIMULADO" ? "Simulado (21 questões)" : examKindLabels[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="grid gap-5 lg:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700" htmlFor="random-exam-title">Título da prova
          <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="random-exam-title" maxLength={180} onChange={(event) => setTitle(event.target.value)} required value={title} />
        </label>
        <div className="block text-sm font-medium text-slate-700">
          <label htmlFor="random-exam-subject">Disciplina</label>
          <div className="mt-2 flex gap-2">
            <select className="h-11 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="random-exam-subject" onChange={(event) => setSubjectId(event.target.value)} value={subjectId}>
              <option value="">Todas as disciplinas</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
            <Button aria-label="Excluir disciplina selecionada" className="h-11 w-11 shrink-0 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800" disabled={!subjectId} icon={Trash2} onClick={() => void removeSelectedSubject()} title="Excluir disciplina selecionada" type="button" variant="secondary" />
          </div>
        </div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="random-exam-class-group">Turma
          <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="random-exam-class-group" maxLength={120} onChange={(event) => setClassGroup(event.target.value)} value={classGroup} />
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="random-exam-keyword">Palavra-chave
          <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="random-exam-keyword" maxLength={160} onChange={(event) => setKeyword(event.target.value)} placeholder="Opcional: verbo, crase..." value={keyword} />
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="random-exam-date">Data da prova
          <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="random-exam-date" onChange={(event) => setExamDate(event.target.value)} type="date" value={examDate} />
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="random-exam-total-score">Nota total
          <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="random-exam-total-score" min="0.01" onChange={(event) => setTotalScore(event.target.value)} required step="0.01" type="number" value={totalScore} />
        </label>
      </section>

      <section className="grid gap-5 border-y border-stone-200 py-5 md:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700" htmlFor="random-exam-difficulty">Dificuldade
          <select className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="random-exam-difficulty" onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty)} value={difficulty}>
            {Object.entries(difficultyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="random-exam-question-type">Tipo de questão
          <select className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="random-exam-question-type" onChange={(event) => setQuestionType(event.target.value as QuestionTypeFilter)} value={questionType}>
            <option value="ALL">Objetivas e abertas</option>
            <option value="OBJECTIVE">Somente objetivas</option>
            <option value="DISCURSIVE">Somente abertas</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="random-exam-question-count">Quantidade de questões
          <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100" disabled={kind === "SIMULADO"} id="random-exam-question-count" max="100" min="1" onChange={(event) => setTotalQuestions(event.target.value)} required type="number" value={totalQuestions} />
        </label>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <label className="block text-sm font-medium text-slate-700" htmlFor="random-exam-instructions">Instruções ao aluno
          <textarea className="mt-2 min-h-32 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-3 leading-6 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="random-exam-instructions" maxLength={10000} onChange={(event) => setInstructions(event.target.value)} placeholder="Opcional" value={instructions} />
        </label>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <BookOpen aria-hidden="true" className="text-teal-800" size={20} />
            <h2 className="font-semibold text-slate-950">Banco disponível</h2>
          </div>
          {isLoading ? <p className="mt-4 text-sm text-slate-500">Carregando questões...</p> : (
            <dl className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Questões encontradas" value={eligibleQuestions.length} />
              <SummaryRow label="Objetivas" value={objectiveCount} />
              <SummaryRow label="Abertas" value={discursiveCount} />
              <SummaryRow label="Serão sorteadas" value={requestedCount} />
            </dl>
          )}
          {!isLoading && eligibleQuestions.length >= requestedCount && requestedCount > 0 ? (
            <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-teal-800"><CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={17} />Há questões suficientes para realizar o sorteio.</p>
          ) : null}
          {!isLoading && eligibleQuestions.length === 0 ? <p className="mt-5 text-sm leading-6 text-amber-800">Nenhuma questão corresponde aos filtros. Ajuste-os ou cadastre novas questões no banco.</p> : null}
        </Card>
      </section>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-4 text-slate-600"><dt>{label}</dt><dd className="font-semibold text-slate-950">{value}</dd></div>;
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const selectedIndex = random[0] % (index + 1);
    [result[index], result[selectedIndex]] = [result[selectedIndex], result[index]];
  }
  return result;
}

function formatQuestionCount(count: number) {
  return `${count} ${count === 1 ? "questão" : "questões"}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}
