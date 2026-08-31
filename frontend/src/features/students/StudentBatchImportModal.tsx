import { CheckCircle2, FileSpreadsheet, Info, UploadCloud } from "lucide-react";
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import { ModalDialog } from "../../components/ui/ModalDialog";
import { createStudentsBatch } from "../../services/studentService";
import { ApiRequestError } from "../../services/httpClient";
import type { StudentBatchResponse, StudentInput } from "../../types/students";

type StudentBatchImportModalProps = {
  onClose: () => void;
  onSuccess: (result: StudentBatchResponse) => Promise<void> | void;
};

export function StudentBatchImportModal({ onClose, onSuccess }: StudentBatchImportModalProps) {
  const [rawText, setRawText] = useState("");
  const [defaultClassGroup, setDefaultClassGroup] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<StudentBatchResponse | null>(null);

  const parsedStudents: StudentInput[] = useMemo(() => {
    if (!rawText.trim()) {
      return [];
    }

    const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    const results: StudentInput[] = [];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const parts = parseDelimitedLine(line);
      // Skip CSV header if present
      if (index === 0 && /^nome$/i.test(parts[0] ?? "")) {
        continue;
      }

      if (parts.length >= 1 && parts[0].length > 0) {
        const name = parts[0];
        let identifier = "";
        let classGroup = defaultClassGroup;

        if (parts.length === 2) {
          // If 2 columns: if second part looks like a class or identifier
          if (defaultClassGroup) {
            identifier = parts[1];
          } else {
            classGroup = parts[1];
          }
        } else if (parts.length >= 3) {
          // Three columns follow the documented order: name, identifier, class group.
          identifier = parts[1];
          classGroup = parts[2] || defaultClassGroup;
        }

        if (name) {
          results.push({
            name,
            identifier: identifier || undefined,
            classGroup: classGroup || defaultClassGroup
          });
        }
      }
    }

    return results;
  }, [rawText, defaultClassGroup]);

  const validStudents = useMemo(() => parsedStudents.filter((s) => s.name && s.classGroup), [parsedStudents]);

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validStudents.length === 0) {
      setError("Nenhum aluno válido para importar. Verifique o texto ou informe a turma padrão.");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const result = await createStudentsBatch(validStudents);
      setImportResult(result);
      await onSuccess(result);
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível importar os alunos.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalDialog onClose={onClose} title="Importar alunos via planilha ou CSV">
      {importResult ? (
        <div className="space-y-5 px-5 py-6 sm:px-6">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="text-emerald-700" size={20} />
              Importação concluída!
            </div>
            <p className="mt-2 text-sm">
              <strong>{importResult.createdCount}</strong> alunos cadastrados com sucesso.
              {importResult.skippedCount > 0 ? (
                <> <strong>{importResult.skippedCount}</strong> registros foram ignorados (matrículas duplicadas ou dados incompletos).</>
              ) : null}
            </p>
          </div>

          {importResult.messages.length > 0 ? (
            <div className="max-h-40 overflow-y-auto rounded border border-stone-200 bg-stone-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Avisos:</p>
              <ul className="mt-1 list-disc pl-4 space-y-1">
                {importResult.messages.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end pt-2">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-5 py-6 sm:px-6">
            {error ? (
              <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {error}
              </div>
            ) : null}

            <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-3 text-xs text-teal-950 flex items-start gap-2">
              <Info className="text-teal-700 shrink-0 mt-0.5" size={16} />
              <div>
                Copie e cole a lista de alunos do Excel/Google Sheets ou envie um arquivo <code>.csv</code>.
                <div className="mt-1 text-teal-800">
                  Formato esperado: <strong>Nome, Matrícula, Turma</strong> (ou apenas <strong>Nome</strong> se preencher a turma padrão abaixo).
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Turma padrão (opcional)
                <input
                  className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                  onChange={(event) => setDefaultClassGroup(event.target.value)}
                  placeholder="Ex: 3º Ano B (aplica se omitido)"
                  value={defaultClassGroup}
                />
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Carregar arquivo .csv
                </label>
                <label className="mt-1.5 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 text-xs font-medium text-slate-700 hover:bg-stone-100">
                  <UploadCloud size={16} />
                  <span>Selecionar arquivo CSV</span>
                  <input accept=".csv,.txt" className="sr-only" onChange={handleFileUpload} type="file" />
                </label>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Cole a lista de alunos
              <textarea
                className="mt-1.5 h-36 w-full rounded-lg border border-stone-300 bg-white p-3 font-mono text-xs text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setRawText(event.target.value)}
                placeholder="Marina Alves, 2026001, 2º Ano A&#10;Carlos Silva, 2026002, 2º Ano A&#10;Beatriz Santos, 2026003, 2º Ano A"
                value={rawText}
              />
            </label>

            {parsedStudents.length > 0 ? (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>Prévia da importação ({validStudents.length} alunos prontos)</span>
                  {parsedStudents.length - validStudents.length > 0 ? (
                    <span className="text-amber-700">
                      {parsedStudents.length - validStudents.length} sem turma informada
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 max-h-36 overflow-y-auto rounded border border-stone-200 bg-white text-xs">
                  <table className="w-full text-left">
                    <thead className="border-b border-stone-100 bg-stone-50 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-2">Nome</th>
                        <th className="p-2">Matrícula</th>
                        <th className="p-2">Turma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedStudents.slice(0, 10).map((student, index) => (
                        <tr className="border-b border-stone-100 last:border-0" key={index}>
                          <td className="p-2 font-medium text-slate-900">{student.name}</td>
                          <td className="p-2 text-slate-600">{student.identifier || "-"}</td>
                          <td className="p-2">
                            {student.classGroup ? (
                              <span className="text-teal-800 font-medium">{student.classGroup}</span>
                            ) : (
                              <span className="text-rose-600 italic">Falta turma</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedStudents.length > 10 ? (
                    <div className="p-2 text-center text-xs text-slate-400">
                      ... e mais {parsedStudents.length - 10} alunos
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <footer className="flex flex-wrap justify-end gap-3 border-t border-stone-200 px-5 py-4 sm:px-6">
            <Button disabled={isSaving} onClick={onClose} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={isSaving || validStudents.length === 0}
              icon={FileSpreadsheet}
              type="submit"
            >
              {isSaving ? "Importando..." : `Importar ${validStudents.length} alunos`}
            </Button>
          </footer>
        </form>
      )}
    </ModalDialog>
  );
}

function parseDelimitedLine(line: string) {
  const delimiter = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
  const parts: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      parts.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  parts.push(value.trim());
  return parts;
}
