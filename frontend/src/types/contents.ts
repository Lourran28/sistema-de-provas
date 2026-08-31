export type Subject = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubjectInput = {
  name: string;
  description: string;
};

export type Content = {
  id: string;
  subjectId: string | null;
  title: string;
  topic: string;
  theme: string | null;
  body: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentInput = {
  subjectId?: string;
  title: string;
  topic: string;
  theme?: string;
  body: string;
  notes?: string;
};

export type ContentFilters = {
  search?: string;
  subjectId?: string;
  topic?: string;
  page?: number;
  size?: number;
};

export type ContentPage = {
  items: Content[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
};
