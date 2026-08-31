import { ClipboardCheck } from "lucide-react";

import type { Correction } from "../../types/corrections";

export function CorrectionDetails({ correction }: { correction: Correction }) {
  return (
    <section className="border border-stone-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-800">Correção selecionada</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{correction.studentName}</h2>
          <p className="mt-1 text-sm text-slate-500">{correction.examTitle} · Versão {correction.versionLabel} · {correction.classGroup || "Turma não informada"}</p>
        </div>
        <span className={correction.status === "CONFIRMED" ? "inline-flex items-center gap-2 text-sm font-semibold text-emerald-700" : "inline-flex items-center gap-2 text-sm font-semibold text-amber-700"}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {correction.status === "CONFIRMED" ? "Confirmada" : "Revisão necessária"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <ResultValue label="Nota" value={`${formatScore(correction.score)} / ${formatScore(correction.totalScore)}`} />
        <ResultValue label="Acertos" value={String(correction.correctCount)} />
        <ResultValue label="Erros" value={String(correction.wrongCount)} />
        <ResultValue label="Em branco" value={String(correction.blankCount)} />
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {correction.answers.map((answer) => (
          <li className="border border-stone-200 px-3 py-2 text-sm" key={answer.examVersionQuestionId}>
            <strong className="text-slate-950">{String(answer.questionPosition).padStart(2, "0")}</strong>
            <span className="ml-2 text-slate-500">{answer.selectedLetter || "-"} / {answer.correctLetter}</span>
            <span className={answer.cancelled ? "ml-2 font-semibold text-amber-800" : answer.correct ? "ml-2 font-semibold text-emerald-700" : answer.status === "NEEDS_REVIEW" || answer.status === "AMBIGUOUS" ? "ml-2 font-semibold text-amber-700" : answer.status === "BLANK" ? "ml-2 font-semibold text-slate-600" : "ml-2 font-semibold text-rose-700"}>
              {answer.cancelled ? "Anulada" : answer.correct ? "Certa" : answer.status === "NEEDS_REVIEW" || answer.status === "AMBIGUOUS" ? "Revisar" : answer.status === "BLANK" ? "Em branco" : "Errada"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ResultValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-200 bg-stone-50 px-3 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function formatScore(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}
