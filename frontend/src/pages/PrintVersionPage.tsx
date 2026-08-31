import { ArrowLeft, ClipboardList, FileText, KeyRound, LoaderCircle, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { MathText } from "../components/ui/MathText";
import { useAuth } from "../features/auth/useAuth";
import { getExam, getExamVersion } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import { getSubjects } from "../services/subjectService";
import type { Exam, ExamVersion } from "../types/exams";
import type { Subject } from "../types/contents";

type PrintMode = "exam" | "answer-card" | "answer-key";
type ExamLayout = "single" | "double";
type FontSize = "normal" | "compact";
type CardLayout = "single" | "dual";

export function PrintVersionPage() {
  const { versionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [version, setVersion] = useState<ExamVersion | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [examLayout, setExamLayout] = useState<ExamLayout>("single");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [cardLayout, setCardLayout] = useState<CardLayout>("single");

  useEffect(() => {
    if (!versionId) {
      return;
    }
    const targetVersionId = versionId;

    let active = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const nextVersion = await getExamVersion(targetVersionId);
        const [nextExam, nextSubjects] = await Promise.all([getExam(nextVersion.examId), getSubjects()]);
        if (active) {
          setVersion(nextVersion);
          setExam(nextExam);
          setSubjects(nextSubjects);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível preparar a impressão da prova.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [versionId]);

  const subjectName = useMemo(
    () => subjects.find((subject) => subject.id === exam?.subjectId)?.name ?? "Disciplina não informada",
    [exam?.subjectId, subjects]
  );
  const answerKeyByPosition = useMemo(
    () => new Map(version?.answerKey.map((item) => [item.questionPosition, item.correctLetter]) ?? []),
    [version]
  );
  const alternativeCount = useMemo(
    () => Math.max(2, ...((version?.questions ?? []).map((question) => question.alternatives.length))),
    [version?.questions]
  );

  function handlePrint(mode: PrintMode) {
    document.body.dataset.printMode = mode;
    window.print();
    window.setTimeout(() => {
      delete document.body.dataset.printMode;
    }, 0);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
        <LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={18} />
        Preparando impressão...
      </div>
    );
  }

  if (error || !version || !exam) {
    return (
      <div className="mx-auto max-w-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
        <p>{error || "Versão da prova não encontrada."}</p>
        <Button className="mt-4" icon={ArrowLeft} onClick={() => navigate("/provas")} variant="secondary">
          Voltar para provas
        </Button>
      </div>
    );
  }

  return (
    <div className="print-page-shell">
      <header className="print-toolbar">
        <Button icon={ArrowLeft} onClick={() => navigate(`/provas/${exam.id}`)} variant="ghost">
          Voltar
        </Button>
        <div className="print-toolbar__title">
          <p className="text-sm font-semibold text-slate-950">Versão {version.label}</p>
          <p className="text-xs text-slate-500">{exam.title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium">Layout Prova:</span>
            <select
              className="rounded border border-stone-300 bg-white px-2 py-1 text-xs outline-none focus:border-teal-700"
              onChange={(event) => setExamLayout(event.target.value as ExamLayout)}
              value={examLayout}
            >
              <option value="single">1 Coluna</option>
              <option value="double">2 Colunas (Econômico)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium">Fonte:</span>
            <select
              className="rounded border border-stone-300 bg-white px-2 py-1 text-xs outline-none focus:border-teal-700"
              onChange={(event) => setFontSize(event.target.value as FontSize)}
              value={fontSize}
            >
              <option value="normal">Normal</option>
              <option value="compact">Compacto</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium">Cartão:</span>
            <select
              className="rounded border border-stone-300 bg-white px-2 py-1 text-xs outline-none focus:border-teal-700"
              onChange={(event) => setCardLayout(event.target.value as CardLayout)}
              value={cardLayout}
            >
              <option value="single">1 por folha</option>
              <option value="dual">2 por folha (Duplo)</option>
            </select>
          </div>
        </div>

        <div className="print-toolbar__actions">
          <Button icon={FileText} onClick={() => handlePrint("exam")} variant="secondary">
            Imprimir prova
          </Button>
          <Button icon={ClipboardList} onClick={() => handlePrint("answer-card")} variant="secondary">
            Cartão-resposta
          </Button>
          <Button icon={KeyRound} onClick={() => handlePrint("answer-key")} variant="secondary">
            Gabarito
          </Button>
        </div>
      </header>

      <main className="print-previews">
        <section
          className={`print-document print-document--exam ${fontSize === "compact" ? "print-document--compact-font" : ""}`}
          data-print-document="exam"
        >
          <DocumentHeader exam={exam} subjectName={subjectName} teacherName={user?.name ?? "Professor(a)"} version={version} />

          <div className="print-student-fields">
            <p>Aluno(a): <span /></p>
            <p>Turma: <span /></p>
          </div>

          {exam.instructions ? <p className="print-instructions">{exam.instructions}</p> : null}

          <ol className={`print-questions ${examLayout === "double" ? "print-questions--two-columns" : ""}`}>
            {version.questions.map((question) => (
              <li key={question.id}>
                <p className="print-question-statement"><MathText text={question.statement} /></p>
                {question.imageUrl ? <img alt={`Imagem de apoio da questão ${question.position}`} className="print-question-image" referrerPolicy="no-referrer" src={question.imageUrl} /> : null}
                <ol className="print-alternatives" type="A">
                  {question.alternatives.map((alternative) => (
                    <li key={alternative.alternativeId}><MathText text={alternative.text} /></li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={`print-document print-document--answer-card ${cardLayout === "dual" ? "print-document--answer-card-dual" : ""}`}
          data-print-document="answer-card"
        >
          {cardLayout === "dual" ? (
            <>
              <div className="answer-card-half">
                <DocumentHeader exam={exam} subjectName={subjectName} teacherName={user?.name ?? "Professor(a)"} version={version} compact />
                <div className="print-student-fields print-student-fields--card">
                  <p>Aluno(a): <span /></p>
                  <p>Turma: <span /></p>
                </div>
                <h2 className="answer-card-title">Cartão-resposta (Via 1)</h2>
                <AnswerCardTable alternativeCount={alternativeCount} version={version} />
                <p className="answer-card-note">Preencha apenas uma opção por questão, usando caneta escura.</p>
              </div>

              <div className="answer-card-cut-line">
                <span>✂ Recorte aqui</span>
              </div>

              <div className="answer-card-half">
                <DocumentHeader exam={exam} subjectName={subjectName} teacherName={user?.name ?? "Professor(a)"} version={version} compact />
                <div className="print-student-fields print-student-fields--card">
                  <p>Aluno(a): <span /></p>
                  <p>Turma: <span /></p>
                </div>
                <h2 className="answer-card-title">Cartão-resposta (Via 2)</h2>
                <AnswerCardTable alternativeCount={alternativeCount} version={version} />
                <p className="answer-card-note">Preencha apenas uma opção por questão, usando caneta escura.</p>
              </div>
            </>
          ) : (
            <>
              <DocumentHeader exam={exam} subjectName={subjectName} teacherName={user?.name ?? "Professor(a)"} version={version} compact />
              <div className="print-student-fields print-student-fields--card">
                <p>Aluno(a): <span /></p>
                <p>Turma: <span /></p>
              </div>
              <h2 className="answer-card-title">Cartão-resposta</h2>
              <AnswerCardTable alternativeCount={alternativeCount} version={version} />
              <p className="answer-card-note">Preencha apenas uma opção por questão, usando caneta escura.</p>
            </>
          )}
        </section>

        <section className="print-document print-document--answer-key" data-print-document="answer-key">
          <DocumentHeader exam={exam} subjectName={subjectName} teacherName={user?.name ?? "Professor(a)"} version={version} compact />
          <div className="answer-key-heading">
            <div>
              <p className="print-eyebrow">Uso do professor</p>
              <h2>Gabarito - Versão {version.label}</h2>
            </div>
          </div>
          <ol className="answer-key-grid">
            {version.questions.map((question) => (
              <li key={question.id}>
                <span>{String(question.position).padStart(2, "0")}</span>
                <strong>{answerKeyByPosition.get(question.position) ?? "-"}</strong>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <div className="print-floating-action">
        <Printer aria-hidden="true" size={18} />
        Use um dos botões acima para imprimir ou salvar em PDF.
      </div>
    </div>
  );
}

function AnswerCardTable({ version, alternativeCount }: { version: ExamVersion; alternativeCount: number }) {
  return (
    <div className="answer-card-scan-frame">
      <span aria-hidden="true" className="answer-card-marker answer-card-marker--top-left" />
      <span aria-hidden="true" className="answer-card-marker answer-card-marker--top-right" />
      <span aria-hidden="true" className="answer-card-marker answer-card-marker--bottom-left" />
      <span aria-hidden="true" className="answer-card-marker answer-card-marker--bottom-right" />
      <table className="answer-card-table">
        <colgroup>
          <col className="answer-card-question-column" />
          <col span={alternativeCount} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Questão</th>
            {Array.from({ length: alternativeCount }, (_, index) => (
              <th key={index} scope="col">{letterFor(index + 1)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {version.questions.map((question) => (
            <tr key={question.id}>
              <th scope="row">{String(question.position).padStart(2, "0")}</th>
              {Array.from({ length: alternativeCount }, (_, index) => (
                <td key={index}>{index < question.alternatives.length ? <span className="answer-card-bubble" aria-hidden="true" /> : null}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type DocumentHeaderProps = {
  exam: Exam;
  subjectName: string;
  teacherName: string;
  version: ExamVersion;
  compact?: boolean;
};

function DocumentHeader({ exam, subjectName, teacherName, version, compact = false }: DocumentHeaderProps) {
  return (
    <header className={compact ? "print-document-header print-document-header--compact" : "print-document-header"}>
      <div>
        <p className="print-eyebrow">Sistema de Provas</p>
        <h1>{exam.title}</h1>
        <p className="print-document-subtitle">{subjectName} · Versão {version.label}</p>
      </div>
      <div className="print-header-side">
        <div className="print-meta">
          <p><strong>Professor(a):</strong> {teacherName}</p>
          <p><strong>Turma:</strong> {exam.classGroup || "Não informada"}</p>
          <p><strong>Data:</strong> {formatDate(exam.examDate)}</p>
        </div>
      </div>
    </header>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "____/____/________";
  }
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`));
}

function letterFor(position: number) {
  return String.fromCharCode(64 + position);
}
