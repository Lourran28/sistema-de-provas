import { ChevronLeft, ChevronRight, FileText, Pencil, Plus, Search, Settings2, Trash2, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirmation } from "../components/ui/confirmationContext";
import { ContentFormModal } from "../features/contents/ContentFormModal";
import { SubjectManagerModal } from "../features/contents/SubjectManagerModal";
import { getContentTopics, getContents, createContent, deleteContent, updateContent } from "../services/contentService";
import { createSubject, getSubjects } from "../services/subjectService";
import { ApiRequestError } from "../services/httpClient";
import type { Content, ContentFilters, ContentInput, ContentPage, Subject } from "../types/contents";

const initialPage: ContentPage = {
  items: [],
  page: { number: 0, size: 12, totalElements: 0, totalPages: 0 }
};

export function ContentsPage() {
  const { confirm } = useConfirmation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [contentPage, setContentPage] = useState<ContentPage>(initialPage);
  const [filters, setFilters] = useState<ContentFilters>({});
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingContent, setEditingContent] = useState<Content | undefined>();
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  const loadSubjects = useCallback(async () => {
    const nextSubjects = await getSubjects();
    setSubjects(nextSubjects);
  }, []);

  const loadContents = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [nextContentPage, nextTopics] = await Promise.all([getContents(filters), getContentTopics()]);
      setContentPage(nextContentPage);
      setTopics(nextTopics);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível carregar seus conteúdos."));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSubjects().catch((requestError: unknown) => setError(getErrorMessage(requestError, "Não foi possível carregar as disciplinas.")));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSubjects]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadContents();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadContents]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      search: search.trim() || undefined,
      subjectId: subjectId || undefined,
      topic: topic || undefined,
      page: 0,
      size: 12
    });
  }

  function clearFilters() {
    setSearch("");
    setSubjectId("");
    setTopic("");
    setFilters({ page: 0, size: 12 });
  }

  async function refreshWorkspace() {
    await Promise.all([loadSubjects(), loadContents()]);
  }

  async function saveContent(input: ContentInput) {
    if (editingContent) {
      await updateContent(editingContent.id, input);
    } else {
      await createContent(input);
    }
    await loadContents();
  }

  async function createAndSelectSubject(name: string) {
    const subject = await createSubject({ name, description: "" });
    setSubjects((current) => [...current, subject].sort((first, second) => first.name.localeCompare(second.name, "pt-BR")));
    return subject;
  }

  async function removeContent(content: Content) {
    if (!(await confirm({
      confirmLabel: "Excluir conteúdo",
      description: `Excluir o conteúdo “${content.title}”? Essa ação não pode ser desfeita.`,
      title: "Excluir conteúdo",
      variant: "danger"
    }))) {
      return;
    }

    try {
      await deleteContent(content.id);
      const currentPage = contentPage.page.number;
      if (contentPage.items.length === 1 && currentPage > 0) {
        setFilters((current) => ({ ...current, page: currentPage - 1 }));
      } else {
        await loadContents();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível excluir o conteúdo."));
    }
  }

  function openNewContent() {
    setEditingContent(undefined);
    setIsContentModalOpen(true);
  }

  function openEditContent(content: Content) {
    setEditingContent(content);
    setIsContentModalOpen(true);
  }

  function goToPage(page: number) {
    setFilters((current) => ({ ...current, page }));
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Meus Conteúdos</h1>
          <p className="mt-1 text-sm text-slate-500">Materiais que servirão de fonte para as próximas avaliações.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={Settings2} onClick={() => setIsSubjectModalOpen(true)} type="button" variant="secondary">
            Disciplinas
          </Button>
          <Button icon={Plus} onClick={openNewContent} type="button">
            Novo conteúdo
          </Button>
        </div>
      </section>

      <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_200px_auto_auto]" onSubmit={applyFilters}>
        <label className="relative block">
          <span className="sr-only">Pesquisar conteúdo</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
          <input
            className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por título, assunto ou tema"
            type="search"
            value={search}
          />
        </label>
        <select
          aria-label="Filtrar por disciplina"
          className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          onChange={(event) => setSubjectId(event.target.value)}
          value={subjectId}
        >
          <option value="">Todas as disciplinas</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por assunto"
          className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          onChange={(event) => setTopic(event.target.value)}
          value={topic}
        >
          <option value="">Todos os assuntos</option>
          {topics.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
        <Button aria-label="Limpar filtros" className="h-11 w-11 px-0" icon={X} onClick={clearFilters} title="Limpar filtros" type="button" variant="ghost" />
      </form>

      {error ? (
        <div aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </div>
      ) : null}

      <ContentTable
        contents={contentPage.items}
        isLoading={isLoading}
        onEdit={openEditContent}
        onRemove={(content) => void removeContent(content)}
        subjects={subjects}
      />

      {contentPage.page.totalPages > 1 ? (
        <nav aria-label="Paginação de conteúdos" className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {contentPage.page.totalElements} {contentPage.page.totalElements === 1 ? "conteúdo" : "conteúdos"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Página anterior"
              className="h-9 w-9 px-0"
              disabled={contentPage.page.number === 0}
              icon={ChevronLeft}
              onClick={() => goToPage(contentPage.page.number - 1)}
              title="Página anterior"
              variant="secondary"
            />
            <span className="min-w-20 text-center text-sm font-medium text-slate-700">
              {contentPage.page.number + 1} de {contentPage.page.totalPages}
            </span>
            <Button
              aria-label="Próxima página"
              className="h-9 w-9 px-0"
              disabled={contentPage.page.number + 1 >= contentPage.page.totalPages}
              icon={ChevronRight}
              onClick={() => goToPage(contentPage.page.number + 1)}
              title="Próxima página"
              variant="secondary"
            />
          </div>
        </nav>
      ) : null}

      {isContentModalOpen ? (
        <ContentFormModal
          content={editingContent}
          onClose={() => setIsContentModalOpen(false)}
          onCreateSubject={createAndSelectSubject}
          onSave={saveContent}
          subjects={subjects}
          topics={topics}
        />
      ) : null}

      {isSubjectModalOpen ? (
        <SubjectManagerModal
          onClose={() => setIsSubjectModalOpen(false)}
          onRefresh={refreshWorkspace}
          subjects={subjects}
        />
      ) : null}
    </div>
  );
}

type ContentTableProps = {
  contents: Content[];
  isLoading: boolean;
  onEdit: (content: Content) => void;
  onRemove: (content: Content) => void;
  subjects: Subject[];
};

function ContentTable({ contents, isLoading, onEdit, onRemove, subjects }: ContentTableProps) {
  if (isLoading) {
    return <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando conteúdos...</Card>;
  }

  if (contents.length === 0) {
    return (
      <Card className="px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
          <FileText aria-hidden="true" size={22} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhum conteúdo encontrado</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Cadastre um material ou ajuste os filtros da busca.</p>
      </Card>
    );
  }

  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));

  return (
    <Card className="overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Conteúdo</th>
              <th className="px-5 py-3">Disciplina</th>
              <th className="px-5 py-3">Assunto</th>
              <th className="px-5 py-3">Atualizado</th>
              <th className="w-28 px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {contents.map((content) => (
              <ContentRow
                content={content}
                key={content.id}
                onEdit={onEdit}
                onRemove={onRemove}
                subjectName={content.subjectId ? subjectNames.get(content.subjectId) : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-stone-200 md:hidden">
        {contents.map((content) => (
          <article className="space-y-3 px-4 py-4" key={content.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900">{content.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{content.topic}</p>
              </div>
              <ContentActions content={content} onEdit={onEdit} onRemove={onRemove} />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-stone-100 px-2 py-1">{content.subjectId ? subjectNames.get(content.subjectId) ?? "Disciplina removida" : "Sem disciplina"}</span>
              {content.theme ? <span className="rounded-md bg-teal-50 px-2 py-1 text-teal-800">{content.theme}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

type ContentRowProps = {
  content: Content;
  onEdit: (content: Content) => void;
  onRemove: (content: Content) => void;
  subjectName?: string;
};

function ContentRow({ content, onEdit, onRemove, subjectName }: ContentRowProps) {
  return (
    <tr className="text-sm text-slate-700">
      <td className="max-w-md px-5 py-4">
        <p className="truncate font-semibold text-slate-900">{content.title}</p>
        {content.theme ? <p className="mt-1 truncate text-slate-500">{content.theme}</p> : null}
      </td>
      <td className="px-5 py-4 text-slate-600">{subjectName ?? (content.subjectId ? "Disciplina removida" : "Sem disciplina")}</td>
      <td className="px-5 py-4 text-slate-600">{content.topic}</td>
      <td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(content.updatedAt)}</td>
      <td className="px-5 py-4">
        <ContentActions content={content} onEdit={onEdit} onRemove={onRemove} />
      </td>
    </tr>
  );
}

function ContentActions({ content, onEdit, onRemove }: Pick<ContentRowProps, "content" | "onEdit" | "onRemove">) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        aria-label={`Editar ${content.title}`}
        className="h-9 w-9 px-0"
        icon={Pencil}
        onClick={() => onEdit(content)}
        title="Editar conteúdo"
        variant="ghost"
      />
      <Button
        aria-label={`Excluir ${content.title}`}
        className="h-9 w-9 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
        icon={Trash2}
        onClick={() => onRemove(content)}
        title="Excluir conteúdo"
        variant="ghost"
      />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}
