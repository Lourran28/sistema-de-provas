import { CalendarCheck2, CheckCircle2, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import { createExamApplication, getExamApplications } from "../../services/examApplicationService";
import { getExamVersions } from "../../services/examService";
import { ApiRequestError } from "../../services/httpClient";
import { getStudents } from "../../services/studentService";
import type { AttendanceStatus, Exam, ExamApplication, ExamApplicationInput, ExamVersion } from "../../types/exams";
import type { Student } from "../../types/students";

type AssignedStudent = {
  attendance: AttendanceStatus;
  examVersionId: string;
};

type ExamApplicationsPanelProps = {
  exam: Exam;
  onApplicationRecorded: () => void;
};

export function ExamApplicationsPanel({ exam, onApplicationRecorded }: ExamApplicationsPanelProps) {
  const [applications, setApplications] = useState<ExamApplication[]>([]);
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classGroup, setClassGroup] = useState("");
  const [assignments, setAssignments] = useState<Record<string, AssignedStudent>>({});
  const [appliedOn, setAppliedOn] = useState(today());
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [nextApplications, nextVersions, nextStudents] = await Promise.all([
        getExamApplications(exam.id),
        getExamVersions(exam.id),
        getStudents()
      ]);
      setApplications(nextApplications);
      setVersions(nextVersions);
      setStudents(nextStudents);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível carregar a aplicação da prova."));
    } finally {
      setIsLoading(false);
    }
  }, [exam.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const classGroups = useMemo(
    () => [...new Set(students.map((student) => student.classGroup))].sort((left, right) => left.localeCompare(right, "pt-BR")),
    [students]
  );
  const classStudents = useMemo(
    () => students.filter((student) => student.classGroup === classGroup),
    [classGroup, students]
  );
  const presentCount = Object.values(assignments).filter((assignment) => assignment.attendance === "PRESENT").length;

  function chooseClass(nextClassGroup: string) {
    setClassGroup(nextClassGroup);
    const defaultVersionId = versions[0]?.id ?? "";
    const nextAssignments = Object.fromEntries(
      students.filter((student) => student.classGroup === nextClassGroup)
        .map((student) => [student.id, { attendance: "PRESENT" as const, examVersionId: defaultVersionId }])
    );
    setAssignments(nextAssignments);
    setNotice("");
  }

  function updateAssignment(studentId: string, changes: Partial<AssignedStudent>) {
    setAssignments((current) => ({
      ...current,
      [studentId]: { ...current[studentId], ...changes }
    }));
    setNotice("");
  }

  async function submitApplication() {
    if (!classGroup || classStudents.length === 0) {
      setError("Selecione uma turma com alunos cadastrados.");
      return;
    }
    if (versions.length === 0 || Object.values(assignments).some((assignment) => !assignment.examVersionId)) {
      setError("Gere e selecione uma versão oficial para cada aluno.");
      return;
    }
    const input: ExamApplicationInput = {
      classGroup,
      appliedOn,
      notes: notes.trim() || undefined,
      students: classStudents.map((student) => ({
        studentId: student.id,
        examVersionId: assignments[student.id]?.examVersionId ?? "",
        attendance: assignments[student.id]?.attendance ?? "PRESENT"
      }))
    };
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const application = await createExamApplication(exam.id, input);
      setApplications((current) => [application, ...current]);
      setNotice("Aplicação registrada. A prova agora está marcada como aplicada.");
      onApplicationRecorded();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível registrar a aplicação."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="border-y border-stone-200 py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800"><CalendarCheck2 aria-hidden="true" size={18} /></span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Aplicação da prova</h2>
          <p className="mt-1 text-sm text-slate-500">Registre a turma, presenças e a versão entregue a cada aluno antes de iniciar as correções.</p>
        </div>
      </div>

      {error ? <div aria-live="polite" className="mt-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}
      {notice ? <div aria-live="polite" className="mt-5 border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900" role="status">{notice}</div> : null}

      {isLoading ? <p className="mt-5 text-sm text-slate-500">Carregando turmas e aplicações...</p> : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Turma
              <select className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => chooseClass(event.target.value)} value={classGroup}>
                <option value="">Selecione a turma</option>
                {classGroups.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Data da aplicação
              <input className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setAppliedOn(event.target.value)} type="date" value={appliedOn} />
            </label>
          </div>

          {classGroup ? (
            <>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Observações da aplicação
                <textarea className="mt-2 min-h-24 w-full border border-stone-300 bg-white px-3 py-2 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setNotes(event.target.value)} value={notes} />
              </label>
              <div className="mt-5 overflow-x-auto border border-stone-200 bg-white shadow-panel">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-4 py-3 font-semibold">Aluno</th><th className="px-4 py-3 font-semibold">Presença</th><th className="px-4 py-3 font-semibold">Versão entregue</th></tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student) => {
                      const assignment = assignments[student.id];
                      return (
                        <tr className="border-b border-stone-100 last:border-0" key={student.id}>
                          <td className="px-4 py-3 font-medium text-slate-950">{student.name}<span className="mt-1 block text-xs font-normal text-slate-500">{student.identifier || "Sem matrícula"}</span></td>
                          <td className="px-4 py-3"><label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input checked={assignment?.attendance === "PRESENT"} className="h-4 w-4 accent-teal-700" onChange={(event) => updateAssignment(student.id, { attendance: event.target.checked ? "PRESENT" : "ABSENT" })} type="checkbox" />Presente</label></td>
                          <td className="px-4 py-3"><select aria-label={`Versão entregue para ${student.name}`} className="h-10 min-w-32 border border-stone-300 bg-white px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => updateAssignment(student.id, { examVersionId: event.target.value })} value={assignment?.examVersionId ?? ""}>{versions.map((version) => <option key={version.id} value={version.id}>Versão {version.label}</option>)}</select></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <section className="mt-5 flex flex-col gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">{presentCount} presentes de {classStudents.length} alunos. A distribuição fica guardada no histórico.</p>
                <Button disabled={isSaving || classStudents.length === 0} icon={CheckCircle2} onClick={() => void submitApplication()}>{isSaving ? "Registrando..." : "Registrar aplicação"}</Button>
              </section>
            </>
          ) : null}

          <ApplicationHistory applications={applications} />
        </>
      )}
    </section>
  );
}

function ApplicationHistory({ applications }: { applications: ExamApplication[] }) {
  if (applications.length === 0) {
    return <p className="mt-6 text-sm text-slate-500">Nenhuma aplicação foi registrada para esta prova.</p>;
  }
  return (
    <section className="mt-7 border-t border-stone-200 pt-6">
      <div className="flex items-center gap-2"><ClipboardList aria-hidden="true" className="text-teal-800" size={18} /><h3 className="text-base font-semibold text-slate-950">Histórico de aplicações</h3></div>
      <div className="mt-4 overflow-x-auto border border-stone-200 bg-white shadow-panel">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3 font-semibold">Data</th><th className="px-4 py-3 font-semibold">Turma</th><th className="px-4 py-3 font-semibold">Presentes</th><th className="px-4 py-3 font-semibold">Ausentes</th><th className="px-4 py-3 font-semibold">Observações</th></tr></thead>
          <tbody>{applications.map((application) => {
            const present = application.students.filter((student) => student.attendance === "PRESENT").length;
            return <tr className="border-b border-stone-100 last:border-0" key={application.id}><td className="px-4 py-3 font-medium text-slate-950">{formatDate(application.appliedOn)}</td><td className="px-4 py-3 text-slate-700">{application.classGroup}</td><td className="px-4 py-3 font-semibold text-emerald-700">{present}</td><td className="px-4 py-3 text-slate-700">{application.students.length - present}</td><td className="max-w-xs px-4 py-3 text-slate-600">{application.notes || "-"}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}
