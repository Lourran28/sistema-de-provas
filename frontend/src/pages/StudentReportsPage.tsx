import { ArrowLeft, BarChart3, FileText, Printer, School, Trophy, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { getStudentReports, type StudentReport } from "../features/results/resultsMetrics";
import { getCorrections } from "../services/correctionService";
import { ApiRequestError } from "../services/httpClient";
import type { Correction } from "../types/corrections";

export function StudentReportsPage() {
  const navigate = useNavigate();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [classFilter, setClassFilter] = useState("ALL");
  const [selectedStudentId, setSelectedStudentId] = useState("");
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
          setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível carregar os boletins.");
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

  useEffect(() => {
    document.body.dataset.printMode = "student-report";
    return () => {
      delete document.body.dataset.printMode;
    };
  }, []);

  const reports = useMemo(() => getStudentReports(corrections), [corrections]);
  const classGroups = useMemo(
    () => [...new Set(reports.map((report) => report.classGroup))].sort((left, right) => left.localeCompare(right, "pt-BR")),
    [reports]
  );
  const visibleReports = useMemo(
    () => reports.filter((report) => classFilter === "ALL" || report.classGroup === classFilter),
    [classFilter, reports]
  );
  const selectedReport = visibleReports.find((report) => report.id === selectedStudentId) ?? visibleReports[0] ?? null;

  return (
    <div className="student-report-page space-y-7">
      <section className="student-report-toolbar flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Boletins</h1>
          <p className="mt-1 text-sm text-slate-500">Consulte o histórico individual de cada aluno e imprima o acompanhamento pedagógico.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={ArrowLeft} onClick={() => navigate("/resultados")} variant="secondary">Resultados</Button>
          <Button disabled={!selectedReport} icon={Printer} onClick={() => window.print()}>Imprimir boletim</Button>
        </div>
      </section>

      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}

      {isLoading ? (
        <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando boletins...</Card>
      ) : reports.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <FileText aria-hidden="true" className="mx-auto text-teal-800" size={26} />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">Ainda não há boletins</h2>
          <p className="mt-2 text-sm text-slate-500">Confirme uma correção para criar o primeiro histórico individual.</p>
          <Button className="mt-5" onClick={() => navigate("/correcao")}>Corrigir cartão</Button>
        </Card>
      ) : (
        <>
          <section className="student-report-toolbar grid gap-3 border-b border-stone-200 pb-6 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Turma
              <select className="mt-2 h-10 w-full border border-stone-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => { setClassFilter(event.target.value); setSelectedStudentId(""); }} value={classFilter}>
                <option value="ALL">Todas as turmas</option>
                {classGroups.map((classGroup) => <option key={classGroup} value={classGroup}>{classGroup}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Aluno
              <select className="mt-2 h-10 w-full border border-stone-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setSelectedStudentId(event.target.value)} value={selectedReport?.id ?? ""}>
                {visibleReports.map((report) => <option key={report.id} value={report.id}>{report.name}{report.studentIdentifier ? ` · ${report.studentIdentifier}` : ""}</option>)}
              </select>
            </label>
          </section>

          {selectedReport ? <StudentReportDocument report={selectedReport} /> : (
            <section className="border border-dashed border-stone-300 px-6 py-12 text-center">
              <h2 className="text-lg font-semibold text-slate-950">Nenhum aluno nesta turma</h2>
              <p className="mt-2 text-sm text-slate-500">Escolha outra turma para consultar um boletim.</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StudentReportDocument({ report }: { report: StudentReport }) {
  const totalCorrect = report.corrections.reduce((total, correction) => total + correction.correctCount, 0);
  const bestPercentage = Math.max(...report.corrections.map(percentageForCorrection));

  return (
    <article className="student-report-document border border-stone-200 bg-white p-5 shadow-panel sm:p-7">
      <header className="flex flex-col gap-5 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white"><FileText aria-hidden="true" size={21} /></span>
          <div>
            <p className="text-sm font-semibold text-teal-800">Sistema de Provas</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Boletim individual</h2>
            <p className="mt-1 text-sm text-slate-500">Histórico de avaliações confirmadas</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">Emitido em {formatDate(new Date().toISOString())}</p>
      </header>

      <section className="grid gap-4 border-b border-stone-200 py-6 sm:grid-cols-3">
        <ReportIdentity icon={UserRound} label="Aluno" value={report.name} detail={report.studentIdentifier ? `Matrícula: ${report.studentIdentifier}` : "Matrícula não informada"} />
        <ReportIdentity icon={School} label="Turma" value={report.classGroup} detail={`${report.confirmedCount} avaliação${report.confirmedCount === 1 ? "" : "ões"} confirmada${report.confirmedCount === 1 ? "" : "s"}`} />
        <ReportIdentity icon={BarChart3} label="Aproveitamento médio" value={`${formatPercent(report.averagePercentage)}%`} detail={`Média das notas: ${formatScore(report.averageScore)}`} />
      </section>

      <section className="grid gap-3 py-6 sm:grid-cols-3">
        <ReportMetric icon={FileText} label="Avaliações" value={String(report.confirmedCount)} />
        <ReportMetric icon={Trophy} label="Melhor resultado" value={`${formatPercent(bestPercentage)}%`} />
        <ReportMetric icon={BarChart3} label="Acertos acumulados" value={String(totalCorrect)} />
      </section>

      <section>
        <h3 className="text-base font-semibold text-slate-950">Histórico de provas</h3>
        <div className="mt-4 overflow-x-auto border border-stone-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3 font-semibold">Data</th><th className="px-4 py-3 font-semibold">Prova</th><th className="px-4 py-3 font-semibold">Versão</th><th className="px-4 py-3 font-semibold">Acertos</th><th className="px-4 py-3 font-semibold">Nota</th><th className="px-4 py-3 font-semibold">Aproveitamento</th></tr>
            </thead>
            <tbody>
              {report.corrections.map((correction) => (
                <tr className="border-b border-stone-100 last:border-0" key={correction.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(correction.reviewedAt || correction.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-slate-950">{correction.examTitle}</td>
                  <td className="px-4 py-3 text-slate-700">{correction.versionLabel}</td>
                  <td className="px-4 py-3 text-slate-700">{correction.correctCount}</td>
                  <td className="px-4 py-3 font-semibold text-slate-950">{formatScore(correction.score)} / {formatScore(correction.totalScore)}</td>
                  <td className="px-4 py-3 font-semibold text-teal-800">{formatPercent(percentageForCorrection(correction))}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}

function ReportIdentity({ detail, icon: Icon, label, value }: { detail: string; icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-teal-800" size={19} />
      <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-base font-semibold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>
    </div>
  );
}

function ReportMetric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="border border-stone-200 px-4 py-3">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-600">{label}</p><Icon aria-hidden="true" className="text-teal-800" size={18} /></div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function percentageForCorrection(correction: Correction) {
  return correction.totalScore ? correction.score / correction.totalScore * 100 : 0;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

function formatScore(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}
