import { ClipboardList, Eye, FilePlus2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirmation } from "../components/ui/confirmationContext";
import { clearExams, deleteExam, getExams } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import { ModalDialog } from "../components/ui/ModalDialog";
import { getSubjects } from "../services/subjectService";
import { examKindLabels, examStatusLabels, type Exam, type ExamPage } from "../types/exams";
import type { Subject } from "../types/contents";

const initialPage: ExamPage = {
  items: [],
  page: { number: 0, size: 12, totalElements: 0, totalPages: 0 }
};

export function ExamsPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [examPage, setExamPage] = useState<ExamPage>(initialPage);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextExamPage, nextSubjects] = await Promise.all([getExams(), getSubjects()]);
      setExamPage(nextExamPage);
      setSubjects(nextSubjects);
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível carregar suas provas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadExams();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadExams]);

  async function removeExam(exam: Exam) {
    if (!(await confirm({
      confirmLabel: "Remover prova",
      description: `Remover “${exam.title}” da sua lista? Provas com versões oficiais serão arquivadas para preservar o histórico.`,
      title: "Remover prova",
      variant: "danger"
    }))) {
      return;
    }
    setDeletingExamId(exam.id);
    setError("");
    setNotice("");
    try {
      await deleteExam(exam.id);
      setNotice("Prova removida da lista.");
      await loadExams();
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível remover a prova.");
    } finally {
      setDeletingExamId(null);
    }
  }

  async function clearExamList() {
    setIsClearing(true);
    setError("");
    try {
      const result = await clearExams();
      setNotice(
        result.archivedCount > 0
          ? `${result.deletedCount} ${examLabel(result.deletedCount)} excluída${result.deletedCount === 1 ? "" : "s"}. ${result.archivedCount} ${examLabel(result.archivedCount)} com versões oficiais foi arquivada para preservar o histórico.`
          : `${result.deletedCount} ${examLabel(result.deletedCount)} excluída${result.deletedCount === 1 ? "" : "s"} da lista.`
      );
      setIsClearModalOpen(false);
      await loadExams();
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível limpar as provas.");
    } finally {
      setIsClearing(false);
    }
  }

  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Minhas Provas</h1>
          <p className="mt-1 text-sm text-slate-500">Rascunhos e avaliações prontas para revisar ou aplicar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="border-rose-300 text-rose-700 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-800"
            disabled={examPage.page.totalElements === 0 || isClearing}
            icon={Trash2}
            onClick={() => setIsClearModalOpen(true)}
            variant="secondary"
          >
            Limpar provas
          </Button>
          <Button icon={FilePlus2} onClick={() => navigate("/criar-prova")}>
            Criar prova
          </Button>
        </div>
      </section>

      {error ? (
        <div aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando provas...</Card>
      ) : examPage.items.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <ClipboardList aria-hidden="true" className="mx-auto text-teal-800" size={24} />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhuma prova cadastrada</h2>
          <p className="mt-2 text-sm text-slate-500">Crie uma prova manual usando questões do seu banco.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Prova</th>
                  <th className="px-5 py-3">Disciplina</th>
                  <th className="px-5 py-3">Questões</th>
                  <th className="px-5 py-3">Nota total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="w-28 px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {examPage.items.map((exam) => (
                  <tr key={exam.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{exam.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{examKindLabels[exam.kind]} · {exam.classGroup ?? "Sem turma"}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{exam.subjectId ? subjectNames.get(exam.subjectId) ?? "Disciplina removida" : "Sem disciplina"}</td>
                    <td className="px-5 py-4 text-slate-600">{exam.questionCount}</td>
                    <td className="px-5 py-4 text-slate-600">{formatScore(exam.totalScore)}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">{examStatusLabels[exam.status]}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ExamActions deletingExamId={deletingExamId} exam={exam} onRemove={removeExam} onReview={() => navigate(`/provas/${exam.id}`)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-stone-200 md:hidden">
            {examPage.items.map((exam) => (
              <article className="space-y-3 px-4 py-4" key={exam.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{exam.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{examKindLabels[exam.kind]} · {exam.classGroup ?? "Sem turma"} · {exam.questionCount} questões · {formatScore(exam.totalScore)}</p>
                  </div>
                  <ExamActions deletingExamId={deletingExamId} exam={exam} onRemove={removeExam} onReview={() => navigate(`/provas/${exam.id}`)} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-stone-100 px-2 py-1 text-slate-700">{exam.subjectId ? subjectNames.get(exam.subjectId) ?? "Disciplina removida" : "Sem disciplina"}</span>
                  <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-800">{examStatusLabels[exam.status]}</span>
                </div>
              </article>
            ))}
          </div>
        </Card>
      )}

      {isClearModalOpen ? (
        <ModalDialog onClose={() => { if (!isClearing) { setIsClearModalOpen(false); } }} title="Limpar lista de provas">
          <div className="px-5 py-5 sm:px-6">
            <p className="text-sm leading-6 text-slate-700">Provas sem versões oficiais serão excluídas definitivamente. As que já possuem versões, aplicações ou correções serão arquivadas para manter o histórico.</p>
            <p className="mt-3 text-sm font-medium text-rose-800">Essa ação remove todas as provas da lista atual.</p>
          </div>
          <footer className="flex justify-end gap-3 border-t border-stone-200 px-5 py-4 sm:px-6">
            <Button disabled={isClearing} onClick={() => setIsClearModalOpen(false)} type="button" variant="secondary">Cancelar</Button>
            <Button className="bg-rose-700 hover:bg-rose-800" disabled={isClearing} icon={Trash2} onClick={() => void clearExamList()} type="button">
              {isClearing ? "Limpando..." : "Limpar provas"}
            </Button>
          </footer>
        </ModalDialog>
      ) : null}
    </div>
  );
}

function ExamActions({ deletingExamId, exam, onRemove, onReview }: { deletingExamId: string | null; exam: Exam; onRemove: (exam: Exam) => Promise<void>; onReview: () => void }) {
  return (
    <div className="flex shrink-0 justify-end gap-1">
      <Button aria-label={`Revisar ${exam.title}`} className="h-9 w-9 px-0" icon={Eye} onClick={onReview} title="Revisar prova" variant="ghost" />
      <Button
        aria-label={`Remover ${exam.title}`}
        className="h-9 w-9 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
        disabled={deletingExamId === exam.id}
        icon={Trash2}
        onClick={() => void onRemove(exam)}
        title="Remover prova"
        variant="ghost"
      />
    </div>
  );
}

function formatScore(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} pontos`;
}

function examLabel(count: number) {
  return count === 1 ? "prova" : "provas";
}
