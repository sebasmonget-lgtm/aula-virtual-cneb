"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { WorkflowFeedback } from "./workflow-ui";

export function StudentEnrollment({studentId,onSaved}:{studentId?:string;onSaved:()=>Promise<void>}) {
  const [retired,setRetired]=useState<{id:string;name:string}[]>([]),[review,setReview]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{if(studentId)return;let live=true;void apiFetch(`${localDatabaseApiUrl}/api/students/inactive`).then(async response=>response.ok?response.json() as Promise<{students:{id:string;name:string}[]}>:null).then(value=>{if(live&&value)setRetired(value.students);}).catch(()=>{if(live)setError("No pudimos consultar los alumnos retirados.");});return()=>{live=false;};},[studentId]);
  async function change(id:string,status:"active"|"inactive") {
    if(busy)return;setBusy(true);setError("");
    try{const response=await apiFetch(`${localDatabaseApiUrl}/api/students/${id}/enrollment`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status,expectedStatus:status==="active"?"inactive":"active"})});if(!response.ok)throw new Error();setRetired(items=>items.filter(item=>item.id!==id));await onSaved();}
    catch{setError("No pudimos cambiar la matrícula. Recarga Mi aula y vuelve a intentarlo.");}finally{setBusy(false);}
  }
  return <div>{studentId?<details className="mt-4"><summary className="min-h-11 cursor-pointer font-semibold">Matrícula del alumno</summary><p className="my-3 text-sm">Retirar al niño de la lista activa conserva sus observaciones, documentos e historia. Puedes reincorporarlo desde Mi aula.</p><Button variant="outline" disabled={busy} onClick={()=>setReview(true)}>Retirar del aula</Button>{review&&<div className="mt-3 flex flex-wrap gap-3"><Button disabled={busy} onClick={()=>void change(studentId,"inactive")}>Confirmar retiro</Button><Button variant="outline" disabled={busy} onClick={()=>setReview(false)}>Mantener en el aula</Button></div>}</details>:!!retired.length&&<details className="rounded-xl border bg-white p-4"><summary className="min-h-11 cursor-pointer font-semibold">Alumnos retirados · {retired.length}</summary><ul className="mt-3 space-y-3">{retired.map(student=><li key={student.id} className="flex flex-wrap items-center justify-between gap-3"><span>{student.name}</span><Button disabled={busy} variant="outline" onClick={()=>void change(student.id,"active")}>Reincorporar</Button></li>)}</ul></details>}{error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}</div>;
}
