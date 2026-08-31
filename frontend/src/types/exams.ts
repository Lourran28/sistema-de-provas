export type ExamStatus = "DRAFT" | "IN_REVIEW" | "READY" | "VERSIONS_GENERATED" | "APPLIED" | "CORRECTED";

export type ExamVersionStatus = "GENERATED" | "PRINTED" | "APPLIED" | "ARCHIVED";

export type AttendanceStatus = "PRESENT" | "ABSENT";

export type ExamQuestion = {
  questionId: string;
  position: number;
  points: number;
  isCancelled: boolean;
};

export type ExamContent = {
  contentId: string;
  questionTargetCount: number;
};

export type Exam = {
  id: string;
  subjectId: string | null;
  title: string;
  classGroup: string | null;
  topic: string | null;
  description: string | null;
  instructions: string | null;
  examDate: string | null;
  totalScore: number;
  questionCount: number;
  status: ExamStatus;
  contents: ExamContent[];
  questions: ExamQuestion[];
  createdAt: string;
  updatedAt: string;
};

export type ExamInput = {
  subjectId?: string;
  title: string;
  classGroup?: string;
  topic?: string;
  description?: string;
  instructions?: string;
  examDate?: string;
  totalScore: number;
  questionIds: string[];
};

export type QuestionDistributionMode = "AUTO" | "MANUAL";

export type GenerateExamContentInput = {
  contentId: string;
  questionCount: number;
};

export type GenerateExamInput = {
  subjectId?: string;
  title: string;
  classGroup?: string;
  topic?: string;
  description?: string;
  instructions?: string;
  examDate?: string;
  totalScore: number;
  totalQuestions: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
  distributionMode: QuestionDistributionMode;
  contents: GenerateExamContentInput[];
};

export type ExamPage = {
  items: Exam[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
};

export type ExamClearResult = {
  archivedCount: number;
  deletedCount: number;
};

export type ExamVersionAlternative = {
  alternativeId: string;
  text: string;
  position: number;
};

export type ExamVersionQuestion = {
  id: string;
  originalQuestionId: string;
  position: number;
  points: number;
  statement: string;
  imageUrl: string | null;
  alternatives: ExamVersionAlternative[];
};

export type AnswerKeyItem = {
  questionPosition: number;
  correctAlternativeId: string;
  correctLetter: string;
};

export type ExamVersion = {
  id: string;
  examId: string;
  examTitle: string;
  label: string;
  status: ExamVersionStatus;
  generatedAt: string;
  questions: ExamVersionQuestion[];
  answerKey: AnswerKeyItem[];
};

export type ExamApplicationStudent = {
  studentId: string | null;
  studentName: string;
  studentIdentifier: string | null;
  examVersionId: string;
  versionLabel: string;
  attendance: AttendanceStatus;
};

export type ExamApplication = {
  id: string;
  examId: string;
  classGroup: string;
  appliedOn: string;
  notes: string | null;
  createdAt: string;
  students: ExamApplicationStudent[];
};

export type ExamApplicationInput = {
  classGroup: string;
  appliedOn: string;
  notes?: string;
  students: Array<{
    studentId: string;
    examVersionId: string;
    attendance: AttendanceStatus;
  }>;
};

export const examStatusLabels: Record<ExamStatus, string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisão",
  READY: "Pronta",
  VERSIONS_GENERATED: "Versões geradas",
  APPLIED: "Aplicada",
  CORRECTED: "Corrigida"
};
