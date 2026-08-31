export type Student = {
  id: string;
  name: string;
  identifier: string | null;
  classGroup: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentInput = {
  name: string;
  identifier?: string;
  classGroup: string;
};

export type StudentFilters = {
  search?: string;
  classGroup?: string;
};

export type StudentBatchResponse = {
  createdCount: number;
  skippedCount: number;
  messages: string[];
  createdStudents: Student[];
};
