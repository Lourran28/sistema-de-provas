import type { Correction } from "../../types/corrections";

export type CorrectionFilters = {
  classGroup: string;
  status: "ALL" | "CONFIRMED" | "NEEDS_REVIEW";
  versionId: string;
};

export type ResultsSummary = {
  averagePercentage: number | null;
  classCount: number;
  confirmedCount: number;
  improvingClassCount: number;
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
  bestPercentage: number;
  blankCount: number;
  classGroup: string;
  confirmedCount: number;
  correctCount: number;
  corrections: Correction[];
  pendingCount: number;
  trend: "DOWN" | "STABLE" | "UP";
  trendPercentage: number;
  wrongCount: number;
};

export const allFilters: CorrectionFilters = { classGroup: "ALL", status: "ALL", versionId: "ALL" };

export function filterCorrections(corrections: Correction[], filters: CorrectionFilters) {
  return corrections.filter((correction) => (
    (filters.status === "ALL" || correction.status === filters.status)
    && (filters.versionId === "ALL" || correction.examVersionId === filters.versionId)
    && (filters.classGroup === "ALL" || className(correction) === filters.classGroup)
  ));
}

export function summarizeCorrections(corrections: Correction[]): ResultsSummary {
  const classes = getClassPerformance(corrections);
  const confirmed = corrections.filter((correction) => correction.status === "CONFIRMED");
  return {
    averagePercentage: confirmed.length ? average(confirmed.map(percentageForCorrection)) : null,
    classCount: new Set(corrections.map(className)).size,
    confirmedCount: confirmed.length,
    improvingClassCount: classes.filter((item) => item.trend === "UP").length,
    pendingCount: corrections.filter((correction) => correction.status === "NEEDS_REVIEW").length
  };
}

export function getQuestionPerformance(corrections: Correction[], versionId: string): QuestionPerformance[] {
  if (versionId === "ALL") return [];
  const byPosition = new Map<number, { correctCount: number; incorrectCount: number; reviewedCount: number }>();
  for (const correction of corrections) {
    if (correction.status !== "CONFIRMED" || correction.examVersionId !== versionId) continue;
    for (const answer of correction.answers) {
      const current = byPosition.get(answer.questionPosition) ?? { correctCount: 0, incorrectCount: 0, reviewedCount: 0 };
      if (answer.correct === true) current.correctCount += 1;
      else if (answer.correct === false) current.incorrectCount += 1;
      else current.reviewedCount += 1;
      byPosition.set(answer.questionPosition, current);
    }
  }
  return [...byPosition.entries()].map(([position, result]) => {
    const evaluated = result.correctCount + result.incorrectCount;
    return { position, ...result, successRate: evaluated ? result.correctCount / evaluated * 100 : null };
  }).sort((left, right) => (left.successRate ?? 101) - (right.successRate ?? 101) || left.position - right.position);
}

export function getClassPerformance(corrections: Correction[]): ClassPerformance[] {
  const groups = new Map<string, Correction[]>();
  for (const correction of corrections) {
    const name = className(correction);
    groups.set(name, [...(groups.get(name) ?? []), correction]);
  }
  return [...groups.entries()].map(([classGroup, allCorrections]) => {
    const confirmed = allCorrections.filter((item) => item.status === "CONFIRMED").sort((a, b) => correctionDate(a).localeCompare(correctionDate(b)));
    const percentages = confirmed.map(percentageForCorrection);
    const split = Math.max(1, Math.floor(percentages.length / 2));
    const earlier = percentages.slice(0, split);
    const recent = percentages.slice(split);
    const trendPercentage = recent.length ? average(recent) - average(earlier) : 0;
    const trend: ClassPerformance["trend"] = trendPercentage > 1 ? "UP" : trendPercentage < -1 ? "DOWN" : "STABLE";
    return {
      averagePercentage: percentages.length ? average(percentages) : 0,
      averageScore: confirmed.length ? average(confirmed.map((item) => item.score)) : 0,
      bestPercentage: percentages.length ? Math.max(...percentages) : 0,
      blankCount: confirmed.reduce((sum, item) => sum + item.blankCount, 0),
      classGroup,
      confirmedCount: confirmed.length,
      correctCount: confirmed.reduce((sum, item) => sum + item.correctCount, 0),
      corrections: [...confirmed].reverse(),
      pendingCount: allCorrections.filter((item) => item.status === "NEEDS_REVIEW").length,
      trend,
      trendPercentage,
      wrongCount: confirmed.reduce((sum, item) => sum + item.wrongCount, 0)
    };
  }).sort((left, right) => right.averagePercentage - left.averagePercentage || left.classGroup.localeCompare(right.classGroup, "pt-BR"));
}

export function downloadClassPerformanceCsv(corrections: Correction[]) {
  const rows = [
    ["Turma", "Correções confirmadas", "Pendentes", "Média", "Aproveitamento", "Melhor resultado", "Acertos", "Erros", "Em branco", "Variação"],
    ...getClassPerformance(corrections).map((item) => [item.classGroup, String(item.confirmedCount), String(item.pendingCount), decimal(item.averageScore), decimal(item.averagePercentage), decimal(item.bestPercentage), String(item.correctCount), String(item.wrongCount), String(item.blankCount), decimal(item.trendPercentage)])
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "desempenho-das-turmas.csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function className(correction: Correction) { return correction.classGroup?.trim() || "Turma não informada"; }
function percentageForCorrection(correction: Correction) { return correction.totalScore ? correction.score / correction.totalScore * 100 : 0; }
function correctionDate(correction: Correction) { return correction.reviewedAt || correction.createdAt; }
function average(values: number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function decimal(value: number) { return value.toFixed(2).replace(".", ","); }
function escapeCsvCell(value: string) { return `"${value.replaceAll("\"", "\"\"")}"`; }
