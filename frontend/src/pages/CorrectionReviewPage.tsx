import { ArrowLeft, CheckCircle2, FileWarning, ListChecks, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirmation } from "../components/ui/confirmationContext";
import { confirmCorrection, getCorrections, updateCorrection } from "../services/correctionService";
import { getExamVersions } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import type { Correction, CorrectionInput, StudentAnswerStatus } from "../types/corrections";
import type { ExamVersion } from "../types/exams";

type DraftAnswer = {
  selectedAlternativeId: string | null;
  status: Exclude<StudentAnswerStatus, "CONFIRMED">;
};

export function CorrectionReviewPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ answers: Record<string, DraftAnswer>; correctionId: string } | null>(null);
  const [query, setQuery] = useState("");
  const [versionFilter, setVersionFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getCorrections(), getExamVersions()])
      .then(([nextCorrections, nextVersions]) => {
        if (!active) {
          return;
        }
        setCorrections(nextCorrections);
        setVersions(nextVersions);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(getErrorMessage(requestError, "Não foi possível carregar as correções pendentes."));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const pendingCorrections = useMemo(
    () => corrections.filter((correction) => correction.status === "NEEDS_REVIEW"),
    [corrections]
  );
  const classes = useMemo(
    () => [...new Set(pendingCorrections.map((correction) => correction.classGroup || "Sem turma"))].sort((left, right) => left.localeCompare(right, "pt-BR")),
    [pendingCorrections]
  );
  const versionsWithPendingCorrections = useMemo(
    () => uniqueBy(pendingCorrections, (correction) => correction.examVersionId),
    [pendingCorrections]
  );
  const visibleCorrections = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return pendingCorrections.filter((correction) => (
      (versionFilter === "ALL" || correction.examVersionId === versionFilter)
      && (classFilter === "ALL" || (correction.classGroup || "Sem turma") === classFilter)
      && (!normalizedQuery || [correction.studentName, correction.studentIdentifier || "", correction.examTitle, correction.classGroup || ""]
        .some((value) => normalizeSearch(value).includes(normalizedQuery)))
    ));
  }, [classFilter, pendingCorrections, query, versionFilter]);
  const selectedCorrection = visibleCorrections.find((correction) => correction.id === selectedCorrectionId) ?? visibleCorrections[0] ?? null;
  const selectedVersion = versions.find((version) => version.id === selectedCorrection?.examVersionId) ?? null;
  const answers = useMemo(
    () => selectedCorrection && draft?.correctionId === selectedCorrection.id ? draft.answers : answersForCorrection(selectedCorrection),
    [draft, selectedCorrection]
  );
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedCorrection || !selectedVersion) {
      return false;
    }
    return selectedVersion.questions.some((question) => {
      const original = selectedCorrection.answers.find((answer) => answer.examVersionQuestionId === question.id);
      const draft = answers[question.id];
      return original?.selectedAlternativeId !== (draft?.selectedAlternativeId ?? null) || original?.status !== (draft?.status ?? "BLANK");
    });
  }, [answers, selectedCorrection, selectedVersion]);

  function updateAnswer(questionId: string, selectedAlternativeId: string | null, status: DraftAnswer["status"]) {
    if (!selectedCorrection) {
      return;
    }
    setDraft({ correctionId: selectedCorrection.id, answers: { ...answers, [questionId]: { selectedAlternativeId, status } } });
    setNotice("");
  }

  function selectCorrection(correctionId: string) {
    setSelectedCorrectionId(correctionId);
    setDraft(null);
    setNotice("");
  }

  function buildRequest(): CorrectionInput | null {
    if (!selectedCorrection || !selectedVersion) {
      setError("Não encontrei a versão da prova desta correção.");
      return null;
    }
    return {
      examVersionId: selectedVersion.id,
      studentId: selectedCorrection.studentId || undefined,
      studentName: selectedCorrection.studentName,
      studentIdentifier: selectedCorrection.studentIdentifier || undefined,
      classGroup: selectedCorrection.classGroup || undefined,
      answers: selectedVersion.questions.map((question) => ({
        examVersionQuestionId: question.id,
        selectedAlternativeId: answers[question.id]?.selectedAlternativeId ?? null,
        status: answers[question.id]?.status ?? "BLANK"
      }))
    };
  }

  async function saveChanges() {
    const request = buildRequest();
    if (!request || !selectedCorrection) {
      return;
    }
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateCorrection(selectedCorrection.id, request);
      setCorrections((current) => current.map((correction) => correction.id === updated.id ? updated : correction));
      setDraft(null);
      setNotice("A revisão foi atualizada. Confira a nota e confirme quando estiver certo.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível atualizar a correção."));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmSelectedCorrection() {
    if (!selectedCorrection || hasUnsavedChanges) {
      return;
    }
    if (!(await confirm({
      confirmLabel: "Confirmar correção",
      description: `Confirmar a correção de ${selectedCorrection.studentName}? A nota passará a aparecer nos resultados.`,
      title: "Confirmar correção"
    }))) {
      return;
    }
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const confirmed = await confirmCorrection(selectedCorrection.id);
      setCorrections((current) => current.map((correction) => correction.id === confirmed.id ? confirmed : correction));
      setSelectedCorrectionId(null);
      setDraft(null);
      setNotice(`A correção de ${confirmed.studentName} foi confirmada.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível confirmar a correção."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-800">Correção</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Revisões pendentes</h1>
          <p className="mt-1 text-sm text-slate-500">Confira as respostas lidas, ajuste as bolhas necessárias e confirme cada nota quando estiver pronta.</p>
        </div>
        <Button icon={ArrowLeft} onClick={() => navigate("/correcao")} variant="secondary">Nova correção</Button>
      </section>

      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}
      {notice ? <div aria-live="polite" className="border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900" role="status">{notice}</div> : null}

      {isLoading ? (
        <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando revisões pendentes...</Card>
      ) : pendingCorrections.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <CheckCircle2 aria-hidden="true" className="mx-auto text-emerald-700" size={26} />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhuma revisão pendente</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">As correções que precisarem de conferência aparecerão aqui antes de entrarem nos resultados.</p>
          <Button className="mt-5" onClick={() => navigate("/correcao")}>Corrigir um cartão</Button>
        </Card>
      ) : (
        <>
          <section className="grid gap-3 border-y border-stone-200 py-5 md:grid-cols-3">
            <label className="relative block">
              <span className="sr-only">Buscar revisão</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
              <input className="h-11 w-full border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setQuery(event.target.value)} placeholder="Aluno, matrícula ou prova" type="search" value={query} />
            </label>
            <select aria-label="Filtrar por prova e versão" className="h-11 border border-stone-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setVersionFilter(event.target.value)} value={versionFilter}>
              <option value="ALL">Todas as provas e versões</option>
              {versionsWithPendingCorrections.map((correction) => <option key={correction.examVersionId} value={correction.examVersionId}>{correction.examTitle} · Versão {correction.versionLabel}</option>)}
            </select>
            <select aria-label="Filtrar por turma" className="h-11 border border-stone-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setClassFilter(event.target.value)} value={classFilter}>
              <option value="ALL">Todas as turmas</option>
              {classes.map((classGroup) => <option key={classGroup} value={classGroup}>{classGroup}</option>)}
            </select>
          </section>

          {visibleCorrections.length === 0 ? (
            <section className="border border-dashed border-stone-300 px-6 py-12 text-center">
              <h2 className="text-lg font-semibold text-slate-950">Nenhuma revisão neste filtro</h2>
              <p className="mt-2 text-sm text-slate-500">Ajuste os filtros para consultar outra correção pendente.</p>
            </section>
          ) : (
            <section className="grid gap-7 xl:grid-cols-[20rem_minmax(0,1fr)]">
              <CorrectionQueue corrections={visibleCorrections} onSelect={selectCorrection} selectedCorrectionId={selectedCorrection?.id ?? null} />
              {selectedCorrection && selectedVersion ? (
                <ReviewEditor
                  answers={answers}
                  correction={selectedCorrection}
                  hasUnsavedChanges={hasUnsavedChanges}
                  isSaving={isSaving}
                  onConfirm={() => void confirmSelectedCorrection()}
                  onSave={() => void saveChanges()}
                  onUpdateAnswer={updateAnswer}
                  version={selectedVersion}
                />
              ) : (
                <section className="border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-950"><FileWarning aria-hidden="true" className="mb-3 text-amber-700" size={20} />A versão desta correção não está mais disponível para revisão.</section>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CorrectionQueue({ corrections, onSelect, selectedCorrectionId }: { corrections: Correction[]; onSelect: (correctionId: string) => void; selectedCorrectionId: string | null }) {
  return (
    <aside className="border border-stone-200 bg-white shadow-panel">
      <div className="border-b border-stone-200 px-4 py-4">
        <div className="flex items-center gap-2"><ListChecks aria-hidden="true" className="text-amber-700" size={18} /><h2 className="text-base font-semibold text-slate-950">Fila de revisão</h2></div>
        <p className="mt-1 text-sm text-slate-500">{corrections.length} correção{corrections.length === 1 ? "" : "ões"} aguardando confirmação.</p>
      </div>
      <ol className="max-h-[34rem] divide-y divide-stone-200 overflow-auto">
        {corrections.map((correction) => (
          <li key={correction.id}>
            <button className={correction.id === selectedCorrectionId ? "w-full border-l-4 border-teal-700 bg-teal-50 px-4 py-4 text-left" : "w-full border-l-4 border-transparent px-4 py-4 text-left hover:bg-stone-50"} onClick={() => onSelect(correction.id)} type="button">
              <span className="block truncate text-sm font-semibold text-slate-950">{correction.studentName}</span>
              <span className="mt-1 block truncate text-xs text-slate-500">{correction.examTitle} · {correction.classGroup || "Sem turma"}</span>
              <span className="mt-2 block text-sm font-semibold text-amber-800">{formatScore(correction.score)} / {formatScore(correction.totalScore)} · revisar</span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}

type ReviewEditorProps = {
  answers: Record<string, DraftAnswer>;
  correction: Correction;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onConfirm: () => void;
  onSave: () => void;
  onUpdateAnswer: (questionId: string, selectedAlternativeId: string | null, status: DraftAnswer["status"]) => void;
  version: ExamVersion;
};

function ReviewEditor({ answers, correction, hasUnsavedChanges, isSaving, onConfirm, onSave, onUpdateAnswer, version }: ReviewEditorProps) {
  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-800">Revisando correção</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{correction.studentName}</h2>
          <p className="mt-1 text-sm text-slate-500">{version.examTitle} · Versão {version.label} · {correction.classGroup || "Turma não informada"}</p>
        </div>
        <div className="border border-stone-200 bg-white px-4 py-3 shadow-panel">
          <p className="text-xs font-medium text-slate-500">Nota atual</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">{formatScore(correction.score)} / {formatScore(correction.totalScore)}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {version.questions.map((question) => {
          const answer = answers[question.id];
          const needsReview = answer?.status === "NEEDS_REVIEW" || answer?.status === "AMBIGUOUS";
          return (
            <article className={needsReview ? "border border-amber-300 bg-amber-50 p-4" : "border border-stone-200 bg-white p-4 shadow-panel"} key={question.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Questão {question.position}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">Marcação do aluno</p>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label={`Resposta da questão ${question.position}`}>
                  {question.alternatives.map((alternative) => {
                    const selected = answer?.status === "DETECTED" && answer.selectedAlternativeId === alternative.alternativeId;
                    return <button aria-pressed={selected} className={selected ? "h-10 min-w-10 border border-teal-700 bg-teal-700 px-3 text-sm font-bold text-white" : "h-10 min-w-10 border border-stone-300 bg-white px-3 text-sm font-bold text-slate-700 hover:border-slate-400"} key={alternative.alternativeId} onClick={() => onUpdateAnswer(question.id, alternative.alternativeId, "DETECTED")} title={`Alternativa ${letterFor(alternative.position)}`} type="button">{letterFor(alternative.position)}</button>;
                  })}
                  <button aria-pressed={answer?.status === "BLANK"} className={answer?.status === "BLANK" ? "h-10 border border-slate-700 bg-slate-700 px-3 text-sm font-semibold text-white" : "h-10 border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400"} onClick={() => onUpdateAnswer(question.id, null, "BLANK")} type="button">Em branco</button>
                  <button aria-pressed={needsReview} className={needsReview ? "h-10 border border-amber-600 bg-amber-500 px-3 text-sm font-semibold text-white" : "h-10 border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400"} onClick={() => onUpdateAnswer(question.id, null, "NEEDS_REVIEW")} type="button">Revisar</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-6 flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className={hasUnsavedChanges ? "text-sm font-medium text-amber-800" : "text-sm text-slate-500"}>{hasUnsavedChanges ? "Existem ajustes que precisam ser salvos antes da confirmação." : "A nota está revisada e pode ser confirmada."}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button disabled={!hasUnsavedChanges || isSaving} icon={Save} onClick={onSave} variant="secondary">{isSaving ? "Salvando..." : "Salvar ajustes"}</Button>
          <Button disabled={hasUnsavedChanges || isSaving} icon={CheckCircle2} onClick={onConfirm}>{isSaving ? "Confirmando..." : "Confirmar correção"}</Button>
        </div>
      </section>
    </section>
  );
}

function uniqueBy<T, Key>(items: T[], key: (item: T) => Key) {
  const unique = new Map<Key, T>();
  for (const item of items) {
    unique.set(key(item), item);
  }
  return [...unique.values()];
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function answersForCorrection(correction: Correction | null): Record<string, DraftAnswer> {
  if (!correction) {
    return {};
  }
  return Object.fromEntries(correction.answers.map((answer) => [answer.examVersionQuestionId, {
    selectedAlternativeId: answer.selectedAlternativeId,
    status: answer.status === "CONFIRMED" ? "DETECTED" : answer.status
  }]));
}

function formatScore(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

function letterFor(position: number) {
  return String.fromCharCode(64 + position);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}
