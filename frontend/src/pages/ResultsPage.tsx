import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, CheckCircle2, Download, Eye, School, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { allFilters, downloadClassPerformanceCsv, filterCorrections, getClassPerformance, getQuestionPerformance, summarizeCorrections, type ClassPerformance, type CorrectionFilters } from "../features/results/resultsMetrics";
import { getCorrections } from "../services/correctionService";
import { ApiRequestError } from "../services/httpClient";
import type { Correction } from "../types/corrections";

export function ResultsPage() {
  const navigate = useNavigate();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [filters, setFilters] = useState<CorrectionFilters>(allFilters);
  const [selectedClass, setSelectedClass] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCorrections().then((data) => { if (active) setCorrections(data); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível carregar o desempenho das turmas."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const classes = useMemo(() => [...new Set(corrections.map((item) => item.classGroup?.trim() || "Turma não informada"))].sort((a, b) => a.localeCompare(b, "pt-BR")), [corrections]);
  const versions = useMemo(() => uniqueBy(corrections, (item) => item.examVersionId), [corrections]);
  const visible = useMemo(() => filterCorrections(corrections, filters), [corrections, filters]);
  const summary = useMemo(() => summarizeCorrections(visible), [visible]);
  const performance = useMemo(() => getClassPerformance(visible), [visible]);
  const selected = performance.find((item) => item.classGroup === selectedClass) ?? performance[0] ?? null;
  const questionPerformance = useMemo(() => getQuestionPerformance(visible, filters.versionId), [visible, filters.versionId]);

  function updateFilter<Key extends keyof CorrectionFilters>(key: Key, value: CorrectionFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setSelectedClass("");
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-semibold text-slate-950">Desempenho das turmas</h1><p className="mt-1 text-sm text-slate-500">Compare resultados, acompanhe ganhos e identifique as turmas que precisam de reforço.</p></div>
        <div className="flex flex-wrap gap-2"><Button icon={Eye} onClick={() => navigate("/boletins")} variant="secondary">Visão geral</Button><Button disabled={visible.length === 0} icon={Download} onClick={() => downloadClassPerformanceCsv(visible)} variant="secondary">Exportar CSV</Button></div>
      </section>
      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}
      {isLoading ? <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando desempenho...</Card> : corrections.length === 0 ? <EmptyResults /> : <>
        <section className="grid gap-3 border-y border-stone-200 py-5 md:grid-cols-3">
          <FilterSelect label="Prova e versão" onChange={(value) => updateFilter("versionId", value)} value={filters.versionId}><option value="ALL">Todas as versões</option>{versions.map((item) => <option key={item.examVersionId} value={item.examVersionId}>{item.examTitle} · Versão {item.versionLabel}</option>)}</FilterSelect>
          <FilterSelect label="Turma" onChange={(value) => updateFilter("classGroup", value)} value={filters.classGroup}><option value="ALL">Todas as turmas</option>{classes.map((item) => <option key={item} value={item}>{item}</option>)}</FilterSelect>
          <FilterSelect label="Situação" onChange={(value) => updateFilter("status", value as CorrectionFilters["status"])} value={filters.status}><option value="ALL">Todas</option><option value="CONFIRMED">Confirmadas</option><option value="NEEDS_REVIEW">Aguardando revisão</option></FilterSelect>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={School} label="Turmas analisadas" value={String(summary.classCount)} />
          <Metric icon={CheckCircle2} label="Correções confirmadas" tone="emerald" value={String(summary.confirmedCount)} />
          <Metric icon={BarChart3} label="Aproveitamento médio" value={summary.averagePercentage === null ? "-" : `${formatPercent(summary.averagePercentage)}%`} />
          <Metric icon={TrendingUp} label="Turmas em evolução" tone="emerald" value={String(summary.improvingClassCount)} />
        </section>

        <section>
          <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-950">Comparação entre turmas</h2><p className="mt-1 text-sm text-slate-500">A variação compara os resultados mais recentes com os anteriores.</p></div>{summary.pendingCount > 0 ? <span className="text-sm font-medium text-amber-700">{summary.pendingCount} aguardando revisão</span> : null}</div>
          {performance.length === 0 ? <p className="mt-5 border-y border-stone-200 py-8 text-sm text-slate-500">Ainda não há correções confirmadas neste filtro.</p> : <ClassComparison items={performance} onSelect={setSelectedClass} selectedClass={selected?.classGroup} />}
        </section>

        {selected ? <ClassDetails item={selected} /> : null}
        {filters.versionId !== "ALL" ? <QuestionTable rows={questionPerformance} /> : null}
      </>}
    </div>
  );
}

function EmptyResults() { return <Card className="px-6 py-12 text-center"><BarChart3 aria-hidden="true" className="mx-auto text-teal-800" size={26} /><h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhuma correção registrada</h2><p className="mt-2 text-sm text-slate-500">Confirme uma correção para começar a acompanhar suas turmas.</p></Card>; }

function FilterSelect({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) { return <label className="block text-sm font-medium text-slate-700">{label}<select className="mt-2 h-10 w-full border border-stone-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>; }

function Metric({ icon: Icon, label, tone = "teal", value }: { icon: typeof School; label: string; tone?: "emerald" | "teal"; value: string }) { return <article className="border border-stone-200 bg-white p-4 shadow-panel"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-600">{label}</p><Icon aria-hidden="true" className={tone === "emerald" ? "text-emerald-700" : "text-teal-800"} size={19} /></div><p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p></article>; }

function ClassComparison({ items, onSelect, selectedClass }: { items: ClassPerformance[]; onSelect: (classGroup: string) => void; selectedClass?: string }) {
  return <>
    <div className="mt-5 grid gap-3 md:hidden">
      {items.map((item) => <article className={selectedClass === item.classGroup ? "border border-teal-300 bg-teal-50/50 p-4" : "border border-stone-200 bg-white p-4"} key={item.classGroup}>
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-950">{item.classGroup}</h3><p className="mt-1 text-sm text-slate-500">{item.confirmedCount} {item.confirmedCount === 1 ? "correção" : "correções"}</p></div><Button aria-label={`Ver detalhes de ${item.classGroup}`} className="h-9 w-9 px-0" icon={Eye} onClick={() => onSelect(item.classGroup)} title="Ver detalhes" variant="ghost" /></div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div><dt className="text-slate-500">Média</dt><dd className="mt-1 font-semibold text-teal-800">{formatPercent(item.averagePercentage)}%</dd></div><div><dt className="text-slate-500">Melhor</dt><dd className="mt-1 font-semibold text-slate-950">{formatPercent(item.bestPercentage)}%</dd></div><div className="col-span-2"><dt className="text-slate-500">Ganhos e perdas</dt><dd className="mt-1"><Trend item={item} /></dd></div></dl>
      </article>)}
    </div>
    <div className="mt-5 hidden overflow-x-auto border border-stone-200 bg-white shadow-panel md:block"><table className="min-w-full text-left text-sm"><thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Turma</th><th className="px-4 py-3">Correções</th><th className="px-4 py-3">Média</th><th className="px-4 py-3">Melhor</th><th className="px-4 py-3">Variação</th><th className="px-4 py-3"><span className="sr-only">Detalhes</span></th></tr></thead><tbody>{items.map((item) => <tr className={selectedClass === item.classGroup ? "border-b border-teal-100 bg-teal-50/50" : "border-b border-stone-100"} key={item.classGroup}><td className="px-4 py-4 font-semibold text-slate-950">{item.classGroup}</td><td className="px-4 py-4 text-slate-700">{item.confirmedCount}</td><td className="px-4 py-4 font-semibold text-teal-800">{formatPercent(item.averagePercentage)}%</td><td className="px-4 py-4 text-slate-700">{formatPercent(item.bestPercentage)}%</td><td className="px-4 py-4"><Trend item={item} /></td><td className="px-4 py-4 text-right"><Button aria-label={`Ver detalhes de ${item.classGroup}`} className="h-9 w-9 px-0" icon={Eye} onClick={() => onSelect(item.classGroup)} title="Ver detalhes" variant="ghost" /></td></tr>)}</tbody></table></div>
  </>;
}

function Trend({ item }: { item: ClassPerformance }) {
  const Icon = item.trend === "UP" ? ArrowUpRight : item.trend === "DOWN" ? ArrowDownRight : ArrowRight;
  const color = item.trend === "UP" ? "text-emerald-700" : item.trend === "DOWN" ? "text-rose-700" : "text-slate-600";
  const label = item.confirmedCount < 2 ? "Sem histórico" : item.trend === "STABLE" ? "Estável" : `${item.trendPercentage > 0 ? "+" : ""}${formatPercent(item.trendPercentage)} p.p.`;
  return <span className={`inline-flex items-center gap-1 font-semibold ${color}`}><Icon aria-hidden="true" size={17} />{label}</span>;
}

function ClassDetails({ item }: { item: ClassPerformance }) {
  return <section className="border-y border-stone-200 py-6"><div><p className="text-xs font-semibold uppercase text-teal-800">Turma selecionada</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{item.classGroup}</h2></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><SmallMetric label="Acertos" value={String(item.correctCount)} /><SmallMetric label="Erros" value={String(item.wrongCount)} /><SmallMetric label="Em branco" value={String(item.blankCount)} /></div><div className="mt-6 grid gap-3 md:hidden">{item.corrections.map((correction) => <article className="border border-stone-200 bg-white p-4" key={correction.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-950">{correction.examTitle}</h3><p className="mt-1 text-sm text-slate-500">{formatDate(correction.reviewedAt || correction.createdAt)} · Versão {correction.versionLabel}</p></div><strong className="text-teal-800">{formatPercent(correction.totalScore ? correction.score / correction.totalScore * 100 : 0)}%</strong></div><p className="mt-3 text-sm text-slate-600">Nota <strong className="text-slate-950">{formatScore(correction.score)} / {formatScore(correction.totalScore)}</strong></p></article>)}</div><div className="mt-6 hidden overflow-x-auto border border-stone-200 bg-white md:block"><table className="min-w-full text-left text-sm"><thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Prova</th><th className="px-4 py-3">Versão</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Aproveitamento</th></tr></thead><tbody>{item.corrections.map((correction) => <tr className="border-b border-stone-100 last:border-0" key={correction.id}><td className="px-4 py-3 text-slate-600">{formatDate(correction.reviewedAt || correction.createdAt)}</td><td className="px-4 py-3 font-medium text-slate-950">{correction.examTitle}</td><td className="px-4 py-3 text-slate-700">{correction.versionLabel}</td><td className="px-4 py-3 font-semibold text-slate-950">{formatScore(correction.score)} / {formatScore(correction.totalScore)}</td><td className="px-4 py-3 font-semibold text-teal-800">{formatPercent(correction.totalScore ? correction.score / correction.totalScore * 100 : 0)}%</td></tr>)}</tbody></table></div></section>;
}

function SmallMetric({ label, value }: { label: string; value: string }) { return <div className="border border-stone-200 bg-white px-4 py-3"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>; }

function QuestionTable({ rows }: { rows: ReturnType<typeof getQuestionPerformance> }) { return <section><h2 className="text-lg font-semibold text-slate-950">Pontos que precisam de reforço</h2><p className="mt-1 text-sm text-slate-500">Questões ordenadas do menor para o maior aproveitamento.</p>{rows.length === 0 ? <p className="mt-5 text-sm text-slate-500">Ainda não há dados confirmados para esta versão.</p> : <div className="mt-5 overflow-x-auto border border-stone-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Questão</th><th className="px-4 py-3">Acertos</th><th className="px-4 py-3">Erros</th><th className="px-4 py-3">Aproveitamento</th></tr></thead><tbody>{rows.map((row) => <tr className="border-b border-stone-100" key={row.position}><td className="px-4 py-3 font-semibold">{row.position}</td><td className="px-4 py-3 text-emerald-700">{row.correctCount}</td><td className="px-4 py-3 text-rose-700">{row.incorrectCount}</td><td className="px-4 py-3 font-semibold">{row.successRate === null ? "-" : `${formatPercent(row.successRate)}%`}</td></tr>)}</tbody></table></div>}</section>; }

function uniqueBy<T, Key>(items: T[], key: (item: T) => Key) { return [...new Map(items.map((item) => [key(item), item])).values()]; }
function formatScore(value: number) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value); }
function formatPercent(value: number) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value); }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)); }
