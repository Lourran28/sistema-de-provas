import { KeyRound, Printer, Shuffle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { useConfirmation } from "../../components/ui/confirmationContext";
import { ApiRequestError } from "../../services/httpClient";
import { generateExamVersions, getExamVersions } from "../../services/examService";
import type { Exam, ExamVersion } from "../../types/exams";

type ExamVersionsPanelProps = {
  exam: Exam;
  onVersionsGenerated: () => void;
};

export function ExamVersionsPanel({ exam, onVersionsGenerated }: ExamVersionsPanelProps) {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextVersions = await getExamVersions(exam.id);
      setVersions(nextVersions);
      setSelectedVersionId((currentVersionId) => currentVersionId || nextVersions[0]?.id || "");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível carregar as versões da prova."));
    } finally {
      setIsLoading(false);
    }
  }, [exam.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVersions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadVersions]);

  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId) ?? versions[0],
    [selectedVersionId, versions]
  );
  const answerKeyByPosition = useMemo(
    () => new Map(selectedVersion?.answerKey.map((item) => [item.questionPosition, item]) ?? []),
    [selectedVersion]
  );

  async function handleGenerate() {
    if (!(await confirm({
      confirmLabel: "Gerar versões",
      description: "As versões oficiais A, B e C terão a ordem das questões e alternativas salva permanentemente.",
      title: "Gerar versões oficiais"
    }))) {
      return;
    }
    setIsGenerating(true);
    setError("");
    try {
      const nextVersions = await generateExamVersions(exam.id);
      setVersions(nextVersions);
      setSelectedVersionId(nextVersions[0]?.id ?? "");
      onVersionsGenerated();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível gerar as versões oficiais."));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="border-y border-stone-200 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Versões oficiais</h2>
          <p className="mt-1 text-sm text-slate-500">As versões preservam a ordem das questões, alternativas e gabaritos.</p>
        </div>
        {exam.status === "READY" && versions.length === 0 ? (
          <Button disabled={isGenerating || isLoading} icon={Shuffle} onClick={() => void handleGenerate()}>
            {isGenerating ? "Gerando versões..." : "Gerar A, B e C"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <div aria-live="polite" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading ? <p className="mt-5 text-sm text-slate-500">Carregando versões...</p> : null}

      {!isLoading && versions.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">Ainda não há versões oficiais para esta prova.</p>
      ) : null}

      {selectedVersion ? (
        <div className="mt-5">
          <div aria-label="Versões da prova" className="flex flex-wrap gap-2" role="tablist">
            {versions.map((version) => (
              <button
                aria-selected={selectedVersion.id === version.id}
                className={
                  selectedVersion.id === version.id
                    ? "h-10 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
                    : "h-10 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-slate-400"
                }
                key={version.id}
                onClick={() => setSelectedVersionId(version.id)}
                role="tab"
                type="button"
              >
                Versão {version.label}
              </button>
            ))}
          </div>

          <article className="mt-4 border border-stone-200 bg-white p-5 shadow-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Versão {selectedVersion.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedVersion.questions.length} questões · {formatScore(exam.totalScore)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button icon={Printer} onClick={() => navigate(`/imprimir/versoes/${selectedVersion.id}`)} variant="secondary">
                  Imprimir
                </Button>
              </div>
            </div>

            <section className="mt-5 border-y border-stone-200 py-4">
              <div className="flex items-center gap-2">
                <KeyRound aria-hidden="true" className="text-teal-800" size={17} />
                <h4 className="text-sm font-semibold text-slate-900">Gabarito</h4>
              </div>
              <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {selectedVersion.answerKey.map((item) => (
                  <li className="border border-stone-200 px-2 py-2 text-center text-sm text-slate-700" key={item.questionPosition}>
                    <span className="text-slate-500">{item.questionPosition}</span> <strong className="text-slate-950">{item.correctLetter}</strong>
                  </li>
                ))}
              </ol>
            </section>

            <ol className="mt-5 space-y-5">
              {selectedVersion.questions.map((question) => {
                const answer = answerKeyByPosition.get(question.position);
                return (
                  <li className="border-b border-stone-100 pb-5 last:border-b-0 last:pb-0" key={question.id}>
                    <p className="text-xs font-semibold uppercase text-slate-500">Questão {question.position} · {formatScore(question.points)}</p>
                    <h4 className="mt-2 text-sm font-semibold leading-6 text-slate-950">{question.statement}</h4>
                    <ol className="mt-3 space-y-2 text-sm text-slate-700" type="A">
                      {question.alternatives.map((alternative) => (
                        <li className="flex items-start gap-2 pl-1" key={alternative.alternativeId}>
                          <span>{alternative.text}</span>
                          {answer?.correctAlternativeId === alternative.alternativeId ? (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800">Correta</span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ol>
          </article>
        </div>
      ) : null}
    </section>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function formatScore(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} pontos`;
}
