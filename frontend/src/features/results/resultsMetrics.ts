import type { Correction } from "../../types/corrections";

export type CorrectionFilters = {
  classGroup: string;
  status: "ALL" | "CONFIRMED" | "NEEDS_REVIEW";
  studentQuery: string;
  versionId: string;
};

export type ResultsSummary = {
  averagePercentage: number | null;
  averageScore: number | null;
  confirmedCount: number;
  pendingCount: number;
};

export type QuestionPerformance = {
  correctCount: number;
  incorrectCount: number;
  position: number;
  reviewedCount: number;
  successRate: number | null;
};

export type ClassPerformance = {
  averagePercentage: number;
  averageScore: number;
  classGroup: string;
  confirmedCount: number;
};

export type StudentPerformance = {
  averagePercentage: number;
  averageScore: number;
  classGroup: string;
  confirmedCount: number;
  id: string;
  name: string;
  studentIdentifier: string | null;
};

export type StudentReport = StudentPerformance & {
  corrections: Correction[];
};

export const allFilters: CorrectionFilters = {
  classGroup: "ALL",
  status: "ALL",
  studentQuery: "",
  versionId: "ALL"
};

export function filterCorrections(corrections: Correction[], filters: CorrectionFilters) {
  return corrections.filter((correction) => (
    (filters.status === "ALL" || correction.status === filters.status)
    && (filters.versionId === "ALL" || correction.examVersionId === filters.versionId)
    && (filters.classGroup === "ALL" || (correction.classGroup || "Sem turma") === filters.classGroup)
    && matchesStudentQuery(correction, filters.studentQuery)
  ));
}

export function summarizeCorrections(corrections: Correction[]): ResultsSummary {
  const confirmed = corrections.filter((correction) => correction.status === "CONFIRMED");
  const pendingCount = corrections.filter((correction) => correction.status === "NEEDS_REVIEW").length;
  if (confirmed.length === 0) {
    return { averagePercentage: null, averageScore: null, confirmedCount: 0, pendingCount };
  }
  return {
    averagePercentage: confirmed.reduce((total, correction) => total + (correction.totalScore ? correction.score / correction.totalScore : 0), 0) / confirmed.length * 100,
    averageScore: confirmed.reduce((total, correction) => total + correction.score, 0) / confirmed.length,
    confirmedCount: confirmed.length,
    pendingCount
  };
}

export function getQuestionPerformance(corrections: Correction[], versionId: string): QuestionPerformance[] {
  if (versionId === "ALL") {
    return [];
  }
  const byPosition = new Map<number, { correctCount: number; incorrectCount: number; reviewedCount: number }>();
  for (const correction of corrections) {
    if (correction.status !== "CONFIRMED" || correction.examVersionId !== versionId) {
      continue;
    }
    for (const answer of correction.answers) {
      const current = byPosition.get(answer.questionPosition) ?? { correctCount: 0, incorrectCount: 0, reviewedCount: 0 };
      if (answer.correct === true) {
        current.correctCount += 1;
      } else if (answer.correct === false) {
        current.incorrectCount += 1;
      } else {
        current.reviewedCount += 1;
      }
      byPosition.set(answer.questionPosition, current);
    }
  }
  return [...byPosition.entries()]
    .map(([position, result]) => {
      const evaluated = result.correctCount + result.incorrectCount;
      return {
        position,
        ...result,
        successRate: evaluated ? result.correctCount / evaluated * 100 : null
      };
    })
    .sort((left, right) => (left.successRate ?? 101) - (right.successRate ?? 101) || left.position - right.position);
}

export function getClassPerformance(corrections: Correction[]): ClassPerformance[] {
  const groups = new Map<string, Correction[]>();
  for (const correction of confirmedCorrections(corrections)) {
    const classGroup = correction.classGroup || "Sem turma";
    groups.set(classGroup, [...(groups.get(classGroup) ?? []), correction]);
  }
  return [...groups.entries()]
    .map(([classGroup, groupCorrections]) => ({
      classGroup,
      ...summarizePerformance(groupCorrections)
    }))
    .sort((left, right) => left.averagePercentage - right.averagePercentage || left.classGroup.localeCompare(right.classGroup, "pt-BR"));
}

export function getStudentPerformance(corrections: Correction[]): StudentPerformance[] {
  return getStudentReports(corrections)
    .map(({ corrections: _corrections, ...student }) => student)
    .sort((left, right) => left.averagePercentage - right.averagePercentage || left.name.localeCompare(right.name, "pt-BR"));
}

export function getStudentReports(corrections: Correction[]): StudentReport[] {
  const groups = new Map<string, Correction[]>();
  for (const correction of confirmedCorrections(corrections)) {
    const key = studentKey(correction);
    groups.set(key, [...(groups.get(key) ?? []), correction]);
  }
  return [...groups.entries()]
    .map(([id, studentCorrections]) => {
      const history = [...studentCorrections].sort((left, right) => correctionDate(right).localeCompare(correctionDate(left)));
      const latestCorrection = history[0];
      return {
        id,
        name: latestCorrection.studentName,
        studentIdentifier: latestCorrection.studentIdentifier,
        classGroup: latestCorrection.classGroup || "Sem turma",
        ...summarizePerformance(history),
        corrections: history
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR") || left.classGroup.localeCompare(right.classGroup, "pt-BR"));
}

export function downloadCorrectionsCsv(corrections: Correction[]) {
  const rows = [
    ["Aluno", "Matrícula", "Turma", "Prova", "Versão", "Acertos", "Erros", "Em branco", "Nota", "Valor total", "Status", "Data da correção"],
    ...corrections.map((correction) => [
      correction.studentName,
      correction.studentIdentifier || "",
      correction.classGroup || "",
      correction.examTitle,
      correction.versionLabel,
      String(correction.correctCount),
      String(correction.wrongCount),
      String(correction.blankCount),
      String(correction.score).replace(".", ","),
      String(correction.totalScore).replace(".", ","),
      correction.status === "CONFIRMED" ? "Confirmada" : "Revisão necessária",
      formatCsvDate(correction.reviewedAt || correction.createdAt)
    ])
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "resultados-das-provas.csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function formatCsvDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function confirmedCorrections(corrections: Correction[]) {
  return corrections.filter((correction) => correction.status === "CONFIRMED");
}

function summarizePerformance(corrections: Correction[]) {
  return {
    confirmedCount: corrections.length,
    averageScore: corrections.reduce((total, correction) => total + correction.score, 0) / corrections.length,
    averagePercentage: corrections.reduce((total, correction) => total + percentageForCorrection(correction), 0) / corrections.length
  };
}

function matchesStudentQuery(correction: Correction, query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }
  return [correction.studentName, correction.studentIdentifier || "", correction.classGroup || ""]
    .some((value) => normalizeSearchValue(value).includes(normalizedQuery));
}

function percentageForCorrection(correction: Correction) {
  return correction.totalScore ? correction.score / correction.totalScore * 100 : 0;
}

function studentKey(correction: Correction) {
  return correction.studentId
    ? `student:${correction.studentId}`
    : `manual:${normalizeSearchValue(correction.studentName)}:${normalizeSearchValue(correction.studentIdentifier || "")}:${normalizeSearchValue(correction.classGroup || "")}`;
}

function correctionDate(correction: Correction) {
  return correction.reviewedAt || correction.createdAt;
}

function normalizeSearchValue(value: string) {
  return value.normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}
