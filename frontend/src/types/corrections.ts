export type CorrectionStatus = "NEEDS_REVIEW" | "CONFIRMED" | "CANCELLED";
export type StudentAnswerStatus = "DETECTED" | "BLANK" | "AMBIGUOUS" | "NEEDS_REVIEW" | "CONFIRMED";

export type CorrectionAnswerInput = {
  examVersionQuestionId: string;
  selectedAlternativeId: string | null;
  status: Exclude<StudentAnswerStatus, "CONFIRMED">;
};

export type CorrectionInput = {
  examVersionId: string;
  studentId?: string;
  studentName: string;
  studentIdentifier?: string;
  classGroup?: string;
  answers: CorrectionAnswerInput[];
};

export type CorrectionAnswer = {
  examVersionQuestionId: string;
  questionPosition: number;
  selectedAlternativeId: string | null;
  selectedLetter: string | null;
  correctLetter: string;
  status: StudentAnswerStatus;
  correct: boolean | null;
  cancelled: boolean;
};

export type Correction = {
  id: string;
  examVersionId: string;
  examTitle: string;
  versionLabel: string;
  studentId: string | null;
  studentName: string;
  studentIdentifier: string | null;
  classGroup: string | null;
  status: CorrectionStatus;
  score: number;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  ambiguousCount: number;
  reviewedAt: string | null;
  createdAt: string;
  answers: CorrectionAnswer[];
};
