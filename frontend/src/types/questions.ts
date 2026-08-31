export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD" | "MIXED";

export type QuestionType = "MULTIPLE_CHOICE" | "DISCURSIVE" | "TRUE_FALSE" | "MULTIPLE_RESPONSE";

export type Alternative = {
  id: string;
  text: string;
  position: number;
  correct: boolean;
};

export type Question = {
  id: string;
  subjectId: string | null;
  contentIds: string[];
  statement: string;
  imageUrl: string | null;
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  sourceType: "MANUAL" | "AI";
  status: "ACTIVE" | "ARCHIVED";
  alternatives: Alternative[];
  createdAt: string;
  updatedAt: string;
};

export type QuestionInput = {
  subjectId?: string;
  contentId?: string;
  statement: string;
  imageUrl?: string;
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  alternatives: Array<{ text: string }>;
  correctAlternativeIndex: number;
};

export type QuestionFilters = {
  search?: string;
  subjectId?: string;
  difficulty?: QuestionDifficulty;
  page?: number;
  size?: number;
};

export type QuestionPage = {
  items: Question[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
};

export type QuestionClearResult = {
  archivedCount: number;
  deletedCount: number;
};

export const difficultyLabels: Record<QuestionDifficulty, string> = {
  EASY: "Fácil",
  MEDIUM: "Média",
  HARD: "Difícil",
  MIXED: "Mista"
};
