import { KeyRound, Eye, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { getExamVersions } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import type { ExamVersion } from "../types/exams";

export function AnswerKeysPage() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    getExamVersions()
      .then((nextVersions) => {
        if (!ignore) {
          setVersions(nextVersions);
        }
      })
      .catch((requestError: unknown) => {
        if (!ignore) {
          setError(requestError instanceof ApiRequestError ? requestError.message : "Não foi possível carregar os gabaritos.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-950">Gabaritos</h1>
        <p className="mt-1 text-sm text-slate-500">Gabaritos das versões oficiais já geradas.</p>
      </section>

      {error ? (
        <div aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <Card className="px-5 py-12 text-center text-sm text-slate-500">Carregando gabaritos...</Card>
      ) : versions.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <KeyRound aria-hidden="true" className="mx-auto text-teal-800" size={24} />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhum gabarito gerado</h2>
          <p className="mt-2 text-sm text-slate-500">Aprove uma prova e gere suas versões oficiais.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {versions.map((version) => (
            <article className="border border-stone-200 bg-white p-5 shadow-panel" key={version.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-teal-800">Versão {version.label}</p>
                  <h2 className="mt-1 text-base font-semibold text-slate-950">{version.examTitle}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button icon={Eye} onClick={() => navigate(`/provas/${version.examId}`)} variant="secondary">
                    Ver prova
                  </Button>
                  <Button icon={Printer} onClick={() => navigate(`/imprimir/versoes/${version.id}`)} variant="secondary">
                    Imprimir
                  </Button>
                </div>
              </div>
              <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {version.answerKey.map((item) => (
                  <li className="border border-stone-200 px-2 py-2 text-center text-sm text-slate-700" key={item.questionPosition}>
                    <span className="text-slate-500">{item.questionPosition}</span> <strong className="text-slate-950">{item.correctLetter}</strong>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
