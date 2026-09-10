import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, CheckCircle2, Printer, School, Target, Trash2, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirmation } from "../components/ui/confirmationContext";
import { getClassPerformance, type ClassPerformance } from "../features/results/resultsMetrics";
import { deleteClassData, getCorrections } from "../services/correctionService";
import { ApiRequestError } from "../services/httpClient";
import type { Correction } from "../types/corrections";

export function StudentReportsPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCorrections().then((data) => { if (active) setCorrections(data); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível carregar a visão das turmas."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.body.dataset.printMode = "student-report";
    return () => { delete document.body.dataset.printMode; };
  }, []);

  const reports = useMemo(() => getClassPerformance(corrections), [corrections]);
  const report = reports.find((item) => item.classGroup === selectedClass) ?? reports[0] ?? null;
  const best = reports[0] ?? null;
  const needsAttention = [...reports].filter((item) => item.confirmedCount > 0).sort((a, b) => a.averagePercentage - b.averagePercentage)[0] ?? null;

  async function removeSelectedClass() {
    if (!report || !(await confirm({ confirmLabel: "Excluir dados da turma", description: `Excluir aplicações e correções da turma ${report.classGroup}? Provas e questões serão preservadas.`, title: "Excluir turma", variant: "danger" }))) return;
    setError("");
    try {
      await deleteClassData(report.classGroup);
      setCorrections((current) => current.filter((item) => normalizeClass(item.classGroup) !== normalizeClass(report.classGroup)));
      setSelectedClass("");
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível excluir os dados da turma.");
    }
  }

  return <div className="student-report-page space-y-7">
    <section className="student-report-toolbar flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold text-slate-950">Visão geral das turmas</h1><p className="mt-1 text-sm text-slate-500">Veja quais turmas avançaram e onde o trabalho pedagógico precisa de mais atenção.</p></div>
      <div className="flex flex-wrap gap-2"><Button icon={ArrowLeft} onClick={() => navigate("/resultados")} variant="secondary">Desempenho</Button><Button disabled={!report} icon={Printer} onClick={() => window.print()}>Imprimir visão</Button></div>
    </section>
    {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}
    {isLoading ? <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando visão das turmas...</Card> : reports.length === 0 ? <Card className="px-6 py-12 text-center"><School aria-hidden="true" className="mx-auto text-teal-800" size={26} /><h2 className="mt-4 text-lg font-semibold text-slate-950">Ainda não há desempenho de turmas</h2><p className="mt-2 text-sm text-slate-500">Confirme uma correção para criar a primeira análise.</p><Button className="mt-5" onClick={() => navigate("/correcao")}>Corrigir cartão</Button></Card> : <>
      <section className="student-report-toolbar grid gap-3 sm:grid-cols-3">
        <OverviewMetric icon={School} label="Turmas avaliadas" value={String(reports.length)} />
        <OverviewMetric icon={TrendingUp} label="Melhor desempenho" value={best ? `${best.classGroup} · ${formatPercent(best.averagePercentage)}%` : "-"} />
        <OverviewMetric icon={Target} label="Precisa de atenção" value={needsAttention ? `${needsAttention.classGroup} · ${formatPercent(needsAttention.averagePercentage)}%` : "-"} />
      </section>
      <section className="student-report-toolbar flex flex-col gap-3 border-y border-stone-200 py-5 sm:flex-row sm:items-end sm:justify-between"><label className="block w-full max-w-md text-sm font-medium text-slate-700">Turma<select className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setSelectedClass(event.target.value)} value={report?.classGroup ?? ""}>{reports.map((item) => <option key={item.classGroup} value={item.classGroup}>{item.classGroup}</option>)}</select></label><Button icon={Trash2} onClick={() => void removeSelectedClass()} variant="danger">Excluir turma</Button></section>
      {report ? <ClassReportDocument report={report} rank={reports.findIndex((item) => item.classGroup === report.classGroup) + 1} totalClasses={reports.length} /> : null}
    </>}
  </div>;
}

function ClassReportDocument({ rank, report, totalClasses }: { rank: number; report: ClassPerformance; totalClasses: number }) {
  const TrendIcon = report.trend === "UP" ? ArrowUpRight : report.trend === "DOWN" ? ArrowDownRight : ArrowRight;
  const trendLabel = report.confirmedCount < 2 ? "Histórico insuficiente" : report.trend === "UP" ? `Ganho de ${formatPercent(Math.abs(report.trendPercentage))} p.p.` : report.trend === "DOWN" ? `Queda de ${formatPercent(Math.abs(report.trendPercentage))} p.p.` : "Desempenho estável";
  return <article className="student-report-document border border-stone-200 bg-white p-5 shadow-panel sm:p-7">
    <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-teal-800">Sistema de Provas</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{report.classGroup}</h2><p className="mt-1 text-sm text-slate-500">Visão pedagógica consolidada da turma</p></div><p className="text-sm text-slate-500">Emitido em {formatDate(new Date().toISOString())}</p></header>
    <section className="grid gap-4 border-b border-stone-200 py-6 sm:grid-cols-4"><ReportMetric icon={BarChart3} label="Aproveitamento" value={`${formatPercent(report.averagePercentage)}%`} /><ReportMetric icon={CheckCircle2} label="Correções" value={String(report.confirmedCount)} /><ReportMetric icon={Target} label="Posição" value={`${rank}ª de ${totalClasses}`} /><ReportMetric icon={TrendIcon} label="Evolução" value={trendLabel} /></section>
    <section className="py-6"><h3 className="text-base font-semibold text-slate-950">Histórico de avaliações</h3><div className="mt-4 overflow-x-auto border border-stone-200"><table className="min-w-full text-left text-sm"><thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Prova</th><th className="px-4 py-3">Versão</th><th className="px-4 py-3">Acertos</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Aproveitamento</th></tr></thead><tbody>{report.corrections.map((item) => <tr className="border-b border-stone-100 last:border-0" key={item.id}><td className="px-4 py-3 text-slate-600">{formatDate(item.reviewedAt || item.createdAt)}</td><td className="px-4 py-3 font-medium text-slate-950">{item.examTitle}</td><td className="px-4 py-3 text-slate-700">{item.versionLabel}</td><td className="px-4 py-3 text-slate-700">{item.correctCount}</td><td className="px-4 py-3 font-semibold">{formatScore(item.score)} / {formatScore(item.totalScore)}</td><td className="px-4 py-3 font-semibold text-teal-800">{formatPercent(item.totalScore ? item.score / item.totalScore * 100 : 0)}%</td></tr>)}</tbody></table></div></section>
  </article>;
}

function OverviewMetric({ icon: Icon, label, value }: { icon: typeof School; label: string; value: string }) { return <div className="border border-stone-200 bg-white p-4 shadow-panel"><div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-500">{label}</p><Icon aria-hidden="true" className="text-teal-800" size={18} /></div><p className="mt-3 text-lg font-semibold text-slate-950">{value}</p></div>; }
function ReportMetric({ icon: Icon, label, value }: { icon: typeof School; label: string; value: string }) { return <div><Icon aria-hidden="true" className="text-teal-800" size={19} /><p className="mt-3 text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-base font-semibold text-slate-950">{value}</p></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)); }
function formatPercent(value: number) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value); }
function formatScore(value: number) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value); }
function normalizeClass(value: string | null) { return (value?.trim() || "Turma não informada").normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"); }
