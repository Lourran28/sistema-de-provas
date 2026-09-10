import { ArrowLeft, CheckCircle2, Files, ImageUp, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirmation } from "../components/ui/confirmationContext";
import { scanAnswerCard, type AnswerCardScanResult } from "../features/corrections/answerCardScanner";
import { createCorrection } from "../services/correctionService";
import { getExamVersions } from "../services/examService";
import { ApiRequestError } from "../services/httpClient";
import type { CorrectionInput } from "../types/corrections";
import type { ExamVersion } from "../types/exams";

const MAX_BATCH_FILES = 30;
type BatchItemStatus = "ERROR" | "QUEUED" | "READY" | "SAVED" | "SAVING" | "SAVE_ERROR" | "SCANNING";
type BatchItem = { error?: string; file: File; id: string; scan?: AnswerCardScanResult; status: BatchItemStatus };

export function BatchCorrectionPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ExamVersion | null>(null);
  const [classGroup, setClassGroup] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getExamVersions().then((data) => { if (active) setVersions(data); })
      .catch((requestError: unknown) => { if (active) setError(getErrorMessage(requestError, "Não foi possível carregar as versões.")); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const readyItems = items.filter((item) => item.status === "READY" || item.status === "SAVE_ERROR");
  const savedCount = items.filter((item) => item.status === "SAVED").length;
  const reviewCount = items.reduce((total, item) => total + (item.scan?.reviewCount ?? 0), 0);

  async function selectVersion(versionId: string) {
    const version = versions.find((item) => item.id === versionId) ?? null;
    if (!version) { setSelectedVersion(null); return; }
    if (items.length > 0 && !(await confirm({
      confirmLabel: "Trocar versão", description: "As imagens analisadas serão removidas. Correções já salvas não serão alteradas.",
      title: "Trocar versão da prova", variant: "danger"
    }))) return;
    setSelectedVersion(version);
    setItems([]);
    setError("");
    setNotice("");
  }

  function addFiles(fileList: FileList | null) {
    if (!selectedVersion || !fileList) return;
    if (!classGroup.trim()) { setError("Informe a turma antes de adicionar os cartões."); return; }
    const incoming = Array.from(fileList);
    const availableSlots = MAX_BATCH_FILES - items.length;
    if (availableSlots <= 0) { setError(`Cada lote aceita até ${MAX_BATCH_FILES} cartões.`); return; }
    const accepted = incoming.slice(0, availableSlots);
    setError(accepted.length < incoming.length ? `Foram adicionados ${accepted.length} cartões. O limite é ${MAX_BATCH_FILES}.` : "");
    const nextItems = accepted.map((file) => ({ file, id: crypto.randomUUID(), status: "QUEUED" as const }));
    setItems((current) => [...current, ...nextItems]);
    void scanItems(nextItems, selectedVersion);
  }

  async function scanItems(nextItems: BatchItem[], version: ExamVersion) {
    setIsScanning(true);
    setNotice("");
    for (const item of nextItems) {
      setItems((current) => updateItem(current, item.id, { error: undefined, status: "SCANNING" }));
      try {
        const scan = await scanAnswerCard(item.file, version);
        setItems((current) => updateItem(current, item.id, { scan, status: "READY" }));
      } catch (scanError) {
        setItems((current) => updateItem(current, item.id, { error: scanError instanceof Error ? scanError.message : "Não foi possível ler este cartão.", status: "ERROR" }));
      }
    }
    setIsScanning(false);
  }

  async function saveBatch() {
    if (!selectedVersion || readyItems.length === 0) { setError("Analise pelo menos um cartão antes de enviar o lote."); return; }
    if (!classGroup.trim()) { setError("Informe a turma deste lote."); return; }
    setIsSaving(true);
    setError("");
    setNotice("");
    let saved = 0;
    let failed = 0;
    for (const item of readyItems) {
      if (!item.scan) continue;
      setItems((current) => updateItem(current, item.id, { error: undefined, status: "SAVING" }));
      try {
        await createCorrection(buildCorrectionRequest(selectedVersion, classGroup.trim(), item.scan));
        saved += 1;
        setItems((current) => updateItem(current, item.id, { status: "SAVED" }));
      } catch (requestError) {
        failed += 1;
        setItems((current) => updateItem(current, item.id, { error: getErrorMessage(requestError, "Não foi possível salvar este cartão."), status: "SAVE_ERROR" }));
      }
    }
    setIsSaving(false);
    if (saved > 0) setNotice(`${saved} correção(ões) da turma ${classGroup.trim()} foram enviadas para revisão.`);
    if (failed > 0) setError(`${failed} cartão(ões) não foram salvos. Tente novamente.`);
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-teal-800">Correção</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">Correção em lote</h1><p className="mt-1 text-sm text-slate-500">Leia vários cartões da mesma prova e acompanhe o resultado consolidado da turma.</p></div>
        <Button icon={ArrowLeft} onClick={() => navigate("/correcao")} variant="secondary">Correção individual</Button>
      </section>
      {error ? <div aria-live="polite" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div> : null}
      {notice ? <div aria-live="polite" className="border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900" role="status">{notice}</div> : null}

      <section className="grid gap-5 border-y border-stone-200 py-6 lg:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="batch-version">Versão oficial
          <select className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" disabled={isLoading || isScanning || isSaving} id="batch-version" onChange={(event) => void selectVersion(event.target.value)} value={selectedVersion?.id ?? ""}>
            <option value="">{isLoading ? "Carregando versões..." : "Selecione uma versão"}</option>
            {versions.map((version) => <option key={version.id} value={version.id}>{version.examTitle} · Versão {version.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="batch-class">Turma
          <input className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" disabled={isSaving || savedCount > 0} id="batch-class" maxLength={120} onChange={(event) => setClassGroup(event.target.value)} placeholder="Ex.: 8º A" value={classGroup} />
        </label>
      </section>

      {selectedVersion ? <>
        <section className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-semibold uppercase text-teal-800">Versão selecionada</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{selectedVersion.examTitle} · Versão {selectedVersion.label}</h2><p className="mt-1 text-sm text-slate-500">Todos os cartões serão registrados na turma informada.</p></div>
          <label className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white ${!classGroup.trim() ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-teal-800"}`}><ImageUp aria-hidden="true" size={18} />{isScanning ? "Analisando cartões..." : "Adicionar cartões"}<input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isScanning || isSaving || !classGroup.trim()} multiple onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} type="file" /></label>
        </section>
        {items.length === 0 ? <Card className="px-6 py-12 text-center"><Files aria-hidden="true" className="mx-auto text-teal-800" size={26} /><h2 className="mt-4 text-lg font-semibold text-slate-950">Nenhum cartão neste lote</h2><p className="mt-2 text-sm text-slate-500">Informe a turma e adicione as fotos dos cartões-resposta.</p></Card> : <>
          <section className="grid gap-3 sm:grid-cols-3"><BatchMetric label="Cartões no lote" value={String(items.length)} /><BatchMetric label="Marcações para revisar" tone="amber" value={String(reviewCount)} /><BatchMetric label="Enviados para revisão" tone="emerald" value={String(savedCount)} /></section>
          <section className="divide-y divide-stone-200 border border-stone-200 bg-white shadow-panel">{items.map((item) => <BatchItemRow item={item} key={item.id} onRemove={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))} onRetry={() => void scanItems([item], selectedVersion)} />)}</section>
          <section className="flex flex-col gap-4 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">As notas entram no desempenho da turma depois da confirmação.</p><div className="flex flex-col gap-2 sm:flex-row">{savedCount > 0 ? <Button onClick={() => navigate("/revisar-correcoes")} variant="secondary">Abrir revisões</Button> : null}<Button disabled={isScanning || isSaving || readyItems.length === 0} icon={Save} onClick={() => void saveBatch()}>{isSaving ? "Salvando lote..." : `Enviar ${readyItems.length} para revisão`}</Button></div></section>
        </>}
      </> : null}
    </div>
  );
}

function BatchItemRow({ item, onRemove, onRetry }: { item: BatchItem; onRemove: () => void; onRetry: () => void }) {
  const status = batchStatus(item.status);
  return <article className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{item.file.name}</p><p className="mt-1 text-xs text-slate-500">{formatFileSize(item.file.size)}</p>{item.error ? <p className="mt-2 text-sm text-rose-700">{item.error}</p> : null}</div><div><p className={`text-sm font-semibold ${status.className}`}>{status.label}</p>{item.scan ? <p className="mt-1 text-xs text-slate-500">{item.scan.detectedCount} marcadas · {item.scan.reviewCount} revisar</p> : null}</div><div className="flex gap-1">{item.status === "ERROR" ? <Button icon={RefreshCw} onClick={onRetry} variant="ghost">Tentar de novo</Button> : null}{item.status !== "SAVING" && item.status !== "SAVED" ? <Button aria-label={`Remover ${item.file.name}`} className="h-10 w-10 px-0 text-rose-700" icon={Trash2} onClick={onRemove} title="Remover cartão" variant="ghost" /> : null}{item.status === "SAVED" ? <CheckCircle2 aria-label="Enviado para revisão" className="text-emerald-700" size={20} /> : null}</div></article>;
}

function BatchMetric({ label, tone = "teal", value }: { label: string; tone?: "amber" | "emerald" | "teal"; value: string }) {
  const color = tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : "text-teal-800";
  return <article className="border border-stone-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p></article>;
}

function updateItem(items: BatchItem[], itemId: string, changes: Partial<BatchItem>) { return items.map((item) => item.id === itemId ? { ...item, ...changes } : item); }
function buildCorrectionRequest(version: ExamVersion, classGroup: string, scan: AnswerCardScanResult): CorrectionInput {
  return { examVersionId: version.id, classGroup, answers: version.questions.map((question) => { const answer = scan.answers.find((item) => item.questionId === question.id); return { examVersionQuestionId: question.id, selectedAlternativeId: answer?.selectedAlternativeId ?? null, status: answer?.status ?? (question.questionType === "DISCURSIVE" ? "NEEDS_REVIEW" : "BLANK"), awardedPoints: null }; }) };
}
function batchStatus(status: BatchItemStatus) { return { ERROR: { className: "text-rose-700", label: "Leitura não concluída" }, QUEUED: { className: "text-slate-600", label: "Aguardando leitura" }, READY: { className: "text-teal-800", label: "Pronto para revisão" }, SAVED: { className: "text-emerald-700", label: "Enviado para revisão" }, SAVING: { className: "text-teal-800", label: "Salvando correção..." }, SAVE_ERROR: { className: "text-rose-700", label: "Não foi possível salvar" }, SCANNING: { className: "text-teal-800", label: "Analisando bolhas..." } }[status]; }
function formatFileSize(bytes: number) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / 1_000_000) + " MB"; }
function getErrorMessage(error: unknown, fallback: string) { return error instanceof ApiRequestError ? error.message : fallback; }
