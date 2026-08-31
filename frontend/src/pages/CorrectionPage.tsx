import { CheckCircle2, ClipboardCheck, Files, ListChecks, ScanLine, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { useConfirmation } from "../components/ui/confirmationContext";
import { AnswerCardImportPanel } from "../features/corrections/AnswerCardImportPanel";
import type { AnswerCardScanResult } from "../features/corrections/answerCardScanner";
import { getExamApplications } from "../services/examApplicationService";
import { confirmCorrection, createCorrection, updateCorrection } from "../services/correctionService";
import { getExamVersions } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import { getStudents } from "../services/studentService";
import type { Correction, CorrectionInput, StudentAnswerStatus } from "../types/corrections";
import type { ExamVersion } from "../types/exams";
import type { Student } from "../types/students";

type DraftAnswer = {
  selectedAlternativeId: string | null;
  status: Exclude<StudentAnswerStatus, "CONFIRMED">;
};

export function CorrectionPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ExamVersion | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({});
  const [studentName, setStudentName] = useState("");
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [applicationVersionByStudent, setApplicationVersionByStudent] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedVersionIdRef = useRef("");

  useEffect(() => {
    let active = true;
    Promise.all([getExamVersions(), getStudents()])
      .then(([nextVersions, nextStudents]) => {
        if (active) {
          setVersions(nextVersions);
          setStudents(nextStudents);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(getErrorMessage(requestError, "Não foi possível carregar as versões disponíveis."));
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

  const answerCount = useMemo(
    () => Object.values(answers).filter((answer) => answer.status === "DETECTED").length,
    [answers]
  );

  function selectVersion(version: ExamVersion) {
    const nextAnswers = Object.fromEntries(
      version.questions.map((question) => [question.id, { selectedAlternativeId: null, status: "BLANK" as const }])
    );
    setSelectedVersion(version);
    setAnswers(nextAnswers);
    setCorrection(null);
    setError("");
    selectedVersionIdRef.current = version.id;
    setApplicationVersionByStudent({});
    void loadApplicationAssignments(version);
  }

  async function loadApplicationAssignments(version: ExamVersion) {
    try {
      const applications = await getExamApplications(version.examId);
      if (selectedVersionIdRef.current !== version.id) {
        return;
      }
      const assignments: Record<string, string> = {};
      for (const application of applications) {
        for (const student of application.students) {
          if (student.studentId && !assignments[student.studentId]) {
            assignments[student.studentId] = student.examVersionId;
          }
        }
      }
      setApplicationVersionByStudent(assignments);
    } catch {
      if (selectedVersionIdRef.current === version.id) {
        setApplicationVersionByStudent({});
      }
    }
  }

  function updateAnswer(questionId: string, selectedAlternativeId: string | null, status: DraftAnswer["status"]) {
    setAnswers((current) => ({ ...current, [questionId]: { selectedAlternativeId, status } }));
    setCorrection(null);
  }

  function selectStudent(nextStudentId: string) {
    setStudentId(nextStudentId);
    const student = students.find((item) => item.id === nextStudentId);
    if (!student) {
      return;
    }
    setStudentName(student.name);
    setStudentIdentifier(student.identifier ?? "");
    setClassGroup(student.classGroup);
    setCorrection(null);
  }

  const applyCardScan = useCallback((scan: AnswerCardScanResult) => {
    setAnswers(Object.fromEntries(scan.answers.map((answer) => [answer.questionId, {
      selectedAlternativeId: answer.selectedAlternativeId,
      status: answer.status
    }])));
    setCorrection(null);
  }, []);

  const assignedVersionId = studentId ? applicationVersionByStudent[studentId] : undefined;
  const assignedVersion = versions.find((version) => version.id === assignedVersionId);

  function buildRequest(): CorrectionInput | null {
    if (!selectedVersion) {
      setError("Identifique uma versão de prova antes de continuar.");
      return null;
    }
    if (!studentName.trim()) {
      setError("Informe o nome do aluno antes de revisar a correção.");
      return null;
    }
    return {
      examVersionId: selectedVersion.id,
      studentId: studentId || undefined,
      studentName: studentName.trim(),
      studentIdentifier: studentIdentifier.trim() || undefined,
      classGroup: classGroup.trim() || undefined,
      answers: selectedVersion.questions.map((question) => ({
        examVersionQuestionId: question.id,
        selectedAlternativeId: answers[question.id]?.selectedAlternativeId ?? null,
        status: answers[question.id]?.status ?? "BLANK"
      }))
    };
  }

  async function saveDraft() {
    const request = buildRequest();
    if (!request) {
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      setCorrection(correction ? await updateCorrection(correction.id, request) : await createCorrection(request));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível calcular a correção."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirm() {
    if (!correction || !(await confirm({
      confirmLabel: "Confirmar correção",
      description: "A nota ficará registrada no histórico e passará a aparecer nos resultados.",
      title: "Confirmar correção"
    }))) {
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      setCorrection(await confirmCorrection(correction.id));
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
          <h1 className="text-2xl font-semibold text-slate-950">Correção</h1>
          <p className="mt-1 text-sm text-slate-500">Selecione a versão, leia as bolhas preenchidas e revise a nota antes de confirmar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={Files} onClick={() => navigate("/correcao-em-lote")} variant="secondary">Correção em lote</Button>
          <Button icon={ListChecks} onClick={() => navigate("/revisar-correcoes")} variant="secondary">Revisões pendentes</Button>
        </div>
      </section>

      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}

      <section className="border-y border-stone-200 py-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800"><ScanLine aria-hidden="true" size={17} /></span>
          <div>
            <p className="text-xs font-semibold uppercase text-teal-800">Etapa 1</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Selecione a versão da prova</h2>
            <p className="mt-1 text-sm text-slate-500">A leitura inteligente usa essa versão para localizar as bolhas do cartão. Não é necessário código para leitura.</p>
          </div>
        </div>
        <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="correction-version">Versão oficial</label>
        <select
          className="mt-2 h-11 w-full max-w-xl border border-stone-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          disabled={isLoading}
          id="correction-version"
          onChange={(event) => {
            const version = versions.find((item) => item.id === event.target.value);
            if (version) {
              selectVersion(version);
            }
          }}
          value={selectedVersion?.id ?? ""}
        >
          <option value="">{isLoading ? "Carregando versões..." : "Selecione uma versão"}</option>
          {versions.map((version) => (
            <option key={version.id} value={version.id}>{version.examTitle} · Versão {version.label}</option>
          ))}
        </select>
      </section>

      {selectedVersion ? (
        <>
          <section className="grid gap-4 border-y border-stone-200 py-6 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <p className="text-xs font-semibold uppercase text-teal-800">Etapa 2 · Versão selecionada</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{selectedVersion.examTitle} · Versão {selectedVersion.label}</h2>
            </div>
            <label className="block text-sm font-medium text-slate-700 sm:col-span-3" htmlFor="correction-student">
              Aluno cadastrado
              <select className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="correction-student" onChange={(event) => selectStudent(event.target.value)} value={studentId}>
                <option value="">Preencher aluno manualmente</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.classGroup}{student.identifier ? ` · ${student.identifier}` : ""}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Nome do aluno
              <input className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => { setStudentId(""); setStudentName(event.target.value); }} value={studentName} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Turma
              <input className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => { setStudentId(""); setClassGroup(event.target.value); }} value={classGroup} />
            </label>
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Matrícula ou identificação
              <input className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => { setStudentId(""); setStudentIdentifier(event.target.value); }} value={studentIdentifier} />
            </label>
            <p className="self-end pb-1 text-sm text-slate-500">{answerCount} respostas marcadas de {selectedVersion.questions.length}</p>
          </section>

          {assignedVersion && assignedVersion.id !== selectedVersion.id ? (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">Na aplicação registrada, este aluno recebeu a versão <strong>{assignedVersion.label}</strong>. Selecione essa versão para usar o gabarito correto.</div>
          ) : null}

          <AnswerCardImportPanel key={selectedVersion.id} onImported={applyCardScan} version={selectedVersion} />

          <section>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Revisar respostas</h2>
                <p className="mt-1 text-sm text-slate-500">Use “Revisar” quando a marcação estiver ambígua ou precisar de atenção.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {selectedVersion.questions.map((question) => {
                const answer = answers[question.id];
                return (
                  <article className="border border-stone-200 bg-white p-4 shadow-panel" key={question.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Questão {question.position}</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">Selecione a alternativa marcada no cartão.</p>
                      </div>
                      <div className="flex flex-wrap gap-2" role="group" aria-label={`Resposta da questão ${question.position}`}>
                        {question.alternatives.map((alternative) => {
                          const letter = letterFor(alternative.position);
                          const selected = answer?.status === "DETECTED" && answer.selectedAlternativeId === alternative.alternativeId;
                          return (
                            <button
                              aria-pressed={selected}
                              className={selected ? "h-10 min-w-10 border border-teal-700 bg-teal-700 px-3 text-sm font-bold text-white" : "h-10 min-w-10 border border-stone-300 bg-white px-3 text-sm font-bold text-slate-700 hover:border-slate-400"}
                              key={alternative.alternativeId}
                              onClick={() => updateAnswer(question.id, alternative.alternativeId, "DETECTED")}
                              title={`Alternativa ${letter}`}
                              type="button"
                            >
                              {letter}
                            </button>
                          );
                        })}
                        <button
                          aria-pressed={answer?.status === "BLANK"}
                          className={answer?.status === "BLANK" ? "h-10 border border-slate-700 bg-slate-700 px-3 text-sm font-semibold text-white" : "h-10 border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400"}
                          onClick={() => updateAnswer(question.id, null, "BLANK")}
                          type="button"
                        >
                          Em branco
                        </button>
                        <button
                          aria-pressed={answer?.status === "NEEDS_REVIEW"}
                          className={answer?.status === "NEEDS_REVIEW" ? "h-10 border border-amber-600 bg-amber-500 px-3 text-sm font-semibold text-white" : "h-10 border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400"}
                          onClick={() => updateAnswer(question.id, null, "NEEDS_REVIEW")}
                          type="button"
                        >
                          Revisar
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">A nota é calculada com o gabarito desta versão e fica pendente de confirmação.</p>
            <Button disabled={isSaving} icon={Save} onClick={() => void saveDraft()}>
              {isSaving ? "Calculando..." : correction ? "Atualizar revisão" : "Calcular e revisar"}
            </Button>
          </section>
        </>
      ) : null}

      {correction ? <CorrectionSummary correction={correction} isSaving={isSaving} onConfirm={() => void handleConfirm()} /> : null}
    </div>
  );
}

function CorrectionSummary({ correction, isSaving, onConfirm }: { correction: Correction; isSaving: boolean; onConfirm: () => void }) {
  return (
    <section className="border border-teal-200 bg-teal-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-800">Revisão da correção</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{formatScore(correction.score)} de {formatScore(correction.totalScore)}</h2>
          <p className="mt-1 text-sm text-slate-600">{correction.correctCount} acertos · {correction.wrongCount} erros · {correction.blankCount} em branco · {correction.ambiguousCount} para revisar</p>
        </div>
        {correction.status === "NEEDS_REVIEW" ? (
          <Button disabled={isSaving} icon={CheckCircle2} onClick={onConfirm}>
            Confirmar correção
          </Button>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ClipboardCheck aria-hidden="true" size={18} /> Correção confirmada</span>
        )}
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {correction.answers.map((answer) => (
          <li className="border border-teal-100 bg-white px-3 py-2 text-sm" key={answer.examVersionQuestionId}>
            <strong className="text-slate-950">{String(answer.questionPosition).padStart(2, "0")}</strong>
            <span className="mx-2 text-slate-500">{answer.selectedLetter ?? "-"} / {answer.correctLetter}</span>
            <span className={answer.correct ? "font-semibold text-emerald-700" : answer.status === "NEEDS_REVIEW" ? "font-semibold text-amber-700" : "font-semibold text-rose-700"}>
              {answer.correct ? "Correta" : answer.status === "NEEDS_REVIEW" || answer.status === "AMBIGUOUS" ? "Revisar" : answer.status === "BLANK" ? "Em branco" : "Errada"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function formatScore(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

function letterFor(position: number) {
  return String.fromCharCode(64 + position);
}
