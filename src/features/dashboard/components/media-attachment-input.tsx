"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, FolderOpen, Mic, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transcribeShortAudio, type PrivateMediaUpload } from "@/src/lib/local-database";
import { AsyncButton } from "./workflow-ui";

const supported = new Set(["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg"]);

export async function preparePrivateMedia(file: File, {maxEdge=1600,maxBytes=1_000_000}:{maxEdge?:number;maxBytes?:number}={}): Promise<PrivateMediaUpload> {
  const originalType = file.type.split(";")[0];
  let mimeType = originalType === "audio/x-wav" ? "audio/wav" : originalType === "audio/x-m4a" ? "audio/mp4" : originalType;
  if (!supported.has(mimeType)) throw new Error("Usa una foto JPEG, PNG o WebP, o un audio WebM, MP3, M4A, WAV u OGG.");
  let prepared: Blob = file;
  if (mimeType.startsWith("image/")) {
    if(file.size>25_000_000)throw new Error("Elige una foto de hasta 25 MB para prepararla.");
    const bitmap=await createImageBitmap(file);
    try {
      let edge=maxEdge;
      for(const quality of [0.82,0.68,0.54,0.48]) {
        const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height));
        const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        const ctx=canvas.getContext("2d");if(!ctx)throw new Error("No se pudo preparar la foto.");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
        prepared=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("No se pudo preparar la foto.")),"image/jpeg",quality));
        if(prepared.size<=maxBytes)break;edge=Math.round(edge*0.8);
      }
      mimeType="image/jpeg";
    }finally{bitmap.close();}
  }
  if (!prepared.size || prepared.size > (mimeType.startsWith("audio/") ? 8_000_000 : maxBytes))
    throw new Error(mimeType.startsWith("audio/") ? "El audio debe pesar como máximo 8 MB." : "No se pudo reducir la foto. Elige otra imagen.");
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(prepared);
  });
  return { base64, mimeType, name: file.name };
}

export function MediaAttachmentInput({ studentId, context, media, onMedia, onTranscribed, disabled = false, audioOnly = false, rawTranscript = false, onBusyChange }: {
  studentId: string; context: string; media: PrivateMediaUpload | null;
  onMedia: (value: PrivateMediaUpload | null) => void; onTranscribed: (text: string) => void; disabled?: boolean; audioOnly?: boolean; rawTranscript?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const limitRef = useRef<number | null>(null);
  const previewRef = useRef("");
  const busyCallbackRef = useRef(onBusyChange);
  useEffect(() => { busyCallbackRef.current = onBusyChange; }, [onBusyChange]);
  useEffect(() => { busyCallbackRef.current?.(busy || recording); }, [busy, recording]);
  useEffect(() => () => {
    busyCallbackRef.current?.(false);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (limitRef.current !== null) window.clearTimeout(limitRef.current);
    const recorder = recorderRef.current;
    if (recorder) { recorder.ondataavailable = null; recorder.onstop = null; if (recorder.state !== "inactive") recorder.stop(); }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  function clearPreview() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreviewUrl("");
  }
  async function chooseFile(file?: File) {
    if (!file) return;
    setError(""); setTranscript(""); setBusy(true); clearPreview();
    try {
      const prepared = await preparePrivateMedia(file);
      if (audioOnly && !prepared.mimeType.startsWith("audio/")) throw new Error("Selecciona un audio.");
      onMedia(prepared);
    } catch (cause) {
      onMedia(null); setError(cause instanceof Error ? cause.message : "Archivo inválido.");
    } finally { setBusy(false); }
  }
  async function startRecording() {
    setError(""); setTranscript("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador no permite grabar audio. Puedes elegir un archivo."); return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const activeStream = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("Este navegador no ofrece un formato de audio compatible.");
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        activeStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null; recorderRef.current = null;
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        if (limitRef.current !== null) window.clearTimeout(limitRef.current);
        setRecording(false); setBusy(true);
        try {
          const type = recorder.mimeType.split(";")[0];
          const file = new File(chunks, `observacion.${type === "audio/mp4" ? "m4a" : type === "audio/ogg" ? "ogg" : "webm"}`, { type });
          const prepared = await preparePrivateMedia(file);
          clearPreview();
          const url = URL.createObjectURL(file);
          previewRef.current = url; setPreviewUrl(url);
          onMedia(prepared);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo preparar el audio."); }
        finally { setBusy(false); }
      };
      recorder.start();
      const started = Date.now();
      setSeconds(0); setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds(Math.min(59, Math.floor((Date.now() - started) / 1000))), 250);
      limitRef.current = window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 59_000);
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setError(cause instanceof Error && cause.name === "NotAllowedError" ? "Permite el micrófono para grabar audio." : cause instanceof Error ? cause.message : "No se pudo activar el micrófono.");
    }
  }
  return <div className="space-y-2">
    <p className="text-sm font-semibold">{audioOnly ? "Audio" : "Foto o audio"} <span className="font-normal text-muted-foreground">(opcional)</span></p>
    <div className="flex flex-wrap gap-2">
      {!audioOnly && <><input ref={photoInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
        <Button type="button" variant="outline" className="min-h-12 border-[#9eb7ca] bg-white" disabled={disabled || busy || recording} onClick={() => photoInput.current?.click()}><Camera className="size-4" />Tomar foto</Button></>}
      <Button type="button" variant="outline" className="min-h-12 border-[#9eb7ca] bg-white" disabled={disabled || busy} onClick={() => recording ? recorderRef.current?.stop() : void startRecording()}>{recording ? <Square className="size-4" /> : <Mic className="size-4" />}{recording ? `Detener · 0:${String(seconds).padStart(2, "0")}` : "Grabar audio"}</Button>
      <input ref={fileInput} type="file" accept={audioOnly ? "audio/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg" : "image/jpeg,image/png,image/webp,audio/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg"} className="sr-only" tabIndex={-1} onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
      <Button type="button" variant="outline" className="min-h-12 border-[#9eb7ca] bg-white" disabled={disabled || busy || recording} onClick={() => fileInput.current?.click()}><FolderOpen className="size-4" />Elegir archivo</Button>
      {media?.mimeType.startsWith("image/")&&<div className="relative"><Image src={`data:${media.mimeType};base64,${media.base64}`} alt="Vista previa de la foto adjunta" unoptimized width={88} height={64} className="h-16 w-22 rounded-xl object-cover"/><button type="button" aria-label="Quitar foto adjunta" disabled={disabled||busy||recording} className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border bg-white text-[#087d96]" onClick={()=>onMedia(null)}><X className="size-4"/></button></div>}
    </div>
    {media && !media.mimeType.startsWith("image/") && <p role="status" className="text-sm text-[#126177]">Archivo listo: {media.name} <button type="button" className="font-semibold underline" onClick={() => { onMedia(null); setTranscript(""); clearPreview(); }}>Quitar</button></p>}
    {previewUrl && <audio controls preload="metadata" src={previewUrl} className="w-full" aria-label="Escuchar audio adjunto" />}
    {media?.mimeType.startsWith("audio/") && <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Máximo 1 minuto. El archivo se guarda privado. Solo al pulsar «Transcribir» se enviará el audio a OpenAI; revisa el texto antes de guardarlo.</p>
      <AsyncButton type="button" variant="outline" busy={busy} busyLabel="Transcribiendo..." disabled={!studentId || disabled}
        onClick={async () => { setBusy(true); setError(""); try {
          const result = await transcribeShortAudio({ studentId, context, audio: media, purpose: rawTranscript ? "raw_observation" : "observation" });
          setTranscript(result.transcript); onTranscribed(rawTranscript ? result.transcript : result.improvedText);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo transcribir."); }
        finally { setBusy(false); } }}>{rawTranscript ? "Transcribir audio" : "Transcribir y mejorar texto"}</AsyncButton>
      {transcript && <details className="text-xs text-muted-foreground"><summary>Ver transcripción literal</summary><p>{transcript}</p></details>}
    </div>}
    {media && !media.mimeType.startsWith("audio/") && <p className="text-xs text-muted-foreground">Foto preparada hasta 1 MB. Se guarda privada y no se envía a la IA.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
