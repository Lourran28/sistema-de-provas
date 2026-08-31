import { BrainCircuit, Camera, ImageUp, ScanLine, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import type { ExamVersion } from "../../types/exams";
import { scanAnswerCard, type AnswerCardScanResult } from "./answerCardScanner";

type AnswerCardImportPanelProps = {
  version: ExamVersion;
  onImported: (scan: AnswerCardScanResult) => void;
};

export function AnswerCardImportPanel({ version, onImported }: AnswerCardImportPanelProps) {
  const [scan, setScan] = useState<AnswerCardScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setIsScanning(true);
    setError("");
    try {
      const nextScan = await scanAnswerCard(file, version);
      setScan(nextScan);
      onImported(nextScan);
    } catch (scanError) {
      setScan(null);
      setError(scanError instanceof Error ? scanError.message : "Não foi possível ler as marcações do cartão.");
    } finally {
      setIsScanning(false);
    }
  }, [onImported, version]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setIsStartingCamera(false);
  }, []);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function openCamera() {
    if (!window.isSecureContext) {
      setError("A câmera ao vivo precisa de uma conexão segura. Abra o sistema em HTTPS para usá-la no celular.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("A câmera não está disponível neste navegador. Envie uma imagem do cartão para continuar.");
      return;
    }
    setError("");
    setIsCameraOpen(true);
    setIsStartingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          height: { ideal: 1920 },
          width: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        throw new Error("Não foi possível preparar a prévia da câmera.");
      }
      video.srcObject = stream;
      await video.play();
    } catch (cameraError) {
      stopCamera();
      setError(cameraError instanceof Error && cameraError.name === "NotAllowedError"
        ? "Permita o acesso à câmera para fotografar o cartão."
        : "Não foi possível abrir a câmera. Tente novamente ou envie uma imagem do cartão.");
    } finally {
      setIsStartingCamera(false);
    }
  }

  function captureCard() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("A câmera ainda está sendo preparada. Aguarde um instante e tente capturar novamente.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Não foi possível preparar a foto do cartão.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Não foi possível capturar a foto do cartão.");
        return;
      }
      stopCamera();
      void handleFile(new File([blob], `cartao-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  return (
    <section className="border-y border-stone-200 py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800"><BrainCircuit aria-hidden="true" size={17} /></span>
          <div>
            <p className="text-xs font-semibold uppercase text-teal-800">Etapa 3 · Leitura inteligente</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Analisar bolhas preenchidas</h2>
            <p className="mt-1 text-sm text-slate-500">Envie ou fotografe o cartão inteiro. A leitura encontra as bolhas marcadas e separa as respostas ambíguas para sua revisão.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400">
            <ImageUp aria-hidden="true" size={18} />
            {isScanning ? "Analisando..." : "Enviar imagem"}
            <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isScanning || isStartingCamera} onChange={(event) => void handleFile(event.target.files?.[0])} type="file" />
          </label>
          <Button disabled={isScanning || isStartingCamera} icon={Camera} onClick={() => void openCamera()} variant="secondary">{isStartingCamera ? "Abrindo câmera..." : "Abrir câmera"}</Button>
        </div>
      </div>

      {error ? <p aria-live="polite" className="mt-3 text-sm text-rose-700" role="alert">{error}</p> : null}

      {isCameraOpen ? (
        <div className="mt-5 border border-stone-200 bg-slate-950 p-3 shadow-panel">
          <div className="relative aspect-[3/4] overflow-hidden bg-black sm:aspect-video">
            <video autoPlay className="h-full w-full object-cover" muted playsInline ref={videoRef} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-[7%] border-2 border-white/80" />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button disabled={isStartingCamera} icon={Camera} onClick={captureCard}>{isStartingCamera ? "Preparando..." : "Capturar cartão"}</Button>
            <Button aria-label="Fechar câmera" icon={X} onClick={stopCamera} variant="secondary">Fechar câmera</Button>
          </div>
        </div>
      ) : null}

      {scan ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="overflow-hidden border border-stone-200 bg-slate-950">
            <img alt="Prévia da leitura do cartão com os campos analisados" className="max-h-[30rem] w-full object-contain" src={scan.previewUrl} />
          </div>
          <div className="border border-stone-200 bg-white p-4 shadow-panel">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><ScanLine aria-hidden="true" className="text-teal-700" size={18} /> Análise concluída</div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Marcadas</dt><dd className="font-semibold text-emerald-700">{scan.detectedCount}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Em branco</dt><dd className="font-semibold text-slate-700">{scan.blankCount}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Para revisar</dt><dd className="font-semibold text-amber-700">{scan.reviewCount}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Imagem analisada</dt><dd className="font-semibold text-slate-700">{scan.imageWidth} × {scan.imageHeight}</dd></div>
            </dl>
            <p className="mt-5 border-t border-stone-200 pt-4 text-xs leading-5 text-slate-500">Verde indica uma bolha lida. Amarelo indica marca fraca ou mais de uma opção e pede sua conferência antes de salvar.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
