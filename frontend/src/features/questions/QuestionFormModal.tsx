import { AlignLeft, CircleCheck, ImagePlus, ListChecks, Minus, Plus, Save, Trash2, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";

import { Button } from "../../components/ui/Button";
import { ModalDialog } from "../../components/ui/ModalDialog";
import { ApiRequestError } from "../../services/httpClient";
import type { Subject } from "../../types/contents";
import { difficultyLabels, type Question, type QuestionDifficulty, type QuestionInput, type QuestionType } from "../../types/questions";

type QuestionFormModalProps = {
  onClose: () => void;
  onCreateSubject: (name: string) => Promise<Subject>;
  onSave: (input: QuestionInput) => Promise<void>;
  question?: Question;
  subjects: Subject[];
};

const emptyAlternatives = [{ text: "" }, { text: "" }];
const MAX_INPUT_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_STORED_IMAGE_LENGTH = 600000;

export function QuestionFormModal({ onClose, onCreateSubject, onSave, question, subjects }: QuestionFormModalProps) {
  const [subjectName, setSubjectName] = useState(() => subjects.find((subject) => subject.id === question?.subjectId)?.name ?? "");
  const [statement, setStatement] = useState(question?.statement ?? "");
  const [imageUrl, setImageUrl] = useState(question?.imageUrl ?? "");
  const [questionType, setQuestionType] = useState<QuestionType>(question?.questionType === "DISCURSIVE" ? "DISCURSIVE" : "MULTIPLE_CHOICE");
  const [responseLines, setResponseLines] = useState(question?.responseLines ?? 5);
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

  function selectQuestionType(nextType: QuestionType) {
    setQuestionType(nextType);
    if (nextType === "MULTIPLE_CHOICE" && alternatives.length < 2) {
      setAlternatives(emptyAlternatives.map((alternative) => ({ ...alternative })));
      setCorrectAlternativeIndex(0);
    }
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
      const normalizedSubjectName = subjectName.trim();
      const existingSubject = subjects.find((subject) => subject.name.localeCompare(normalizedSubjectName, "pt-BR", { sensitivity: "accent" }) === 0);
      const subjectId = normalizedSubjectName ? (existingSubject ?? await onCreateSubject(normalizedSubjectName)).id : undefined;
      await onSave({
        subjectId,
        contentId: question?.contentIds[0],
        statement,
        imageUrl: imageUrl.trim() || undefined,
        questionType,
        responseLines: questionType === "DISCURSIVE" ? responseLines : undefined,
        difficulty,
        alternatives: questionType === "DISCURSIVE" ? [] : alternatives,
        correctAlternativeIndex: questionType === "DISCURSIVE" ? null : correctAlternativeIndex
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

          <div className="max-w-xl">
            <label className="block text-sm font-medium text-slate-700" htmlFor="question-subject">
              Disciplina
              <input
                className="mt-2 h-11 w-full rounded-lg border border-stone-300 px-3 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="question-subject"
                list="question-subject-options"
                maxLength={120}
                onChange={(event) => setSubjectName(event.target.value)}
                placeholder="Digite ou selecione uma disciplina"
                value={subjectName}
              />
              <datalist id="question-subject-options">
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.name} />
                ))}
              </datalist>
              <span className="mt-1 block text-xs font-normal text-slate-500">Uma disciplina nova será criada ao salvar.</span>
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">Tipo de questão</legend>
            <div className="mt-2 grid max-w-xl gap-2 sm:grid-cols-2">
              <label className={`flex min-h-16 cursor-pointer items-center gap-3 border px-4 py-3 transition ${questionType === "MULTIPLE_CHOICE" ? "border-teal-700 bg-teal-50" : "border-stone-300 bg-white hover:border-slate-400"}`}>
                <input checked={questionType === "MULTIPLE_CHOICE"} className="sr-only" name="question-type" onChange={() => selectQuestionType("MULTIPLE_CHOICE")} type="radio" />
                <ListChecks aria-hidden="true" className="pointer-events-none shrink-0 text-teal-800" size={20} />
                <span><strong className="block text-sm text-slate-950">Múltipla escolha</strong><span className="text-xs text-slate-500">Alternativas com gabarito</span></span>
              </label>
              <label className={`flex min-h-16 cursor-pointer items-center gap-3 border px-4 py-3 transition ${questionType === "DISCURSIVE" ? "border-teal-700 bg-teal-50" : "border-stone-300 bg-white hover:border-slate-400"}`}>
                <input checked={questionType === "DISCURSIVE"} className="sr-only" name="question-type" onChange={() => selectQuestionType("DISCURSIVE")} type="radio" />
                <AlignLeft aria-hidden="true" className="pointer-events-none shrink-0 text-teal-800" size={20} />
                <span><strong className="block text-sm text-slate-950">Questão aberta</strong><span className="text-xs text-slate-500">Resposta escrita</span></span>
              </label>
            </div>
          </fieldset>

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

          {questionType === "MULTIPLE_CHOICE" ? <fieldset>
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
          </fieldset> : (
            <div className="flex flex-col gap-4 border-y border-stone-200 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <AlignLeft aria-hidden="true" className="shrink-0 text-teal-800" size={19} />
                <span>A nota será informada pelo professor durante a correção.</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Linhas para resposta</p>
                <div className="mt-2 flex h-10 items-center border border-stone-300 bg-white">
                  <Button aria-label="Diminuir linhas" className="h-9 w-9 rounded-none px-0" disabled={responseLines <= 1} icon={Minus} onClick={() => setResponseLines((current) => Math.max(1, current - 1))} title="Diminuir linhas" variant="ghost" />
                  <input
                    aria-label="Quantidade de linhas para resposta"
                    className="h-full w-16 border-x border-stone-300 text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-inset focus:ring-teal-100"
                    max={30}
                    min={1}
                    onChange={(event) => setResponseLines(Math.min(30, Math.max(1, Number(event.target.value) || 1)))}
                    type="number"
                    value={responseLines}
                  />
                  <Button aria-label="Aumentar linhas" className="h-9 w-9 rounded-none px-0" disabled={responseLines >= 30} icon={Plus} onClick={() => setResponseLines((current) => Math.min(30, current + 1))} title="Aumentar linhas" variant="ghost" />
                </div>
                <p className="mt-1 text-xs text-slate-500">De 1 a 30 linhas.</p>
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-3 px-5 py-4 sm:px-6">
          <Button disabled={isSubmitting} onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={isSubmitting || isProcessingImage} icon={Save} type="submit">
            {isSubmitting ? "Salvando..." : question ? "Salvar alterações" : "Salvar questão"}
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
