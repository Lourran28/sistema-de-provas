import { CheckCircle2, ClipboardCheck, Clock3, School, Search, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "../components/ui/Card";
import { getCorrections } from "../services/correctionService";
import { getExamApplications } from "../services/examApplicationService";
import { getExams } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import type { Correction } from "../types/corrections";
import type { ExamApplication } from "../types/exams";

type ClassProgress = {
  applicationCount: number;
  classGroup: string;
  confirmedCount: number;
  lastAppliedOn: string | null;
  pendingReviewCount: number;
};

type ClassDashboardData = {
  applications: ExamApplication[];
  corrections: Correction[];
};

export function StudentsPage() {
  const [data, setData] = useState<ClassDashboardData>({ applications: [], corrections: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [corrections, exams] = await Promise.all([getCorrections(), getAllExams()]);
      const applications = (await Promise.all(exams.map((exam) => getExamApplications(exam.id)))).flat();
      setData({ applications, corrections });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível carregar o acompanhamento das turmas."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadClasses(), 0);
    return () => window.clearTimeout(timer);
  }, [loadClasses]);

  const classes = useMemo(() => buildClassProgress(data), [data]);
  const visibleClasses = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);
    return normalizedSearch
      ? classes.filter((item) => normalizeSearch(item.classGroup).includes(normalizedSearch))
      : classes;
  }, [classes, search]);
  const summary = useMemo(() => summarizeClasses(classes), [classes]);

  return (
    <div className="space-y-7">
      <section>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
            <School aria-hidden="true" size={21} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Turmas</h1>
            <p className="mt-1 text-sm text-slate-500">Acompanhe as provas aplicadas, as correções concluídas e o que falta corrigir em cada turma.</p>
          </div>
        </div>
      </section>

      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}

      {isLoading ? (
        <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando acompanhamento das turmas...</Card>
      ) : (
        <>
          <section aria-label="Resumo das correções" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={School} label="Turmas acompanhadas" tone="teal" value={String(summary.classCount)} />
            <Metric icon={ClipboardCheck} label="Aplicações registradas" tone="slate" value={String(summary.applicationCount)} />
            <Metric icon={CheckCircle2} label="Turmas corrigidas" tone="emerald" value={String(summary.correctedClassCount)} />
            <Metric icon={Clock3} label="Turmas em revisão" tone="amber" value={String(summary.pendingClassCount)} />
          </section>

          {classes.length > 0 ? (
            <label className="relative block max-w-md">
              <span className="sr-only">Buscar turma</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
              <input className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar turma" type="search" value={search} />
            </label>
          ) : null}

          {classes.length === 0 ? (
            <EmptyClasses />
          ) : visibleClasses.length === 0 ? (
            <Card className="px-6 py-12 text-center">
              <h2 className="text-lg font-semibold text-slate-950">Nenhuma turma encontrada</h2>
              <p className="mt-2 text-sm text-slate-500">Ajuste a busca para consultar outra turma.</p>
            </Card>
          ) : (
            <section aria-label="Acompanhamento por turma" className="overflow-hidden">
              <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-panel xl:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="min-w-56 px-5 py-3">Turma</th>
                      <th className="px-5 py-3 text-right">Aplicações</th>
                      <th className="px-5 py-3 text-right">Cartões corrigidos</th>
                      <th className="px-5 py-3 text-right">Em revisão</th>
                      <th className="px-5 py-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {visibleClasses.map((item) => <ClassRow item={item} key={item.classGroup} />)}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 xl:hidden">
                {visibleClasses.map((item) => <ClassCard item={item} key={item.classGroup} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ClassRow({ item }: { item: ClassProgress }) {
  return (
    <tr className="text-slate-700">
      <td className="min-w-56 px-5 py-4">
        <p className="whitespace-nowrap font-semibold text-slate-950">{item.classGroup}</p>
        <p className="mt-1 text-xs text-slate-500">{classDetails(item)}</p>
      </td>
      <NumberCell value={item.applicationCount} />
      <NumberCell className="font-semibold text-emerald-700" value={item.confirmedCount} />
      <NumberCell className="text-amber-700" value={item.pendingReviewCount} />
      <td className="min-w-44 px-5 py-4"><ClassStatus item={item} /></td>
    </tr>
  );
}

function ClassCard({ item }: { item: ClassProgress }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{item.classGroup}</h2>
          <p className="mt-1 text-xs text-slate-500">{classDetails(item)}</p>
        </div>
        <ClassStatus item={item} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-stone-200 py-4 text-sm">
        <MetricValue label="Aplicações" value={item.applicationCount} />
        <MetricValue className="text-emerald-700" label="Cartões corrigidos" value={item.confirmedCount} />
        <MetricValue className="text-amber-700" label="Em revisão" value={item.pendingReviewCount} />
      </div>
    </Card>
  );
}

function NumberCell({ className = "", value }: { className?: string; value: number }) {
  return <td className={`px-5 py-4 text-right ${className}`}>{value}</td>;
}

function MetricValue({ className = "", label, value }: { className?: string; label: string; value: number }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 font-semibold text-slate-950 ${className}`}>{value}</p></div>;
}

function ClassStatus({ item }: { item: ClassProgress }) {
  if (item.pendingReviewCount > 0) return <span className="text-sm font-semibold text-amber-700">Em revisão</span>;
  if (item.confirmedCount > 0) return <span className="text-sm font-semibold text-emerald-700">Corrigida</span>;
  return <span className="text-sm font-medium text-slate-500">Sem correção</span>;
}

function Metric({ icon: Icon, label, tone, value }: { icon: typeof School; label: string; tone: "amber" | "emerald" | "slate" | "teal"; value: string }) {
  const toneClass = tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : tone === "teal" ? "text-teal-800" : "text-slate-700";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-600">{label}</p><Icon aria-hidden="true" className={toneClass} size={19} /></div>
      <p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p>
    </Card>
  );
}

function EmptyClasses() {
  return (
    <Card className="px-6 py-12 text-center">
      <UsersRound aria-hidden="true" className="mx-auto text-teal-800" size={26} />
      <h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhuma turma para acompanhar</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">As turmas aparecem aqui automaticamente quando uma prova é aplicada ou uma correção é registrada.</p>
    </Card>
  );
}

async function getAllExams() {
  const firstPage = await getExams(0, 100);
  if (firstPage.page.totalPages <= 1) {
    return firstPage.items;
  }
  const otherPages = await Promise.all(
    Array.from({ length: firstPage.page.totalPages - 1 }, (_, index) => getExams(index + 1, 100))
  );
  return [firstPage, ...otherPages].flatMap((page) => page.items);
}

function buildClassProgress({ applications, corrections }: ClassDashboardData) {
  const byClass = new Map<string, ClassProgress>();
  const ensureClass = (classGroup: string | null | undefined) => {
    const normalizedClassGroup = classGroup?.trim() || "Sem turma";
    const current = byClass.get(normalizedClassGroup);
    if (current) {
      return current;
    }
    const created: ClassProgress = {
      applicationCount: 0,
      classGroup: normalizedClassGroup,
      confirmedCount: 0,
      lastAppliedOn: null,
      pendingReviewCount: 0,
    };
    byClass.set(normalizedClassGroup, created);
    return created;
  };

  for (const application of applications) {
    const current = ensureClass(application.classGroup);
    current.applicationCount += 1;
    if (!current.lastAppliedOn || application.appliedOn > current.lastAppliedOn) {
      current.lastAppliedOn = application.appliedOn;
    }
  }
  for (const correction of corrections) {
    const current = ensureClass(correction.classGroup);
    if (correction.status === "CONFIRMED") {
      current.confirmedCount += 1;
    } else if (correction.status === "NEEDS_REVIEW") {
      current.pendingReviewCount += 1;
    }
  }

  return [...byClass.values()].sort((left, right) => Number(left.confirmedCount > 0) - Number(right.confirmedCount > 0) || left.classGroup.localeCompare(right.classGroup, "pt-BR"));
}

function summarizeClasses(classes: ClassProgress[]) {
  return classes.reduce((summary, item) => ({
    applicationCount: summary.applicationCount + item.applicationCount,
    classCount: summary.classCount + 1,
    correctedClassCount: summary.correctedClassCount + Number(item.confirmedCount > 0),
    pendingClassCount: summary.pendingClassCount + Number(item.pendingReviewCount > 0)
  }), { applicationCount: 0, classCount: 0, correctedClassCount: 0, pendingClassCount: 0 });
}

function classDetails(item: ClassProgress) {
  const parts = [
    item.applicationCount > 0 ? `${item.applicationCount} aplicação${item.applicationCount === 1 ? "" : "ões"}` : null,
    item.lastAppliedOn ? `última em ${formatDate(item.lastAppliedOn)}` : null
  ].filter(Boolean);
  return parts.join(" · ") || "Sem aplicação registrada";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`));
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}
