"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

/** Call only after a successful response from the saving API. */
export function useSaveConfirmation() {
  const [confirmation, setConfirmation] = useState<{ title: string; description: string; sequence: number } | null>(null);
  useEffect(() => {
    if (!confirmation) return;
    const timer = window.setTimeout(() => setConfirmation(null), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmation]);
  function confirm(title: string, description = "") {
    setConfirmation(current => ({ title, description, sequence: (current?.sequence ?? 0) + 1 }));
  }
  return { confirmation, confirm };
}

export function SaveConfirmation({ confirmation }: { confirmation: ReturnType<typeof useSaveConfirmation>["confirmation"] }) {
  return <div role="status" aria-live="polite" aria-atomic="true" className="ayni-save-confirmation-host">
    {confirmation && <div className="ayni-save-confirmation"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" /><div><p className="font-bold">{confirmation.title}</p>{confirmation.description && <p className="mt-1 text-sm">{confirmation.description}</p>}</div></div>}
  </div>;
}
