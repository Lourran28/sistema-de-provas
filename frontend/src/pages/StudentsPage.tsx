import { FileSpreadsheet, Pencil, Plus, Search, Trash2, UsersRound, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirmation } from "../components/ui/confirmationContext";
import { StudentBatchImportModal } from "../features/students/StudentBatchImportModal";
import { StudentFormModal } from "../features/students/StudentFormModal";
import { deleteStudent, getStudents, createStudent, updateStudent } from "../services/studentService";
import { ApiRequestError } from "../services/httpClient";
import type { Student, StudentFilters, StudentInput } from "../types/students";

export function StudentsPage() {
  const { confirm } = useConfirmation();
  const [students, setStudents] = useState<Student[]>([]);
  const [filters, setFilters] = useState<StudentFilters>({});
  const [search, setSearch] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setStudents(await getStudents(filters));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível carregar os alunos."));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStudents(), 0);
    return () => window.clearTimeout(timer);
  }, [loadStudents]);

  const classGroups = useMemo(() => [...new Set(students.map((student) => student.classGroup))].sort((left, right) => left.localeCompare(right, "pt-BR")), [students]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ search: search.trim() || undefined, classGroup: classGroup || undefined });
  }

  function clearFilters() {
    setSearch("");
    setClassGroup("");
    setFilters({});
  }

  function openNewStudent() {
    setEditingStudent(undefined);
    setIsModalOpen(true);
  }

  function openEditStudent(student: Student) {
    setEditingStudent(student);
    setIsModalOpen(true);
  }

  async function saveStudent(input: StudentInput) {
    if (editingStudent) {
      await updateStudent(editingStudent.id, input);
    } else {
      await createStudent(input);
    }
    await loadStudents();
  }

  async function removeStudent(student: Student) {
    if (!(await confirm({
      confirmLabel: "Excluir aluno",
      description: `Excluir ${student.name} do cadastro de alunos? As correções já registradas permanecerão no histórico.`,
      title: "Excluir aluno",
      variant: "danger"
    }))) {
      return;
    }
    try {
      await deleteStudent(student.id);
      await loadStudents();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível excluir o aluno."));
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Alunos e turmas</h1>
          <p className="mt-1 text-sm text-slate-500">Cadastre sua turma uma vez e selecione o aluno durante a correção.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={FileSpreadsheet} onClick={() => setIsBatchModalOpen(true)} variant="secondary">
            Importar planilha
          </Button>
          <Button icon={Plus} onClick={openNewStudent}>Novo aluno</Button>
        </div>
      </section>

      <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto_auto]" onSubmit={applyFilters}>
        <label className="relative block">
          <span className="sr-only">Buscar aluno</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
          <input className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou matrícula" type="search" value={search} />
        </label>
        <select aria-label="Filtrar por turma" className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" onChange={(event) => setClassGroup(event.target.value)} value={classGroup}>
          <option value="">Todas as turmas</option>
          {classGroups.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <Button type="submit" variant="secondary">Aplicar</Button>
        <Button aria-label="Limpar filtros" className="h-11 w-11 px-0" icon={X} onClick={clearFilters} title="Limpar filtros" type="button" variant="ghost" />
      </form>

      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}

      <StudentsTable isLoading={isLoading} onEdit={openEditStudent} onRemove={(student) => void removeStudent(student)} students={students} />

      {isModalOpen ? <StudentFormModal onClose={() => setIsModalOpen(false)} onSave={saveStudent} student={editingStudent} /> : null}
      {isBatchModalOpen ? (
        <StudentBatchImportModal
          onClose={() => setIsBatchModalOpen(false)}
          onSuccess={async () => {
            await loadStudents();
          }}
        />
      ) : null}
    </div>
  );
}

type StudentsTableProps = {
  isLoading: boolean;
  onEdit: (student: Student) => void;
  onRemove: (student: Student) => void;
  students: Student[];
};

function StudentsTable({ isLoading, onEdit, onRemove, students }: StudentsTableProps) {
  if (isLoading) {
    return <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando alunos...</Card>;
  }
  if (students.length === 0) {
    return (
      <Card className="px-6 py-12 text-center">
        <UsersRound aria-hidden="true" className="mx-auto text-teal-800" size={24} />
        <h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhum aluno encontrado</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Cadastre os alunos da turma para selecioná-los rapidamente durante a correção.</p>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-slate-500">
            <tr><th className="px-5 py-3">Aluno</th><th className="px-5 py-3">Turma</th><th className="px-5 py-3">Matrícula</th><th className="w-28 px-5 py-3 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {students.map((student) => <StudentRow key={student.id} onEdit={onEdit} onRemove={onRemove} student={student} />)}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-stone-200 md:hidden">
        {students.map((student) => (
          <article className="flex items-start justify-between gap-3 px-4 py-4" key={student.id}>
            <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-slate-900">{student.name}</h2><p className="mt-1 text-sm text-slate-500">{student.classGroup}{student.identifier ? ` · ${student.identifier}` : ""}</p></div>
            <StudentActions onEdit={onEdit} onRemove={onRemove} student={student} />
          </article>
        ))}
      </div>
    </Card>
  );
}

function StudentRow({ student, onEdit, onRemove }: Omit<StudentsTableProps, "isLoading" | "students"> & { student: Student }) {
  return (
    <tr className="text-sm text-slate-700">
      <td className="px-5 py-4 font-semibold text-slate-900">{student.name}</td>
      <td className="px-5 py-4">{student.classGroup}</td>
      <td className="px-5 py-4 text-slate-600">{student.identifier ?? "-"}</td>
      <td className="px-5 py-4"><StudentActions onEdit={onEdit} onRemove={onRemove} student={student} /></td>
    </tr>
  );
}

function StudentActions({ student, onEdit, onRemove }: Omit<StudentsTableProps, "isLoading" | "students"> & { student: Student }) {
  return (
    <div className="flex justify-end gap-1">
      <Button aria-label={`Editar ${student.name}`} className="h-9 w-9 px-0" icon={Pencil} onClick={() => onEdit(student)} title="Editar aluno" variant="ghost" />
      <Button aria-label={`Excluir ${student.name}`} className="h-9 w-9 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800" icon={Trash2} onClick={() => onRemove(student)} title="Excluir aluno" variant="ghost" />
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}
