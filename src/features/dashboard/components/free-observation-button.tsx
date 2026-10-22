"use client";

import type { ComponentProps } from "react";
import { NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One identity from diagnostic observation through the daily classroom flow. */
export function FreeObservationIdentity({ hint }: { hint?: string }) {
  return <><NotebookPen aria-hidden="true" className="size-5"/><span><strong>Observación libre</strong>{hint && <small>{hint}</small>}</span></>;
}

export function FreeObservationButton({ className, ...props }: Omit<ComponentProps<typeof Button>, "children">) {
  return <Button type="button" variant="outline" title="Anota lo que observas, sin seguir preguntas o indicadores." {...props} className={cn("min-h-12 border-[#80acbc] bg-[#eef8fa] text-[#07576c] hover:bg-[#dff1f5]", className)}><FreeObservationIdentity/></Button>;
}
