"use client";

import { useState } from "react";
import { transcribeShortAudio, type PrivateMediaUpload } from "@/src/lib/local-database";
import { AsyncButton } from "./workflow-ui";

const supported = new Set(["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg"]);

export async function preparePrivateMedia(file: File): Promise<PrivateMediaUpload> {
  const originalType = file.type.split(";")[0];
  let mimeType = originalType === "audio/x-wav" ? "audio/wav" : originalType === "audio/x-m4a" ? "audio/mp4" : originalType;
  if (!supported.has(mimeType)) throw new Error("Usa una foto JPEG, PNG o WebP, o un audio WebM, MP3, M4A, WAV u OGG.");
  let prepared: Blob = file;
  if (mimeType.startsWith("image/") && file.size > 3_000_000) {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      prepared = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo preparar la foto.")), "image/jpeg", 0.78));
      mimeType = "image/jpeg";
    } finally { bitmap.close(); }
  }
  if (!prepared.size || prepared.size > (mimeType.startsWith("audio/") ? 8_000_000 : 3_000_000))
    throw new Error(mimeType.startsWith("audio/") ? "El audio debe pesar como máximo 8 MB." : "La foto debe pesar como máximo 3 MB.");
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(prepared);
  });
  return { base64, mimeType, name: file.name };
}

export function MediaAttachmentInput({ studentId, context, media, onMedia, onTranscribed, disabled = false, audioOnly = false }: {
  studentId: string; context: string; media: PrivateMediaUpload | null;
  onMedia: (value: PrivateMediaUpload | null) => void; onTranscribed: (text: string) => void; disabled?: boolean; audioOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  return <div className="space-y-2">
    <label className="block text-sm font-semibold">{audioOnly ? "Audio" : "Foto o audio"} <span className="font-normal text-muted-foreground">(opcional)</span>
      <input type="file" accept={audioOnly ? "audio/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg" : "image/jpeg,image/png,image/webp,audio/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg"}
        disabled={disabled || busy} className="mt-2 block w-full text-sm" onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          setError(""); setTranscript(""); setBusy(true);
          try { const prepared = await preparePrivateMedia(file); if (audioOnly && !prepared.mimeType.startsWith("audio/")) throw new Error("Selecciona un audio."); onMedia(prepared); }
          catch (cause) { onMedia(null); setError(cause instanceof Error ? cause.message : "Archivo inválido."); }
          finally { setBusy(false); }
        }} />
    </label>
    {media && <p className="text-xs text-[#126177]">Archivo listo: {media.name} <button type="button" className="underline" onClick={() => { onMedia(null); setTranscript(""); }}>Quitar</button></p>}
    {media?.mimeType.startsWith("audio/") && <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Máximo 1 minuto. El archivo se guarda privado. Solo al pulsar «Transcribir» se enviará el audio a OpenAI; revisa el texto antes de guardarlo.</p>
      <AsyncButton type="button" variant="outline" busy={busy} busyLabel="Transcribiendo..." disabled={!studentId || disabled}
        onClick={async () => { setBusy(true); setError(""); try {
          const result = await transcribeShortAudio({ studentId, context, audio: media });
          setTranscript(result.transcript); onTranscribed(result.improvedText);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo transcribir."); }
        finally { setBusy(false); } }}>Transcribir y mejorar texto</AsyncButton>
      {transcript && <details className="text-xs text-muted-foreground"><summary>Ver transcripción literal</summary><p>{transcript}</p></details>}
    </div>}
    {media && !media.mimeType.startsWith("audio/") && <p className="text-xs text-muted-foreground">La foto se guarda privada y no se envía a la IA.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
