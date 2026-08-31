import { BarChart3, CheckCircle2, Download, Eye, FileText, FileWarning, GraduationCap, Search, School, UsersRound } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { CorrectionDetails } from "../features/results/CorrectionDetails";
import {
  allFilters,
  downloadCorrectionsCsv,
  filterCorrections,
  getClassPerformance,
  getQuestionPerformance,
  getStudentPerformance,
  summarizeCorrections,
  type CorrectionFilters
} from "../features/results/resultsMetrics";
import { getCorrections } from "../services/correctionService";
import { ApiRequestError } from "../services/httpClient";
import type { Correction } from "../types/corrections";

export function ResultsPage() {
  const navigate = useNavigate();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [filters, setFilters] = useState<CorrectionFilters>(allFilters);
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCorrections()
      .then((nextCorrections) => {
        if (active) {
          setCorrections(nextCorrections);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível carregar os resultados.");
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

  const versions = useMemo(() => uniqueBy(corrections, (correction) => correction.examVersionId), [corrections]);
  const classes = useMemo(
    () => [...new Set(corrections.map((correction) => correction.classGroup || "Sem turma"))].sort((left, right) => left.localeCompare(right, "pt-BR")),
    [corrections]
  );
  const visibleCorrections = useMemo(() => filterCorrections(corrections, filters), [corrections, filters]);
  const summary = useMemo(() => summarizeCorrections(visibleCorrections), [visibleCorrections]);
  const classPerformance = useMemo(() => getClassPerformance(visibleCorrections), [visibleCorrections]);
  const questionPerformance = useMemo(() => getQuestionPerformance(visibleCorrections, filters.versionId), [filters.versionId, visibleCorrections]);
  const selectedCorrection = visibleCorrections.find((correction) => correction.id === selectedCorrectionId) ?? visibleCorrections[0] ?? null;
  const studentPerformance = useMemo(() => getStudentPerformance(visibleCorrections), [visibleCorrections]);

  function updateFilter<Key extends keyof CorrectionFilters>(key: Key, value: CorrectionFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setSelectedCorrectionId(null);
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Resultados</h1>
          <p className="mt-1 text-sm text-slate-500">Acompanhe as correções, reveja cada aluno e encontre os pontos que precisam de reforço.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={FileText} onClick={() => navigate("/boletins")} variant="secondary">Boletins</Button>
          <Button disabled={visibleCorrections.length === 0} icon={Download} onClick={() => downloadCorrectionsCsv(visibleCorrections)} variant="secondary">
            Exportar CSV
          </Button>
        </div>
      </section>

      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}

      {isLoading ? (
        <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando resultados...</Card>
      ) : corrections.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <BarChart3 aria-hidden="true" className="mx-auto text-teal-800" size={26} />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhuma correção registrada</h2>
          <p className="mt-2 text-sm text-slate-500">Faça a revisão de um cartão-resposta para criar o primeiro resultado.</p>
        </Card>
      ) : (
        <>
          <section className="grid gap-3 border-y border-stone-200 py-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="block text-sm font-medium text-slate-700">
              Prova e versão
              <select className="mt-2 h-10 w-full border border-stone-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => updateFilter("versionId", event.target.value)} value={filters.versionId}>
                <option value="ALL">Todas as versões</option>
                {versions.map((correction) => <option key={correction.examVersionId} value={correction.examVersionId}>{correction.examTitle} · Versão {correction.versionLabel}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Turma
              <select className="mt-2 h-10 w-full border border-stone-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => updateFilter("classGroup", event.target.value)} value={filters.classGroup}>
                <option value="ALL">Todas as turmas</option>
                {classes.map((classGroup) => <option key={classGroup} value={classGroup}>{classGroup}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Situação
              <select className="mt-2 h-10 w-full border border-stone-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => updateFilter("status", event.target.value as CorrectionFilters["status"])} value={filters.status}>
                <option value="ALL">Todas</option>
                <option value="CONFIRMED">Confirmadas</option>
                <option value="NEEDS_REVIEW">Revisão necessária</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Aluno
              <span className="relative mt-2 block">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
                <input className="h-10 w-full border border-stone-300 bg-white pl-10 pr-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => updateFilter("studentQuery", event.target.value)} placeholder="Nome, matrícula ou turma" type="search" value={filters.studentQuery} />
              </span>
            </label>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={CheckCircle2} label="Correções confirmadas" value={String(summary.confirmedCount)} tone="emerald" />
            <Metric icon={FileWarning} label="Aguardando revisão" value={String(summary.pendingCount)} tone="amber" />
            <Metric icon={GraduationCap} label="Média das notas" value={summary.averageScore === null ? "-" : formatScore(summary.averageScore)} tone="teal" />
            <Metric icon={BarChart3} label="Aproveitamento médio" value={summary.averagePercentage === null ? "-" : `${formatPercent(summary.averagePercentage)}%`} tone="teal" />
          </section>

          <section className="grid gap-8 border-b border-stone-200 pb-7 lg:grid-cols-2">
            <PerformanceTable
              emptyMessage="Ainda não há correções confirmadas para calcular o desempenho das turmas."
              icon={School}
              primaryLabel="Turma"
              title="Desempenho por turma"
            >
              {classPerformance.map((item) => (
                <tr className="border-b border-stone-100 last:border-0" key={item.classGroup}>
                  <td className="px-4 py-3 font-medium text-slate-950">{item.classGroup}</td>
                  <td className="px-4 py-3 text-slate-700">{item.confirmedCount}</td>
                  <td className="px-4 py-3 font-semibold text-slate-950">{formatScore(item.averageScore)}</td>
                  <td className="px-4 py-3 font-semibold text-teal-800">{formatPercent(item.averagePercentage)}%</td>
                </tr>
              ))}
            </PerformanceTable>

            <PerformanceTable
              emptyMessage="Ainda não há correções confirmadas para acompanhar os alunos."
              icon={UsersRound}
              primaryLabel="Aluno"
              title="Acompanhamento por aluno"
            >
              {studentPerformance.map((item) => (
                <tr className="border-b border-stone-100 last:border-0" key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-950"><span className="block">{item.name}</span><span className="mt-1 block text-xs font-normal text-slate-500">{item.classGroup}{item.studentIdentifier ? ` · ${item.studentIdentifier}` : ""}</span></td>
                  <td className="px-4 py-3 text-slate-700">{item.confirmedCount}</td>
                  <td className="px-4 py-3 font-semibold text-slate-950">{formatScore(item.averageScore)}</td>
                  <td className="px-4 py-3 font-semibold text-teal-800">{formatPercent(item.averagePercentage)}%</td>
                </tr>
              ))}
            </PerformanceTable>
          </section>

          {filters.versionId !== "ALL" ? (
            <section className="border-y border-stone-200 py-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Desempenho por questão</h2>
                <p className="mt-1 text-sm text-slate-500">Calculado somente com as correções confirmadas desta versão.</p>
              </div>
              {questionPerformance.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">Ainda não há correções confirmadas para calcular o desempenho por questão.</p>
              ) : (
                <div className="mt-5 overflow-x-auto border border-stone-200 bg-white shadow-panel">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500">
                      <tr><th className="px-4 py-3 font-semibold">Questão</th><th className="px-4 py-3 font-semibold">Acertos</th><th className="px-4 py-3 font-semibold">Erros</th><th className="px-4 py-3 font-semibold">Revisar</th><th className="px-4 py-3 font-semibold">Aproveitamento</th></tr>
                    </thead>
                    <tbody>
                      {questionPerformance.map((question) => (
                        <tr className="border-b border-stone-100 last:border-0" key={question.position}>
                          <td className="px-4 py-3 font-semibold text-slate-950">{String(question.position).padStart(2, "0")}</td>
                          <td className="px-4 py-3 font-medium text-emerald-700">{question.correctCount}</td>
                          <td className="px-4 py-3 text-rose-700">{question.incorrectCount}</td>
                          <td className="px-4 py-3 text-amber-700">{question.reviewedCount}</td>
                          <td className="px-4 py-3 font-semibold text-slate-950">{question.successRate === null ? "-" : `${formatPercent(question.successRate)}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {visibleCorrections.length === 0 ? (
            <section className="border border-dashed border-stone-300 px-6 py-12 text-center">
              <h2 className="text-lg font-semibold text-slate-950">Nenhuma correção neste filtro</h2>
              <p className="mt-2 text-sm text-slate-500">Ajuste os filtros para consultar outro conjunto de resultados.</p>
            </section>
          ) : (
            <>
              <section className="overflow-x-auto border border-stone-200 bg-white shadow-panel">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-5 py-3 font-semibold">Aluno</th><th className="px-5 py-3 font-semibold">Prova</th><th className="px-5 py-3 font-semibold">Acertos</th><th className="px-5 py-3 font-semibold">Nota</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3"><span className="sr-only">Ver detalhes</span></th></tr>
                  </thead>
                  <tbody>
                    {visibleCorrections.map((correction) => (
                      <tr className={correction.id === selectedCorrection?.id ? "border-b border-teal-100 bg-teal-50/50 last:border-0" : "border-b border-stone-100 last:border-0"} key={correction.id}>
                        <td className="px-5 py-4 font-medium text-slate-950">{correction.studentName}<span className="mt-1 block text-xs font-normal text-slate-500">{correction.classGroup || "Turma não informada"}</span></td>
                        <td className="px-5 py-4 text-slate-700">{correction.examTitle}<span className="mt-1 block text-xs text-slate-500">Versão {correction.versionLabel}</span></td>
                        <td className="px-5 py-4 text-slate-700">{correction.correctCount}</td>
                        <td className="px-5 py-4 font-semibold text-slate-950">{formatScore(correction.score)} / {formatScore(correction.totalScore)}</td>
                        <td className="px-5 py-4"><span className={correction.status === "CONFIRMED" ? "inline-flex items-center gap-1 text-xs font-semibold text-emerald-700" : "inline-flex items-center gap-1 text-xs font-semibold text-amber-700"}>{correction.status === "CONFIRMED" ? "Confirmada" : "Revisão necessária"}</span></td>
                        <td className="px-5 py-4 text-right"><Button aria-label={`Ver correção de ${correction.studentName}`} className="h-9 w-9 px-0" icon={Eye} onClick={() => setSelectedCorrectionId(correction.id)} title="Ver detalhes" variant="ghost" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              {selectedCorrection ? <CorrectionDetails correction={selectedCorrection} /> : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, tone, value }: { icon: typeof BarChart3; label: string; tone: "amber" | "emerald" | "teal"; value: string }) {
  const toneClass = tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : "text-teal-800";
  return (
    <article className="border border-stone-200 bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-600">{label}</p><Icon aria-hidden="true" className={toneClass} size={19} /></div>
      <p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

type PerformanceTableProps = {
  children: ReactNode;
  emptyMessage: string;
  icon: typeof School;
  primaryLabel: string;
  title: string;
};

function PerformanceTable({ children, emptyMessage, icon: Icon, primaryLabel, title }: PerformanceTableProps) {
  const rows = Array.isArray(children) ? children : [children];
  return (
    <section>
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="text-teal-800" size={19} />
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">Médias calculadas apenas com correções confirmadas.</p>
      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="mt-5 max-h-96 overflow-auto border border-stone-200 bg-white shadow-panel">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3 font-semibold">{primaryLabel}</th><th className="px-4 py-3 font-semibold">Provas</th><th className="px-4 py-3 font-semibold">Média</th><th className="px-4 py-3 font-semibold">Aproveitamento</th></tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
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

function formatScore(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value);
}
