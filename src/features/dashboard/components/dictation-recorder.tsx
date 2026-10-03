"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transcribeShortAudio, type PrivateMediaUpload } from "@/src/lib/local-database";
import { preparePrivateMedia } from "./media-attachment-input";
import { AsyncButton } from "./workflow-ui";
import { mergeDictationText } from "@/src/lib/dictation-text.mjs";

const MAX_RECORDING_MS = 59_000; // Leave room for container finalization under the server's 60-second limit.
const recorderTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
const fileExtensions: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };
type Status = "idle" | "requesting" | "recording" | "preparing" | "ready" | "transcribing";

export function DictationRecorder({ studentId, classroomScope = false, context, currentText, onTranscribed, onBusyChange, purpose = "observation", rawTranscript = false, disabled = false, iconOnly=false, autoTranscribe=false }: {
  studentId?: string; classroomScope?: boolean; context: string; currentText: string; onTranscribed: (text: string, saveNow: boolean) => Promise<void> | void;
  onBusyChange?: (busy: boolean) => void; purpose?: "observation" | "raw_observation" | "interview" | "teacher_comment" | "group_summary"; rawTranscript?: boolean; disabled?: boolean; iconOnly?:boolean; autoTranscribe?:boolean;
}) {
  const isInterview = purpose === "interview";
  const hasScope = Boolean(studentId) || (classroomScope && purpose === "group_summary");
  const maxLength = isInterview ? 2000 : ["observation", "raw_observation"].includes(purpose) ? 4000 : 3000;
  const recordingLabel = "Dictar";
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<PrivateMediaUpload | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef("");
  const intervalRef = useRef<number | null>(null);
  const limitRef = useRef<number | null>(null);
  const discardRef = useRef(false);
  const mountedRef = useRef(false);
  const currentTextRef = useRef(currentText);
  const heldRef = useRef(false);
  const autoTranscribeRef = useRef(false);
  const busyCallbackRef = useRef(onBusyChange);

  useEffect(() => { currentTextRef.current = currentText; }, [currentText]);
  useEffect(() => { busyCallbackRef.current = onBusyChange; }, [onBusyChange]);
  useEffect(() => { busyCallbackRef.current?.(["requesting", "recording", "preparing", "transcribing"].includes(status)); }, [status]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      busyCallbackRef.current?.(false);
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      if (limitRef.current !== null) window.clearTimeout(limitRef.current);
      const recorder = recorderRef.current;
      if (recorder) { recorder.ondataavailable = null; recorder.onstop = null; recorder.onerror = null; if (recorder.state !== "inactive") recorder.stop(); }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearTimers() {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (limitRef.current !== null) window.clearTimeout(limitRef.current);
    intervalRef.current = null;
    limitRef.current = null;
  }

  function clearPreview() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreviewUrl("");
    setAudio(null);
  }

  async function startRecording(holdMode = false) {
    if (disabled || !hasScope) return;
    autoTranscribeRef.current = autoTranscribe;
    setError(""); clearPreview(); setSeconds(0); setStatus("requesting");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("idle"); setError("Este navegador no permite grabar desde el micrófono. Puedes escribir la respuesta."); return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      if (holdMode && !heldRef.current) { stream.getTracks().forEach((track) => track.stop()); setStatus("idle"); return; }
      streamRef.current = stream;
      const mimeType = recorderTypes.find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("Este navegador no ofrece un formato de grabación compatible. Puedes escribir la respuesta.");
      const recorder = new MediaRecorder(stream, { mimeType });
      const baseType = recorder.mimeType.split(";")[0];
      if (!fileExtensions[baseType]) throw new Error("No se pudo preparar un formato de audio compatible.");
      const chunks: Blob[] = [];
      discardRef.current = false;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onerror = () => {
        discardRef.current = true; clearTimers(); stopStream(); recorderRef.current = null;
        if (mountedRef.current) { setStatus("idle"); setError("Se interrumpió la grabación. Inténtalo de nuevo o escribe la respuesta."); }
      };
      recorder.onstop = async () => {
        clearTimers(); stopStream(); recorderRef.current = null;
        if (discardRef.current || !mountedRef.current) return;
        setStatus("preparing");
        try {
          const recorded = new Blob(chunks, { type: baseType });
          const file = new File([recorded], `respuesta.${fileExtensions[baseType]}`, { type: baseType });
          const prepared = await preparePrivateMedia(file);
          if (!mountedRef.current) return;
          const url = URL.createObjectURL(recorded);
          previewRef.current = url; setPreviewUrl(url); setAudio(prepared); setStatus("ready");
          if (autoTranscribeRef.current) { autoTranscribeRef.current = false; await transcribePrepared(prepared, true); }
        } catch (cause) {
          if (mountedRef.current) { setStatus("idle"); setError(cause instanceof Error ? cause.message : "No se pudo preparar la grabación."); }
        }
      };
      recorder.start();
      const startedAt = Date.now();
      intervalRef.current = window.setInterval(() => setSeconds(Math.min(59, Math.floor((Date.now() - startedAt) / 1000))), 250);
      limitRef.current = window.setTimeout(() => { if (recorder.state === "recording") { autoTranscribeRef.current = holdMode||autoTranscribe; recorder.stop(); } }, MAX_RECORDING_MS);
      setStatus("recording");
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (mountedRef.current) {
        setStatus("idle");
        setError(cause instanceof Error && cause.name === "NotAllowedError"
          ? "Permite el micrófono para grabar o escribe la respuesta en el cuadro de texto."
          : cause instanceof Error ? cause.message : "No se pudo activar el micrófono.");
      }
    }
  }

  function cancelRecording() {
    heldRef.current = false; autoTranscribeRef.current = false;
    discardRef.current = true;
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    clearTimers(); stopStream(); clearPreview(); setSeconds(0); setStatus("idle"); setError("");
  }

  async function transcribePrepared(prepared: PrivateMediaUpload, saveNow = false) {
    setStatus("transcribing"); setError("");
    try {
      const result = await transcribeShortAudio({ ...(classroomScope ? { scope: "classroom" as const } : { studentId }), context, audio: prepared, purpose });
      const text = rawTranscript ? result.transcript : purpose === "observation" ? result.improvedText : result.transcript;
      const combined = purpose === "raw_observation"
        ? (currentTextRef.current ? `${currentTextRef.current}\n${text}` : text)
        : mergeDictationText(currentTextRef.current, text, maxLength);
      if (combined.length > maxLength) throw new Error(`El texto supera ${maxLength} caracteres.`);
      if (!mountedRef.current) return;
      await onTranscribed(combined, saveNow); clearPreview(); setStatus("idle");
    } catch (cause) {
      if (mountedRef.current) { setStatus("ready"); setError(cause instanceof Error ? cause.message : "No se pudo preparar la respuesta. Puedes escribirla."); }
    }
  }

  function releaseHeldRecording() {
    heldRef.current = false;
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") { autoTranscribeRef.current = true; recorder.stop(); }
  }

  if(iconOnly) return <div className="relative shrink-0 print:hidden"><Button type="button" size="icon" variant="ghost" className={`size-12 rounded-full ${status==="recording"?"bg-red-100 text-red-700":"bg-[#e1f3f5] text-[#087d96] hover:bg-[#ccebef]"}`} disabled={disabled||!hasScope||["requesting","preparing","transcribing"].includes(status)} aria-label={status==="recording"?"Detener dictado y transcribir":"Dictar"} title={status==="recording"?`Detener · ${seconds}s`:"Dictar: pulsa para empezar y otra vez para terminar"} onClick={()=>{if(status==="recording"){autoTranscribeRef.current=true;recorderRef.current?.stop();}else void startRecording();}}>{["requesting","preparing","transcribing"].includes(status)?<LoaderCircle className="size-5 motion-safe:animate-spin"/>:status==="recording"?<Square className="size-5"/>:<Mic className="size-5"/>}</Button><span role="status" className="sr-only">{status==="recording"?`Grabando ${seconds} segundos`:status==="transcribing"?"Transcribiendo":""}</span>{error&&<div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border bg-white p-3 shadow-lg"><p role="alert" className="text-xs text-red-700">{error}</p>{audio&&<Button size="sm" disabled={disabled||status==="transcribing"} onClick={()=>void transcribePrepared(audio)}>Reintentar transcripción</Button>}<Button variant="ghost" size="sm" onClick={cancelRecording}>Cerrar</Button></div>}</div>;
  return <div className="space-y-2 print:hidden">
    <div className="flex flex-wrap items-center gap-2">
      {(status === "idle" || status === "ready" || status === "requesting" || status === "recording") && <Button type="button" variant="outline" disabled={disabled || !hasScope} className={`min-h-12 touch-none select-none border-[#087d96] text-[#07576c] sm:hidden ${status === "recording" ? "border-red-600 bg-red-50 text-red-700" : ""}`} aria-label={isInterview ? "Dictar: mantén pulsado; suelta para guardar la respuesta" : `Mantén pulsado para ${recordingLabel.toLocaleLowerCase("es")}; suelta para añadir el texto`} onContextMenu={(event) => event.preventDefault()} onPointerDown={(event) => { if (disabled || !hasScope || (status !== "idle" && status !== "ready")) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); heldRef.current = true; void startRecording(true); }} onPointerUp={releaseHeldRecording} onPointerCancel={cancelRecording}><Mic className="size-4" /> {status === "recording" ? (isInterview ? "Suelta para guardar" : "Suelta para añadir") : (isInterview ? "Dictar · mantén pulsado" : "Dictar · mantén pulsado")}</Button>}
      {status === "idle" && <Button type="button" variant="outline" disabled={disabled || !hasScope} className="hidden min-h-11 border-[#087d96] text-[#07576c] sm:inline-flex" onClick={() => void startRecording()}><Mic className="size-4" /> {recordingLabel}</Button>}
      {status === "requesting" && <p role="status" className="text-sm text-[#126177]">Solicitando acceso al micrófono…</p>}
      {status === "recording" && <><Button type="button" variant="outline" className="hidden min-h-11 border-red-600 text-red-700 sm:inline-flex" onClick={() => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }}><Square className="size-4" /> Detener grabación</Button><span role="status" className="text-sm font-semibold text-red-700">Grabando · 0:{String(seconds).padStart(2, "0")} / 1:00</span><Button type="button" variant="ghost" className="hidden sm:inline-flex" onClick={cancelRecording}><Trash2 className="size-4" /> Descartar</Button></>}
      {status === "preparing" && <p role="status" className="text-sm text-[#126177]">Preparando grabación…</p>}
    </div>
    {previewUrl && <div className="space-y-2 rounded-xl border border-[#d4e1ed] bg-[#f8fbff] p-3"><audio controls preload="metadata" src={previewUrl} className="w-full" aria-label="Escuchar grabación" /><div className="flex flex-wrap items-center gap-2"><AsyncButton type="button" disabled={disabled || !hasScope} busy={status === "transcribing"} busyLabel="Preparando texto…" onClick={() => { if (audio) void transcribePrepared(audio); }}>Aceptar grabación</AsyncButton><Button type="button" variant="outline" disabled={disabled || status === "transcribing"} onClick={() => { cancelRecording(); if (window.matchMedia("(min-width: 640px)").matches) void startRecording(); }}><Mic className="size-4" /> Rehacer grabación</Button><Button type="button" variant="ghost" disabled={status === "transcribing"} onClick={cancelRecording}><Trash2 className="size-4" /> Descartar</Button></div></div>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
