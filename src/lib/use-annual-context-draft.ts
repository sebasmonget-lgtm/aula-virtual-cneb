"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, apiJson } from "./ayni-api-fetch";
import { localDatabaseApiUrl } from "./local-database";
import { mergeAnnualContextDraft, currentAnnualConversation } from "./annual-context-draft.mjs";
import type { ExperienceContextInput } from "../features/dashboard/components/experience-context-form";

type Draft = { value: ExperienceContextInput; importedTurns: number[]; importedItems?: {text:string;source_turn:number}[] };
export type AnnualContextConversation = { id: string; revision: number; status: string;
  contextItems?: { text: string; source_turn: number }[]; contextDraft?: Draft | null };
const empty = (): Draft => ({ value: { contextItems: [], historicalProjects: [] }, importedTurns: [] });
const fingerprint = (draft: Draft) => JSON.stringify(draft);

export function useAnnualContextDraft() {
  const [draft, setDraft] = useState<Draft>(empty);
  const draftRef = useRef(draft), identity = useRef<string | null>(null);
  const [conversation, setConversation] = useState<AnnualContextConversation | null>(null);
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const saved = useRef(fingerprint(draft)), writing = useRef(false);
  const replace = useCallback((next: Draft) => {
    draftRef.current = next; setDraft(next); setDirty(fingerprint(next) !== saved.current);
  }, []);
  const captureConversation = useCallback((value: AnnualContextConversation) => {
    let base = draftRef.current;
    if (identity.current !== value.id) {
      identity.current = value.id;
      base = value.contextDraft ?? { ...base, importedTurns: [] };
      if (value.contextDraft) saved.current = fingerprint(base);
    }
    replace(mergeAnnualContextDraft(base, value.contextItems ?? []));
    setConversation(previous => currentAnnualConversation(previous,value));
  }, [replace]);
  const change = useCallback((value: ExperienceContextInput) => {
    setError(""); replace({ ...draftRef.current, value });
  }, [replace]);
  const seed = useCallback((value: ExperienceContextInput) => {
    if (identity.current) return;
    const next = { value, importedTurns: [] };
    saved.current = fingerprint(next); replace(next);
  }, [replace]);
  const read = useCallback(async (id: string) => {
    const response = await apiFetch(`${localDatabaseApiUrl}/api/annual-journey/conversation?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const value = await apiJson<AnnualContextConversation & { error?: string }>(response);
    if (!response.ok) throw new Error(value.error ?? "No pude recuperar el contexto. Tus cambios siguen aquí.");
    return value;
  }, []);
  useEffect(() => {
    if (!dirty || saving || error || !conversation || ["responding", "interrupted"].includes(conversation.status)) return;
    const timer = window.setTimeout(async () => {
      if (writing.current) return;
      writing.current = true; setSaving(true);
      const pending = draftRef.current;
      try {
        const response = await apiFetch(`${localDatabaseApiUrl}/api/annual-journey/conversation`, {
          method: "PUT", headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: conversation.id, expectedRevision: conversation.revision, contextDraft: pending }) });
        const value = await apiJson<AnnualContextConversation & { error?: string }>(response);
        if (!response.ok) throw new Error(value.error ?? "No pude guardar el contexto. Tus cambios siguen aquí.");
        const persisted = value.contextDraft!;
        saved.current = fingerprint(persisted);
        // Edits made while the request was starting must remain pending.
        if (fingerprint(draftRef.current) === fingerprint(pending)) replace(persisted);
        setConversation(value); setError("");
      } catch (cause) {
        // Read after an uncertain response, without repeating a write or calling AI.
        try {
          const recovered = await read(conversation.id);
          // Retain local edits, but retry against the authoritative revision rather than the stale write.
          setConversation(recovered);
          const normalized = (value: Draft) => JSON.stringify({ ...value, value: { ...value.value,
            historicalProjects: value.value.historicalProjects.map(item => ({ ...item, period: item.period ?? null })) } });
          if (recovered.contextDraft && normalized(recovered.contextDraft) === normalized(pending)) {
            saved.current = fingerprint(recovered.contextDraft);
            if (fingerprint(draftRef.current) === fingerprint(pending)) replace(recovered.contextDraft);
            setConversation(recovered); setError(""); return;
          }
        } catch { /* Keep the teacher's local draft and stop automatic retries. */ }
        setError(cause instanceof Error ? cause.message : "No pude guardar el contexto. Tus cambios siguen aquí.");
      } finally { writing.current = false; setSaving(false); }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [dirty, saving, error, conversation, draft, read, replace]);
  const reloadSaved = async () => {
    if (!conversation || saving || !window.confirm("¿Recargar el contexto guardado? Se descartarán los cambios pendientes de esta ventana.")) return;
    try {
      const value = await read(conversation.id), next = value.contextDraft ?? empty();
      saved.current = fingerprint(next); replace(next); setConversation(value); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pude recuperar el contexto."); }
  };
  return { value: draft.value, change, seed, captureConversation, conversationId: conversation?.id,
    revision: conversation?.revision, dirty, saving, error, retry: () => setError(""), reloadSaved };
}
