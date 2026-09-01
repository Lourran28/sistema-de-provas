import { CircleCheck, ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import { ModalDialog } from "../../components/ui/ModalDialog";
import { ApiRequestError } from "../../services/httpClient";
import type { Content, Subject } from "../../types/contents";
import { difficultyLabels, type Question, type QuestionDifficulty, type QuestionInput } from "../../types/questions";

type QuestionFormModalProps = {
  contents: Content[];
  onClose: () => void;
  onSave: (input: QuestionInput) => Promise<void>;
  question?: Question;
  subjects: Subject[];
};

const emptyAlternatives = [{ text: "" }, { text: "" }];
const MAX_INPUT_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_STORED_IMAGE_LENGTH = 600000;

export function QuestionFormModal({ contents, onClose, onSave, question, subjects }: QuestionFormModalProps) {
  const initialContentId = question?.contentIds[0] ?? "";
  const [subjectId, setSubjectId] = useState(question?.subjectId ?? "");
  const [contentId, setContentId] = useState(initialContentId);
  const [statement, setStatement] = useState(question?.statement ?? "");
  const [imageUrl, setImageUrl] = useState(question?.imageUrl ?? "");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(question?.difficulty ?? "MEDIUM");
  const [alternatives, setAlternatives] = useState(() =>
    question ? question.alternatives.map((alternative) => ({ text: alternative.text })) : emptyAlternatives
  );
  const [correctAlternativeIndex, setCorrectAlternativeIndex] = useState(() => {
    const index = question?.alternatives.findIndex((alternative) => alternative.correct) ?? 0;
    return index >= 0 ? index : 0;
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const sortedContents = useMemo(() => [...contents].sort((first, second) => first.title.localeCompare(second.title, "pt-BR")), [contents]);

  function changeContent(nextContentId: string) {
    setContentId(nextContentId);
    const selectedContent = contents.find((content) => content.id === nextContentId);
    if (selectedContent?.subjectId) {
      setSubjectId(selectedContent.subjectId);
    }
  }

  function changeAlternative(index: number, text: string) {
    setAlternatives((current) => current.map((alternative, position) => (position === index ? { text } : alternative)));
  }

  function addAlternative() {
    setAlternatives((current) => (current.length < 8 ? [...current, { text: "" }] : current));
  }

  function removeAlternative(index: number) {
    setAlternatives((current) => {
      if (current.length <= 2) {
        return current;
      }
      return current.filter((_, position) => position !== index);
    });
    setCorrectAlternativeIndex((current) => {
      if (index < current) {
        return current - 1;
      }
      if (index === current) {
        return 0;
      }
      return current;
    });
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setError("");
    setIsProcessingImage(true);
    try {
      setImageUrl(await compressQuestionImage(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível preparar a imagem.");
    } finally {
      setIsProcessingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onSave({
        subjectId: subjectId || undefined,
        contentId: contentId || undefined,
        statement,
        imageUrl: imageUrl.trim() || undefined,
        questionType: "MULTIPLE_CHOICE",
        difficulty,
        alternatives,
        correctAlternativeIndex
      });
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalDialog onClose={onClose} title={question ? "Editar questão" : "Nova questão"}>
      <form className="divide-y divide-stone-200" onSubmit={handleSubmit}>
        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-5 py-6 sm:px-6">
          {error ? (
            <div aria-live="polite" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {error}
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="question-subject">
              Disciplina
              <select
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="question-subject"
                onChange={(event) => setSubjectId(event.target.value)}
                value={subjectId}
              >
                <option value="">Sem disciplina</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700" htmlFor="question-content">
              Conteúdo de origem
              <select
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="question-content"
                onChange={(event) => changeContent(event.target.value)}
                value={contentId}
              >
                <option value="">Sem conteúdo vinculado</option>
                {sortedContents.map((content) => (
                  <option key={content.id} value={content.id}>
                    {content.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block text-sm font-medium text-slate-700" htmlFor="question-statement">
              Enunciado
              <textarea
                className="mt-2 min-h-32 w-full resize-y rounded-lg border border-stone-300 px-3 py-3 leading-6 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="question-statement"
                maxLength={20000}
                onChange={(event) => setStatement(event.target.value)}
                required
                value={statement}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700" htmlFor="question-difficulty">
              Dificuldade
              <select
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="question-difficulty"
                onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty)}
                value={difficulty}
              >
                {Object.entries(difficultyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700" htmlFor="question-image-url">
              Imagem de apoio (URL opcional)
              <input
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="question-image-url"
                maxLength={2048}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://exemplo.com/imagem.png"
                type="url"
                value={imageUrl}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label
                className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 ${isProcessingImage ? "cursor-wait opacity-60" : ""}`}
                htmlFor="question-image-file"
              >
                <ImagePlus aria-hidden="true" size={18} />
                {isProcessingImage ? "Preparando imagem..." : "Selecionar imagem"}
              </label>
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={isProcessingImage}
                id="question-image-file"
                onChange={selectImage}
                type="file"
              />
              {imageUrl.trim() ? (
                <Button
                  aria-label="Remover imagem de apoio"
                  className="h-9 w-9 px-0"
                  icon={X}
                  onClick={() => setImageUrl("")}
                  title="Remover imagem"
                  type="button"
                  variant="ghost"
                />
              ) : null}
              <p className="text-xs text-slate-500">PNG, JPEG ou WebP de até 8 MB. A imagem é reduzida antes de salvar.</p>
            </div>
            {imageUrl.trim() ? (
              <img
                alt="Prévia da imagem de apoio"
                className="max-h-72 w-full border border-stone-200 bg-stone-50 object-contain"
                referrerPolicy="no-referrer"
                src={imageUrl.trim()}
              />
            ) : null}
          </div>

          <fieldset>
            <div className="flex items-center justify-between gap-4">
              <div>
                <legend className="text-sm font-semibold text-slate-900">Alternativas</legend>
                <p className="mt-1 text-sm text-slate-500">Marque uma única resposta correta.</p>
              </div>
              <Button
                className="h-9 px-3"
                disabled={alternatives.length >= 8}
                icon={Plus}
                onClick={addAlternative}
                type="button"
                variant="secondary"
              >
                Alternativa
              </Button>
            </div>

            <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
              {alternatives.map((alternative, index) => (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3" key={index}>
                  <label className="flex h-10 w-10 cursor-pointer items-center justify-center text-teal-800" title="Definir como correta">
                    <input
                      aria-label={`Alternativa ${index + 1} é a correta`}
                      checked={correctAlternativeIndex === index}
                      className="sr-only"
                      name="correct-alternative"
                      onChange={() => setCorrectAlternativeIndex(index)}
                      type="radio"
                    />
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${correctAlternativeIndex === index ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 bg-white text-transparent"}`}>
                      <CircleCheck aria-hidden="true" size={17} />
                    </span>
                  </label>
                  <label className="sr-only" htmlFor={`question-alternative-${index}`}>
                    Alternativa {index + 1}
                  </label>
                  <input
                    className="h-11 min-w-0 rounded-lg border border-stone-300 px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                    id={`question-alternative-${index}`}
                    maxLength={5000}
                    onChange={(event) => changeAlternative(index, event.target.value)}
                    placeholder={`Alternativa ${String.fromCharCode(65 + index)}`}
                    required
                    value={alternative.text}
                  />
                  <Button
                    aria-label={`Remover alternativa ${index + 1}`}
                    className="h-9 w-9 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    disabled={alternatives.length <= 2}
                    icon={Trash2}
                    onClick={() => removeAlternative(index)}
                    title="Remover alternativa"
                    type="button"
                    variant="ghost"
                  />
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="flex flex-wrap justify-end gap-3 px-5 py-4 sm:px-6">
          <Button disabled={isSubmitting} onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={isSubmitting || isProcessingImage} icon={Save} type="submit">
            {isSubmitting ? "Salvando..." : "Salvar questão"}
          </Button>
        </footer>
      </form>
    </ModalDialog>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiRequestError ? error.message : "Não foi possível salvar a questão.";
}

async function compressQuestionImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Selecione uma imagem PNG, JPEG ou WebP.");
  }
  if (file.size > MAX_INPUT_IMAGE_SIZE) {
    throw new Error("A imagem escolhida deve ter no máximo 8 MB.");
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Não foi possível preparar a imagem.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let quality = 0.88;
    let compressedImage = canvas.toDataURL("image/jpeg", quality);
    while (compressedImage.length > MAX_STORED_IMAGE_LENGTH && quality > 0.5) {
      quality -= 0.1;
      compressedImage = canvas.toDataURL("image/jpeg", quality);
    }
    if (compressedImage.length > MAX_STORED_IMAGE_LENGTH) {
      throw new Error("A imagem ficou grande demais. Escolha uma imagem menor ou recortada.");
    }
    return compressedImage;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível ler a imagem escolhida."));
    image.src = sourceUrl;
  });
}
