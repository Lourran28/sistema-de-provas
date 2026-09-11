import { BookOpenCheck, CalendarClock, ChevronRight, ClipboardCheck, ClipboardList, Clock3, FilePlus2, FileText, ScanLine, Shuffle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../features/auth/useAuth";
import { getCorrections } from "../services/correctionService";
import { getContents } from "../services/contentService";
import { getUpcomingExamApplications } from "../services/examApplicationService";
import { getExams } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import { getQuestions } from "../services/questionService";
import { examKindLabels, examStatusLabels, type Exam, type ExamPage, type ExamStatus, type UpcomingExamApplication } from "../types/exams";
import type { Correction } from "../types/corrections";

const emptyExamPage: ExamPage = {
  items: [],
  page: { number: 0, size: 5, totalElements: 0, totalPages: 0 }
};

const shortcuts = [
  { icon: FilePlus2, label: "Criar nova prova", to: "/criar-prova" },
  { icon: Shuffle, label: "Sortear do banco", to: "/gerar-prova" },
  { icon: BookOpenCheck, label: "Planejar aula", to: "/conteudos" },
  { icon: ScanLine, label: "Corrigir cartão", to: "/correcao" }
];

type Activity = {
  description: string;
  occurredAt: string;
  to: string;
  type: "correction" | "exam";
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [examPage, setExamPage] = useState<ExamPage>(emptyExamPage);
  const [questionCount, setQuestionCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [upcomingApplications, setUpcomingApplications] = useState<UpcomingExamApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getExams(0, 5), getQuestions({ size: 1 }), getContents({ size: 1 }), getCorrections(), getUpcomingExamApplications()])
      .then(([nextExams, nextQuestions, nextContents, nextCorrections, nextApplications]) => {
        if (!active) {
          return;
        }
        setExamPage(nextExams);
        setQuestionCount(nextQuestions.page.totalElements);
        setContentCount(nextContents.page.totalElements);
        setCorrections(nextCorrections);
        setUpcomingApplications(nextApplications);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível carregar o painel.");
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

  const confirmedCorrections = corrections.filter((correction) => correction.status === "CONFIRMED").length;
  const pendingCorrections = corrections.filter((correction) => correction.status === "NEEDS_REVIEW").length;
  const activities = useMemo(() => buildActivities(examPage.items, corrections), [corrections, examPage.items]);

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-800">Olá, {firstName(user?.name)}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Acompanhe suas avaliações e retome o trabalho de onde parou.</p>
        </div>
        <Button icon={Shuffle} onClick={() => navigate("/gerar-prova")}>Sortear prova</Button>
      </section>

      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}

      {upcomingApplications.length > 0 ? (
        <section aria-labelledby="upcoming-applications-title" aria-live="polite" className="border border-teal-200 bg-teal-50">
          <header className="flex items-start gap-3 border-b border-teal-200 px-4 py-4">
            <CalendarClock aria-hidden="true" className="mt-0.5 shrink-0 text-teal-800" size={20} />
            <div>
              <h2 className="font-semibold text-teal-950" id="upcoming-applications-title">Aplicações próximas</h2>
              <p className="mt-1 text-sm text-teal-900">Você tem {upcomingApplications.length} {upcomingApplications.length === 1 ? "avaliação marcada" : "avaliações marcadas"} para os próximos 7 dias.</p>
            </div>
          </header>
          <div className="divide-y divide-teal-200">
            {upcomingApplications.map((application) => (
              <article className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" key={application.id}>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{application.examTitle}</p>
                  <p className="mt-1 text-sm text-slate-600">{examKindLabels[application.examKind]} · Turma {application.classGroup} · {formatApplicationDate(application.appliedOn)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-teal-900">{applicationDateLabel(application.appliedOn)}</span>
                  <Button aria-label={`Abrir ${application.examTitle}`} className="h-9 w-9 px-0" icon={ChevronRight} onClick={() => navigate(`/provas/${application.examId}`)} title="Abrir avaliação" variant="ghost" />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric color="teal" icon={FileText} label="Provas" value={isLoading ? "-" : String(examPage.page.totalElements)} />
        <Metric color="amber" icon={ClipboardList} label="Questões" value={isLoading ? "-" : String(questionCount)} />
        <Metric color="rose" icon={BookOpenCheck} label="Planejamentos" value={isLoading ? "-" : String(contentCount)} />
        <Metric color="emerald" icon={ClipboardCheck} label="Correções confirmadas" value={isLoading ? "-" : String(confirmedCorrections)} />
      </section>

      {pendingCorrections > 0 ? (
        <section className="flex flex-col gap-3 border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-950"><strong>{pendingCorrections} correção{pendingCorrections === 1 ? "" : "ões"}</strong> precisa{pendingCorrections === 1 ? "" : "m"} da sua revisão antes de entrar nos resultados.</p>
          <Button className="shrink-0" icon={ScanLine} onClick={() => navigate("/revisar-correcoes")} variant="secondary">Revisar agora</Button>
        </section>
      ) : null}

      <section className="grid gap-7 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.8fr)]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Provas recentes</h2>
              <p className="mt-1 text-sm text-slate-500">As últimas provas atualizadas na sua conta.</p>
            </div>
            <Button onClick={() => navigate("/provas")} variant="ghost">Ver todas</Button>
          </div>
          {isLoading ? (
            <Card className="mt-5 px-5 py-10 text-center text-sm text-slate-500">Carregando provas...</Card>
          ) : examPage.items.length === 0 ? (
            <Card className="mt-5 px-5 py-10 text-center">
              <FileText aria-hidden="true" className="mx-auto text-teal-800" size={24} />
              <h3 className="mt-3 text-base font-semibold text-slate-950">Sua primeira prova começa aqui</h3>
              <p className="mt-1 text-sm text-slate-500">Escolha as questões manualmente ou sorteie uma avaliação a partir do banco.</p>
              <Button className="mt-4" icon={FilePlus2} onClick={() => navigate("/criar-prova")}>Criar prova</Button>
            </Card>
          ) : (
            <div className="mt-5 overflow-x-auto border border-stone-200 bg-white shadow-panel">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500">
                  <tr><th className="px-5 py-3 font-semibold">Prova</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Atualizada</th><th className="px-5 py-3"><span className="sr-only">Abrir prova</span></th></tr>
                </thead>
                <tbody>
                  {examPage.items.map((exam) => (
                    <tr className="border-b border-stone-100 last:border-0" key={exam.id}>
                      <td className="px-5 py-4"><p className="font-semibold text-slate-950">{exam.title}</p><p className="mt-1 text-xs text-slate-500">{exam.classGroup || "Turma não informada"} · {exam.questionCount} questões</p></td>
                      <td className="px-5 py-4"><StatusBadge status={exam.status} /></td>
                      <td className="px-5 py-4 text-slate-600">{formatRelativeDate(exam.updatedAt)}</td>
                      <td className="px-5 py-4 text-right"><Button aria-label={`Abrir ${exam.title}`} className="h-9 w-9 px-0" icon={ChevronRight} onClick={() => navigate(`/provas/${exam.id}`)} title="Abrir prova" variant="ghost" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-950">Atalhos</h2>
          <div className="mt-4 grid gap-2">
            {shortcuts.map((shortcut) => (
              <button className="flex h-11 items-center justify-between border border-stone-200 bg-white px-3 text-left text-sm font-medium text-slate-700 shadow-panel transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800" key={shortcut.to} onClick={() => navigate(shortcut.to)} type="button">
                <span className="flex items-center gap-3"><shortcut.icon aria-hidden="true" size={18} />{shortcut.label}</span><ChevronRight aria-hidden="true" size={17} />
              </button>
            ))}
          </div>

          <section className="mt-7 border-t border-stone-200 pt-6">
            <div className="flex items-center gap-2"><Clock3 aria-hidden="true" className="text-teal-800" size={18} /><h2 className="text-lg font-semibold text-slate-950">Últimas atividades</h2></div>
            {isLoading ? <p className="mt-4 text-sm text-slate-500">Carregando atividades...</p> : activities.length === 0 ? <p className="mt-4 text-sm text-slate-500">As atividades da sua conta aparecerão aqui.</p> : (
              <ol className="mt-4 space-y-4">
                {activities.map((activity) => (
                  <li className="flex gap-3" key={`${activity.type}-${activity.to}-${activity.occurredAt}`}>
                    <span className={activity.type === "correction" ? "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700" : "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800"}>{activity.type === "correction" ? <ClipboardCheck aria-hidden="true" size={15} /> : <FileText aria-hidden="true" size={15} />}</span>
                    <button className="min-w-0 text-left" onClick={() => navigate(activity.to)} type="button"><p className="text-sm font-medium text-slate-800">{activity.description}</p><p className="mt-1 text-xs text-slate-500">{formatRelativeDate(activity.occurredAt)}</p></button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function Metric({ color, icon: Icon, label, value }: { color: "amber" | "emerald" | "rose" | "teal"; icon: typeof FileText; label: string; value: string }) {
  const iconClass = {
    amber: "bg-amber-100 text-amber-800",
    emerald: "bg-emerald-100 text-emerald-800",
    rose: "bg-rose-100 text-rose-700",
    teal: "bg-teal-100 text-teal-800"
  }[color];
  return <article className="border border-stone-200 bg-white p-4 shadow-panel"><div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}><Icon aria-hidden="true" size={18} /></div><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p></article>;
}

function StatusBadge({ status }: { status: ExamStatus }) {
  const className = {
  APPLIED: "bg-sky-50 text-sky-800",
    CORRECTED: "bg-emerald-50 text-emerald-800",
    DRAFT: "bg-amber-50 text-amber-800",
    IN_REVIEW: "bg-violet-50 text-violet-800",
    READY: "bg-teal-50 text-teal-800",
    VERSIONS_GENERATED: "bg-blue-50 text-blue-800"
  }[status];
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${className}`}>{examStatusLabels[status]}</span>;
}

function buildActivities(exams: Exam[], corrections: Correction[]): Activity[] {
  return [
    ...exams.map((exam) => ({ description: `Prova “${exam.title}” atualizada`, occurredAt: exam.updatedAt, to: `/provas/${exam.id}`, type: "exam" as const })),
    ...corrections.map((correction) => ({ description: `Correção da turma ${correction.classGroup || "não informada"} ${correction.status === "CONFIRMED" ? "confirmada" : "salva para revisão"}`, occurredAt: correction.reviewedAt || correction.createdAt, to: "/resultados", type: "correction" as const }))
  ].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()).slice(0, 5);
}

function firstName(name: string | undefined) {
  return name?.trim().split(/\s+/)[0] || "professor(a)";
}

function applicationDateLabel(value: string) {
  const days = daysUntil(value);
  if (days === 0) {
    return "Hoje";
  }
  if (days === 1) {
    return "Amanhã";
  }
  return `Em ${days} dias`;
}

function formatApplicationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(dateFromIsoDay(value));
}

function daysUntil(value: string) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((dateFromIsoDay(value).getTime() - today.getTime()) / 86_400_000);
}

function dateFromIsoDay(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const difference = Date.now() - date.getTime();
  const hours = Math.floor(difference / 3_600_000);
  if (hours < 1) {
    return "Agora mesmo";
  }
  if (hours < 24) {
    return `Há ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Há ${days} dia${days === 1 ? "" : "s"}`;
  }
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}
