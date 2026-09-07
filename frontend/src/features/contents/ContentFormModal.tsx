import JSZip from "jszip";
import { FileUp, Save, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";

import { Button } from "../../components/ui/Button";
import { ModalDialog } from "../../components/ui/ModalDialog";
import { ApiRequestError } from "../../services/httpClient";
import type { Content, ContentInput, Subject } from "../../types/contents";

type ContentFormModalProps = {
  content?: Content;
  onClose: () => void;
  onCreateSubject: (name: string) => Promise<Subject>;
  onSave: (input: ContentInput) => Promise<void>;
  subjects: Subject[];
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function ContentFormModal({ content, onClose, onCreateSubject, onSave, subjects }: ContentFormModalProps) {
  const [subjectName, setSubjectName] = useState(() => subjects.find((subject) => subject.id === content?.subjectId)?.name ?? "");
  const [theme, setTheme] = useState(content?.theme || content?.topic || "");
  const [title, setTitle] = useState(content?.title ?? "");
  const [body, setBody] = useState(content?.body ?? "");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const normalizedSubjectName = subjectName.trim();
      const existingSubject = subjects.find((subject) => subject.name.localeCompare(normalizedSubjectName, "pt-BR", { sensitivity: "accent" }) === 0);
      const subjectId = normalizedSubjectName ? (existingSubject ?? await onCreateSubject(normalizedSubjectName)).id : undefined;
      await onSave({ subjectId, title, topic: theme, theme, body });
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function importMaterial(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setIsReadingFile(true);
    try {
      if (file.size > MAX_FILE_SIZE) throw new Error("O arquivo deve ter no máximo 10 MB.");
      const extension = file.name.split(".").pop()?.toLocaleLowerCase("pt-BR");
      const text = await extractMaterialText(file, extension);
      if (!text.trim()) {
        throw new Error(extension === "pdf"
          ? "Não foi encontrado texto no PDF. Se ele for escaneado, será necessário usar OCR."
          : "Não foi encontrado texto neste arquivo.");
      }
      if (text.length > 50000) throw new Error("O material possui mais de 50.000 caracteres. Reduza o conteúdo antes de importar.");
      setBody(text);
      setFileName(file.name);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Não foi possível ler o arquivo.");
    } finally {
      setIsReadingFile(false);
    }
  }

  return <ModalDialog onClose={onClose} title={content ? "Editar conteúdo" : "Novo conteúdo"}>
    <form className="divide-y divide-stone-200" onSubmit={handleSubmit}>
      <div className="max-h-[68vh] space-y-5 overflow-y-auto px-5 py-6 sm:px-6">
        {error ? <div aria-live="polite" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{error}</div> : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="content-subject">Disciplina
            <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="content-subject" list="content-subject-options" maxLength={120} onChange={(event) => setSubjectName(event.target.value)} placeholder="Digite ou selecione" required value={subjectName} />
            <datalist id="content-subject-options">{subjects.map((subject) => <option key={subject.id} value={subject.name} />)}</datalist>
            <span className="mt-1 block text-xs font-normal text-slate-500">Uma disciplina nova será criada ao salvar.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700" htmlFor="content-theme">Tema
            <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="content-theme" maxLength={160} onChange={(event) => setTheme(event.target.value)} placeholder="Ex.: Crase" required value={theme} />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="content-title">Título
          <input className="mt-2 h-11 w-full rounded-lg border border-stone-300 px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="content-title" maxLength={180} onChange={(event) => setTitle(event.target.value)} required value={title} />
        </label>
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-700">Material de referência</p><p className="mt-1 text-xs text-slate-500">Digite abaixo ou importe PDF, slides PPTX, texto, Markdown ou CSV.</p></div><label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400"><FileUp aria-hidden="true" size={18} />{isReadingFile ? "Lendo arquivo..." : "Importar arquivo"}<input accept=".pdf,.pptx,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="sr-only" disabled={isReadingFile} onChange={importMaterial} type="file" /></label></div>
          {fileName ? <div className="mt-3 flex items-center justify-between border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900"><span className="truncate">Texto importado de {fileName}</span><Button aria-label="Remover material importado" className="h-8 w-8 px-0" icon={X} onClick={() => { setBody(""); setFileName(""); }} title="Remover arquivo" type="button" variant="ghost" /></div> : null}
          <textarea className="mt-3 min-h-56 w-full resize-y rounded-lg border border-stone-300 px-3 py-3 leading-6 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id="content-body" maxLength={50000} onChange={(event) => setBody(event.target.value)} placeholder="Digite ou cole o material que será usado para gerar as questões." required value={body} />
        </div>
      </div>
      <footer className="flex flex-wrap justify-end gap-3 px-5 py-4 sm:px-6"><Button disabled={isSubmitting} onClick={onClose} type="button" variant="secondary">Cancelar</Button><Button disabled={isSubmitting || isReadingFile} icon={Save} type="submit">{isSubmitting ? "Salvando..." : content ? "Salvar alterações" : "Salvar conteúdo"}</Button></footer>
    </form>
  </ModalDialog>;
}

async function extractMaterialText(file: File, extension?: string) {
  if (extension === "pdf") return extractPdfText(file);
  if (extension === "pptx") return extractPptxText(file);
  if (["txt", "md", "csv"].includes(extension ?? "")) return file.text();
  throw new Error("Formato não suportado. Envie PDF, PPTX, TXT, Markdown ou CSV.");
}

async function extractPdfText(file: File) {
  try {
    const [{ getDocument, GlobalWorkerOptions }, { default: workerSource }] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    GlobalWorkerOptions.workerSrc = workerSource;
    const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await loadingTask.promise;
    const sections: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += item.str;
        pageText += item.hasEOL ? "\n" : " ";
      }
      const normalizedText = pageText.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
      if (normalizedText) sections.push(`Página ${pageNumber}\n${normalizedText}`);
    }

    await loadingTask.destroy();
    return sections.join("\n\n");
  } catch {
    throw new Error("Não foi possível ler o PDF. Verifique se o arquivo não está protegido por senha ou corrompido.");
  }
}

async function extractPptxText(file: File) {
  const zip = await JSZip.loadAsync(file);
  const slides = Object.values(zip.files).filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry.name)).sort((a, b) => slideNumber(a.name) - slideNumber(b.name));
  const sections: string[] = [];
  for (const slide of slides) {
    const xml = await slide.async("text");
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const lines = [...document.getElementsByTagNameNS("*", "t")].map((node) => node.textContent?.trim()).filter(Boolean);
    if (lines.length) sections.push(`Slide ${slideNumber(slide.name)}\n${lines.join("\n")}`);
  }
  return sections.join("\n\n");
}

function slideNumber(path: string) { return Number(path.match(/slide(\d+)\.xml$/)?.[1] ?? 0); }
function getErrorMessage(error: unknown) { return error instanceof ApiRequestError ? error.message : error instanceof Error ? error.message : "Não foi possível salvar o conteúdo."; }
