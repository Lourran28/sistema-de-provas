import { Ban, CheckCircle2, Pencil, RefreshCw, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirmation } from "../components/ui/confirmationContext";
import { MathText } from "../components/ui/MathText";
import { ModalDialog } from "../components/ui/ModalDialog";
import { ExamDraftEditor } from "../features/exams/ExamDraftEditor";
import { ExamApplicationsPanel } from "../features/exams/ExamApplicationsPanel";
import { ExamVersionsPanel } from "../features/exams/ExamVersionsPanel";
import { getContents } from "../services/contentService";
import { approveExam, getExam, regenerateExamQuestion, removeExamQuestion, renameExam, toggleQuestionCancellation, updateExam } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import { getQuestions } from "../services/questionService";
import { getSubjects } from "../services/subjectService";
import { examKindLabels, examStatusLabels, type Exam, type ExamInput } from "../types/exams";
import type { Content, Subject } from "../types/contents";
import type { Question } from "../types/questions";

export function ExamReviewPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirmation();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<string | null>(null);
  const [cancellingQuestionId, setCancellingQuestionId] = useState<string | null>(null);
  const [removingQuestionId, setRemovingQuestionId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(() => Boolean((location.state as { edit?: boolean } | null)?.edit));
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadWorkspace = useCallback(async () => {
    if (!examId) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const [nextExam, questionPage, contentPage, nextSubjects] = await Promise.all([
        getExam(examId),
        getQuestions({ size: 100 }),
        getContents({ size: 100 }),
        getSubjects()
      ]);
      setExam(nextExam);
      setQuestions(questionPage.items);
      setContents(contentPage.items);
      setSubjects(nextSubjects);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível carregar o rascunho da prova."));
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const contentById = useMemo(() => new Map(contents.map((content) => [content.id, content])), [contents]);
  const subjectNames = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject.name])), [subjects]);

  async function handleRegenerate(questionId: string) {
    if (!exam || !(await confirm({
      confirmLabel: "Substituir questão",
      description: "Um novo rascunho será criado usando somente o mesmo conteúdo de origem desta questão.",
      title: "Substituir questão"
    }))) {
      return;
    }
    setRegeneratingQuestionId(questionId);
    setError("");
    try {
      const updatedExam = await regenerateExamQuestion(exam.id, questionId);
      setExam(updatedExam);
      const questionPage = await getQuestions({ size: 100 });
      setQuestions(questionPage.items);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível regenerar a questão."));
    } finally {
      setRegeneratingQuestionId(null);
    }
  }

  async function handleQuestionCancellation(questionId: string, isCancelled: boolean) {
    if (!exam) {
      return;
    }
    const action = isCancelled ? "restaurar" : "anular";
    if (!(await confirm({
      confirmLabel: isCancelled ? "Restaurar questão" : "Anular questão",
      description: `Deseja ${action} esta questão? As correções ainda pendentes serão recalculadas.`,
      title: isCancelled ? "Restaurar questão" : "Anular questão",
      variant: isCancelled ? "primary" : "danger"
    }))) {
      return;
    }
    setCancellingQuestionId(questionId);
    setError("");
    setNotice("");
    try {
      setExam(await toggleQuestionCancellation(exam.id, questionId));
      setNotice(isCancelled ? "Questão restaurada. As correções pendentes foram recalculadas." : "Questão anulada. O valor dela será atribuído nas correções pendentes.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível atualizar a anulação da questão."));
    } finally {
      setCancellingQuestionId(null);
    }
  }

  async function handleQuestionRemoval(questionId: string) {
    if (!exam || !(await confirm({
      confirmLabel: "Remover desta prova",
      description: "A questão continuará no Banco de Questões. As versões A, B e C e seus gabaritos serão recriados; descarte arquivos desta prova que já tenham sido baixados ou impressos.",
      title: "Remover questão da prova",
      variant: "danger"
    }))) {
      return;
    }
    setRemovingQuestionId(questionId);
    setError("");
    setNotice("");
    try {
      await removeExamQuestion(exam.id, questionId);
      await loadWorkspace();
      setNotice("Questão removida somente desta prova. Numeração, versões e gabaritos foram atualizados.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível remover a questão desta prova."));
    } finally {
      setRemovingQuestionId(null);
    }
  }

  async function handleApprove() {
    if (!exam || !(await confirm({
      confirmLabel: "Aprovar prova",
      description: "A prova ficará pronta para gerar as versões oficiais A, B e C.",
      title: "Aprovar prova"
    }))) {
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      setExam(await approveExam(exam.id));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível aprovar a prova."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDraftSave(input: ExamInput) {
    if (!exam) {
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      setExam(await updateExam(exam.id, input));
      setIsEditing(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível salvar o rascunho."));
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRename(title: string) {
    if (!exam) {
      return;
    }
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      setExam(await renameExam(exam.id, title));
      setIsRenaming(false);
      setNotice("Nome da prova atualizado.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível renomear a prova."));
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVersionsGenerated() {
    if (!exam) {
      return;
    }
    try {
      setExam(await getExam(exam.id));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "As versões foram geradas, mas não foi possível atualizar o status da prova."));
    }
  }

  if (isLoading) {
    return <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando rascunho...</Card>;
  }

  if (!exam) {
    return (
      <Card className="px-6 py-12 text-center">
        <h1 className="text-lg font-semibold text-slate-950">Prova não encontrada</h1>
        <Button className="mt-4" onClick={() => navigate("/provas")} variant="secondary">
          Voltar para provas
        </Button>
      </Card>
    );
  }

  const orderedQuestions = exam.questions.map((examQuestion) => ({ examQuestion, question: questionById.get(examQuestion.questionId) }));

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 items-center gap-1">
              <h1 className="truncate text-2xl font-semibold text-slate-950">{exam.title}</h1>
              <Button aria-label="Renomear prova" className="h-9 w-9 shrink-0 px-0" disabled={isSaving} icon={Pencil} onClick={() => setIsRenaming(true)} title="Renomear prova" variant="ghost" />
            </div>
            <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">{examKindLabels[exam.kind]}</span>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{examStatusLabels[exam.status]}</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {exam.subjectId ? subjectNames.get(exam.subjectId) ?? "Disciplina removida" : "Sem disciplina"} · {exam.questionCount} questões · {formatScore(exam.totalScore)}
          </p>
        </div>
        {exam.status === "DRAFT" && !isEditing ? (
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} icon={Pencil} onClick={() => setIsEditing(true)} variant="secondary">
              Editar rascunho
            </Button>
            <Button disabled={isSaving} icon={CheckCircle2} onClick={() => void handleApprove()}>
              {isSaving ? "Aprovando..." : "Aprovar prova"}
            </Button>
          </div>
        ) : null}
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

      {isRenaming ? (
        <RenameExamModal currentTitle={exam.title} isSaving={isSaving} onClose={() => setIsRenaming(false)} onSave={handleRename} />
      ) : null}

      {isEditing ? (
        <ExamDraftEditor
          contents={contents}
          exam={exam}
          isSaving={isSaving}
          onCancel={() => setIsEditing(false)}
          onSave={handleDraftSave}
          questions={questions}
          subjects={subjects}
        />
      ) : (
        <>
      {exam.contents.length > 0 ? (
        <section className="border-y border-stone-200 py-5">
          <h2 className="text-sm font-semibold text-slate-900">Conteúdos usados nesta geração</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {exam.contents.map((examContent) => (
              <span className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900" key={examContent.contentId}>
                {contentById.get(examContent.contentId)?.title ?? "Conteúdo removido"} · {examContent.questionTargetCount} questões
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {exam.status === "READY" || exam.status === "VERSIONS_GENERATED" || exam.status === "APPLIED" ? (
        <ExamVersionsPanel exam={exam} onVersionsGenerated={() => void handleVersionsGenerated()} />
      ) : null}

      {exam.status === "VERSIONS_GENERATED" || exam.status === "APPLIED" ? (
        <ExamApplicationsPanel exam={exam} onApplicationRecorded={() => void handleVersionsGenerated()} />
      ) : null}

      <section>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Revisão das questões</h2>
          <p className="mt-1 text-sm text-slate-500">Revise o enunciado, a imagem de apoio e a pontuação de cada questão.</p>
        </div>

        <div className="mt-5 space-y-4">
          {orderedQuestions.map(({ examQuestion, question }) => (
            <article className={examQuestion.isCancelled ? "border border-amber-300 bg-amber-50 p-5 shadow-panel" : "border border-stone-200 bg-white p-5 shadow-panel"} key={examQuestion.questionId}>
              {question ? (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Questão {examQuestion.position} · {formatScore(examQuestion.points)}</p>
                        {examQuestion.isCancelled ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">Anulada</span> : null}
                      </div>
                      <h3 className="mt-2 text-base font-semibold leading-6 text-slate-950"><MathText text={question.statement} /></h3>
                      {question.imageUrl ? <img alt={`Imagem de apoio da questão ${examQuestion.position}`} className="mt-4 max-h-80 w-full border border-stone-200 bg-stone-50 object-contain sm:max-w-xl" loading="lazy" referrerPolicy="no-referrer" src={question.imageUrl} /> : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {exam.status === "DRAFT" && question.sourceType === "AI" ? (
                        <Button disabled={regeneratingQuestionId === question.id} icon={RefreshCw} onClick={() => void handleRegenerate(question.id)} variant="secondary">
                          {regeneratingQuestionId === question.id ? "Substituindo..." : "Substituir questão"}
                        </Button>
                      ) : null}
                      {exam.status === "VERSIONS_GENERATED" || exam.status === "APPLIED" ? (
                        <Button
                          disabled={cancellingQuestionId === question.id}
                          icon={examQuestion.isCancelled ? RotateCcw : Ban}
                          onClick={() => void handleQuestionCancellation(question.id, examQuestion.isCancelled)}
                          variant="secondary"
                        >
                          {cancellingQuestionId === question.id ? "Atualizando..." : examQuestion.isCancelled ? "Restaurar questão" : "Anular questão"}
                        </Button>
                      ) : null}
                      {exam.status === "VERSIONS_GENERATED" || exam.status === "APPLIED" ? (
                        <Button
                          disabled={removingQuestionId === question.id}
                          icon={Trash2}
                          onClick={() => void handleQuestionRemoval(question.id)}
                          variant="danger"
                        >
                          {removingQuestionId === question.id ? "Removendo..." : "Remover desta prova"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <ol className="mt-4 space-y-2 text-sm text-slate-700" type="A">
                    {question.alternatives.map((alternative) => (
                      <li className="flex items-start gap-2 pl-1" key={alternative.id}>
                        <span><MathText text={alternative.text} /></span>
                        {alternative.correct ? (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800">Correta</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 text-sm text-slate-500">
                    Origem: <span className="font-medium text-teal-800">{question.contentIds[0] ? contentById.get(question.contentIds[0])?.title ?? "Conteúdo removido" : "Questão manual"}</span>
                  </p>
                </>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-rose-700">A questão desta prova não está disponível.</p>
                  {exam.status === "VERSIONS_GENERATED" || exam.status === "APPLIED" ? (
                    <Button
                      disabled={removingQuestionId === examQuestion.questionId}
                      icon={Trash2}
                      onClick={() => void handleQuestionRemoval(examQuestion.questionId)}
                      variant="danger"
                    >
                      {removingQuestionId === examQuestion.questionId ? "Removendo..." : "Remover desta prova"}
                    </Button>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {exam.status === "DRAFT" ? (
        <section className="flex items-center justify-between gap-4 border-t border-stone-200 pt-6">
          <p className="text-sm text-slate-500">Revise as questões e aprove a prova quando estiver pronta.</p>
          <Button disabled={isSaving} icon={Sparkles} onClick={() => void handleApprove()}>
            Aprovar prova
          </Button>
        </section>
      ) : null}
        </>
      )}
    </div>
  );
}

type RenameExamModalProps = {
  currentTitle: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
};

function RenameExamModal({ currentTitle, isSaving, onClose, onSave }: RenameExamModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError("Informe o novo nome da prova.");
      return;
    }
    try {
      await onSave(normalizedTitle);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível renomear a prova."));
    }
  }

  return (
    <ModalDialog onClose={isSaving ? () => undefined : onClose} size="lg" title="Renomear prova">
      <form onSubmit={handleSubmit}>
        <div className="px-5 py-5 sm:px-6">
          {error ? <div className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}
          <label className="block text-sm font-medium text-slate-700" htmlFor="rename-exam-title">
            Nome da prova
            <input autoFocus className="mt-2 h-11 w-full rounded-lg border border-stone-300 px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="rename-exam-title" maxLength={180} onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <p className="mt-2 text-xs leading-5 text-slate-500">As questões, versões oficiais e gabaritos não serão alterados.</p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-stone-200 px-5 py-4 sm:px-6">
          <Button disabled={isSaving} onClick={onClose} type="button" variant="secondary">Cancelar</Button>
          <Button disabled={isSaving || title.trim() === currentTitle.trim()} icon={Save} type="submit">{isSaving ? "Salvando..." : "Salvar nome"}</Button>
        </footer>
      </form>
    </ModalDialog>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function formatScore(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} pontos`;
}
