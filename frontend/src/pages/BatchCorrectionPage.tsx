import { ArrowLeft, CheckCircle2, Files, ImageUp, RefreshCw, Save, Trash2, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirmation } from "../components/ui/confirmationContext";
import { scanAnswerCard, type AnswerCardScanResult } from "../features/corrections/answerCardScanner";
import { getExamApplications } from "../services/examApplicationService";
import { createCorrection } from "../services/correctionService";
import { getExamVersions } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import { getStudents } from "../services/studentService";
import type { CorrectionInput } from "../types/corrections";
import type { ExamVersion } from "../types/exams";
import type { Student } from "../types/students";

const MAX_BATCH_FILES = 30;

type BatchItemStatus = "ERROR" | "QUEUED" | "READY" | "SAVED" | "SAVING" | "SAVE_ERROR" | "SCANNING";

type BatchItem = {
  error?: string;
  file: File;
  id: string;
  scan?: AnswerCardScanResult;
  status: BatchItemStatus;
  studentId: string;
};

export function BatchCorrectionPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ExamVersion | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [applicationVersionByStudent, setApplicationVersionByStudent] = useState<Record<string, string>>({});
  const [classFilter, setClassFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedVersionRequestRef = useRef("");

  useEffect(() => {
    let active = true;
    Promise.all([getExamVersions(), getStudents()])
      .then(([nextVersions, nextStudents]) => {
        if (!active) {
          return;
        }
        setVersions(nextVersions);
        setStudents(nextStudents);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(getErrorMessage(requestError, "Não foi possível carregar as versões e os alunos."));
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

  const classGroups = useMemo(
    () => [...new Set(students.map((student) => student.classGroup))].sort((left, right) => left.localeCompare(right, "pt-BR")),
    [students]
  );
  const visibleStudents = useMemo(
    () => students.filter((student) => classFilter === "ALL" || student.classGroup === classFilter),
    [classFilter, students]
  );
  const readyItems = items.filter((item) => item.status === "READY" || item.status === "SAVE_ERROR");
  const savedCount = items.filter((item) => item.status === "SAVED").length;
  const reviewCount = items.reduce((total, item) => total + (item.scan?.reviewCount ?? 0), 0);

  async function selectVersion(versionId: string) {
    const version = versions.find((item) => item.id === versionId) ?? null;
    if (!version) {
      setSelectedVersion(null);
      selectedVersionRequestRef.current = "";
      return;
    }
    if (items.length > 0 && !(await confirm({
      confirmLabel: "Trocar versão",
      description: "As imagens já analisadas deste lote serão removidas. Nenhuma correção salva será alterada.",
      title: "Trocar versão da prova",
      variant: "danger"
    }))) {
      return;
    }
    setSelectedVersion(version);
    selectedVersionRequestRef.current = version.id;
    setItems([]);
    setApplicationVersionByStudent({});
    setError("");
    setNotice("");
    try {
      const applications = await getExamApplications(version.examId);
      if (selectedVersionRequestRef.current !== version.id) {
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
      if (selectedVersionRequestRef.current === version.id) {
        setApplicationVersionByStudent({});
      }
    }
  }

  function addFiles(fileList: FileList | null) {
    if (!selectedVersion || !fileList) {
      return;
    }
    const incoming = Array.from(fileList);
    const availableSlots = MAX_BATCH_FILES - items.length;
    if (availableSlots <= 0) {
      setError(`Cada lote aceita até ${MAX_BATCH_FILES} cartões.`);
      return;
    }
    const accepted = incoming.slice(0, availableSlots);
    if (accepted.length < incoming.length) {
      setError(`Foram adicionados ${accepted.length} cartões. O limite por lote é ${MAX_BATCH_FILES}.`);
    } else {
      setError("");
    }
    const nextItems = accepted.map((file) => ({
      file,
      id: crypto.randomUUID(),
      status: "QUEUED" as const,
      studentId: ""
    }));
    setItems((current) => [...current, ...nextItems]);
    void scanItems(nextItems, selectedVersion);
  }

  async function scanItems(nextItems: BatchItem[], version: ExamVersion) {
    setIsScanning(true);
    setNotice("");
    for (const item of nextItems) {
      setItems((current) => updateItem(current, item.id, { error: undefined, status: "SCANNING" }));
      try {
        const scan = await scanAnswerCard(item.file, version);
        setItems((current) => updateItem(current, item.id, { scan, status: "READY" }));
      } catch (scanError) {
        setItems((current) => updateItem(current, item.id, {
          error: scanError instanceof Error ? scanError.message : "Não foi possível ler este cartão.",
          status: "ERROR"
        }));
      }
    }
    setIsScanning(false);
  }

  function retryScan(item: BatchItem) {
    if (!selectedVersion) {
      return;
    }
    void scanItems([item], selectedVersion);
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId));
    setNotice("");
  }

  function assignStudent(itemId: string, studentId: string) {
    setItems((current) => updateItem(current, itemId, { studentId }));
    setNotice("");
  }

  async function saveBatch() {
    if (!selectedVersion || readyItems.length === 0) {
      setError("Analise pelo menos um cartão antes de enviar o lote para revisão.");
      return;
    }
    const itemsWithoutStudent = readyItems.filter((item) => !item.studentId);
    if (itemsWithoutStudent.length > 0) {
      setError(`Associe um aluno aos ${itemsWithoutStudent.length} cartão(ões) antes de salvar.`);
      return;
    }
    const duplicatedStudent = findDuplicatedStudent(readyItems);
    if (duplicatedStudent) {
      const student = students.find((item) => item.id === duplicatedStudent);
      setError(`${student?.name || "Este aluno"} foi associado a mais de um cartão no mesmo lote.`);
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");
    let savedInThisRun = 0;
    let failedInThisRun = 0;
    for (const item of readyItems) {
      const student = students.find((candidate) => candidate.id === item.studentId);
      if (!student || !item.scan) {
        continue;
      }
      setItems((current) => updateItem(current, item.id, { error: undefined, status: "SAVING" }));
      try {
        await createCorrection(buildCorrectionRequest(selectedVersion, student, item.scan));
        savedInThisRun += 1;
        setItems((current) => updateItem(current, item.id, { status: "SAVED" }));
      } catch (requestError) {
        failedInThisRun += 1;
        setItems((current) => updateItem(current, item.id, {
          error: getErrorMessage(requestError, "Não foi possível salvar este cartão."),
          status: "SAVE_ERROR"
        }));
      }
    }
    setIsSaving(false);
    if (savedInThisRun > 0) {
      setNotice(`${savedInThisRun} correção(ões) foram enviadas para a fila de revisão.`);
    }
    if (failedInThisRun > 0) {
      setError(`${failedInThisRun} cartão(ões) não foram salvos. Corrija o problema e tente novamente.`);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-800">Correção</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Correção em lote</h1>
          <p className="mt-1 text-sm text-slate-500">Leia os cartões de uma mesma versão, associe cada imagem a um aluno e envie tudo para a revisão humana.</p>
        </div>
        <Button icon={ArrowLeft} onClick={() => navigate("/correcao")} variant="secondary">Correção individual</Button>
      </section>

      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}
      {notice ? <div aria-live="polite" className="border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900" role="status">{notice}</div> : null}

      <section className="grid gap-5 border-y border-stone-200 py-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <label className="block text-sm font-medium text-slate-700" htmlFor="batch-version">
          Versão oficial
          <select className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" disabled={isLoading || isScanning || isSaving} id="batch-version" onChange={(event) => void selectVersion(event.target.value)} value={selectedVersion?.id ?? ""}>
            <option value="">{isLoading ? "Carregando versões..." : "Selecione uma versão"}</option>
            {versions.map((version) => <option key={version.id} value={version.id}>{version.examTitle} · Versão {version.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="batch-class">
          Turma para associar
          <select className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" disabled={isLoading || isSaving} id="batch-class" onChange={(event) => setClassFilter(event.target.value)} value={classFilter}>
            <option value="ALL">Todas as turmas</option>
            {classGroups.map((classGroup) => <option key={classGroup} value={classGroup}>{classGroup}</option>)}
          </select>
        </label>
      </section>

      {selectedVersion ? (
        <>
          {students.length === 0 ? (
            <section className="border border-amber-200 bg-amber-50 px-5 py-5">
              <div className="flex items-start gap-3"><UsersRound aria-hidden="true" className="mt-0.5 text-amber-700" size={20} /><div><h2 className="text-base font-semibold text-amber-950">Cadastre os alunos antes de iniciar o lote</h2><p className="mt-1 text-sm text-amber-900">A correção em lote associa cada cartão a um aluno cadastrado para proteger o histórico.</p><Button className="mt-4" onClick={() => navigate("/alunos")} variant="secondary">Cadastrar alunos</Button></div></div>
            </section>
          ) : (
            <>
              <section className="flex flex-col gap-4 border-y border-stone-200 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-teal-800">Versão selecionada</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">{selectedVersion.examTitle} · Versão {selectedVersion.label}</h2>
                  <p className="mt-1 text-sm text-slate-500">Envie até {MAX_BATCH_FILES} fotos. O sistema lê uma por vez e não confirma nenhuma nota sozinho.</p>
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800">
                  <ImageUp aria-hidden="true" size={18} />
                  {isScanning ? "Analisando cartões..." : "Adicionar cartões"}
                  <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isScanning || isSaving} multiple onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} type="file" />
                </label>
              </section>

              {items.length === 0 ? (
                <Card className="px-6 py-12 text-center">
                  <Files aria-hidden="true" className="mx-auto text-teal-800" size={26} />
                  <h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhum cartão neste lote</h2>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Adicione as fotos dos cartões-resposta dessa versão para iniciar a leitura.</p>
                </Card>
              ) : (
                <>
                  <section className="grid gap-3 sm:grid-cols-3">
                    <BatchMetric label="Cartões no lote" value={String(items.length)} />
                    <BatchMetric label="Marcações para revisar" tone="amber" value={String(reviewCount)} />
                    <BatchMetric label="Enviados para revisão" tone="emerald" value={String(savedCount)} />
                  </section>
                  <section className="divide-y divide-stone-200 border border-stone-200 bg-white shadow-panel">
                    {items.map((item) => <BatchItemRow applicationVersionByStudent={applicationVersionByStudent} item={item} key={item.id} onAssign={assignStudent} onRemove={removeItem} onRetry={() => retryScan(item)} selectedVersion={selectedVersion} students={visibleStudents} usedStudentIds={items.filter((candidate) => candidate.id !== item.id && candidate.status !== "SAVED").map((candidate) => candidate.studentId)} versions={versions} />)}
                  </section>
                  <section className="flex flex-col gap-4 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">As correções salvas vão para a fila de revisão; as notas só entram nos resultados depois da sua confirmação.</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {savedCount > 0 ? <Button onClick={() => navigate("/revisar-correcoes")} variant="secondary">Abrir revisões</Button> : null}
                      <Button disabled={isScanning || isSaving || readyItems.length === 0} icon={Save} onClick={() => void saveBatch()}>{isSaving ? "Salvando lote..." : `Enviar ${readyItems.length} para revisão`}</Button>
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

function BatchItemRow({ applicationVersionByStudent, item, onAssign, onRemove, onRetry, selectedVersion, students, usedStudentIds, versions }: { applicationVersionByStudent: Record<string, string>; item: BatchItem; onAssign: (itemId: string, studentId: string) => void; onRemove: (itemId: string) => void; onRetry: () => void; selectedVersion: ExamVersion; students: Student[]; usedStudentIds: string[]; versions: ExamVersion[] }) {
  const isLocked = item.status === "SAVED" || item.status === "SAVING";
  const status = batchStatus(item.status);
  return (
    <article className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(18rem,1.2fr)_auto] lg:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{item.file.name}</p>
        <p className="mt-1 text-xs text-slate-500">{formatFileSize(item.file.size)}</p>
        <p className={`mt-2 text-sm font-semibold ${status.className}`}>{status.label}</p>
        {item.error ? <p className="mt-2 text-sm text-rose-700">{item.error}</p> : null}
      </div>
      {item.scan ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm font-medium text-slate-700">
            Aluno
            <select className="mt-2 h-10 w-full border border-stone-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" disabled={isLocked} onChange={(event) => onAssign(item.id, event.target.value)} value={item.studentId}>
              <option value="">Selecione o aluno</option>
              {students.map((student) => {
                const assignedVersionId = applicationVersionByStudent[student.id];
                const assignedVersion = versions.find((version) => version.id === assignedVersionId);
                const receivedAnotherVersion = Boolean(assignedVersionId && assignedVersionId !== selectedVersion.id);
                return <option disabled={student.id !== item.studentId && (usedStudentIds.includes(student.id) || receivedAnotherVersion)} key={student.id} value={student.id}>{student.name} · {student.classGroup}{assignedVersion ? ` · recebeu ${assignedVersion.label}` : ""}</option>;
              })}
            </select>
          </label>
          <p className="pb-1 text-sm text-slate-500"><strong className="text-emerald-700">{item.scan.detectedCount}</strong> marcadas · <strong className="text-amber-700">{item.scan.reviewCount}</strong> revisar</p>
        </div>
      ) : <p className="text-sm text-slate-500">A leitura aparecerá assim que a imagem for analisada.</p>}
      <div className="flex gap-1 lg:justify-end">
        {item.status === "ERROR" ? <Button icon={RefreshCw} onClick={onRetry} title="Tentar ler novamente" variant="ghost">Tentar de novo</Button> : null}
        {item.status !== "SAVING" && item.status !== "SAVED" ? <Button aria-label={`Remover ${item.file.name}`} className="h-10 w-10 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800" icon={Trash2} onClick={() => onRemove(item.id)} title="Remover cartão" variant="ghost" /> : null}
        {item.status === "SAVED" ? <CheckCircle2 aria-label="Enviado para revisão" className="text-emerald-700" size={20} /> : null}
      </div>
    </article>
  );
}

function BatchMetric({ label, tone = "teal", value }: { label: string; tone?: "amber" | "emerald" | "teal"; value: string }) {
  const valueClass = tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : "text-teal-800";
  return <article className="border border-stone-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p></article>;
}

function updateItem(items: BatchItem[], itemId: string, changes: Partial<BatchItem>) {
  return items.map((item) => item.id === itemId ? { ...item, ...changes } : item);
}

function buildCorrectionRequest(version: ExamVersion, student: Student, scan: AnswerCardScanResult): CorrectionInput {
  return {
    examVersionId: version.id,
    studentId: student.id,
    studentName: student.name,
    studentIdentifier: student.identifier || undefined,
    classGroup: student.classGroup,
    answers: version.questions.map((question) => {
      const answer = scan.answers.find((item) => item.questionId === question.id);
      return {
        examVersionQuestionId: question.id,
        selectedAlternativeId: answer?.selectedAlternativeId ?? null,
        status: answer?.status ?? "BLANK"
      };
    })
  };
}

function findDuplicatedStudent(items: BatchItem[]) {
  const assignedStudents = new Set<string>();
  for (const item of items) {
    if (assignedStudents.has(item.studentId)) {
      return item.studentId;
    }
    assignedStudents.add(item.studentId);
  }
  return null;
}

function batchStatus(status: BatchItemStatus) {
  return {
    ERROR: { className: "text-rose-700", label: "Leitura não concluída" },
    QUEUED: { className: "text-slate-600", label: "Aguardando leitura" },
    READY: { className: "text-teal-800", label: "Pronto para revisão" },
    SAVED: { className: "text-emerald-700", label: "Enviado para revisão" },
    SAVING: { className: "text-teal-800", label: "Salvando correção..." },
    SAVE_ERROR: { className: "text-rose-700", label: "Não foi possível salvar" },
    SCANNING: { className: "text-teal-800", label: "Analisando bolhas..." }
  }[status];
}

function formatFileSize(bytes: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / 1_000_000) + " MB";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}
