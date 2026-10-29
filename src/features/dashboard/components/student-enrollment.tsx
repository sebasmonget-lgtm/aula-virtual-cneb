"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { WorkflowFeedback } from "./workflow-ui";

export function StudentEnrollment({studentId,onSaved,disabled=false,onChangeEnrollment}:{studentId?:string;onSaved:()=>Promise<void>;disabled?:boolean;onChangeEnrollment?:(id:string,status:"active"|"inactive")=>Promise<void>}) {
  const [retired,setRetired]=useState<{id:string;name:string}[]>([]),[review,setReview]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{if(studentId||!review)return;let live=true;void apiFetch(`${localDatabaseApiUrl}/api/students/inactive`).then(async response=>{if(!response.ok)throw new Error();return response.json() as Promise<{students:{id:string;name:string}[]}>;}).then(value=>{if(live)setRetired(value.students);}).catch(()=>{if(live)setError("No pudimos consultar los alumnos para recuperar.");});return()=>{live=false;};},[studentId,review]);
  async function change(id:string,status:"active"|"inactive") {
    if(busy||disabled)return;setBusy(true);setError("");
    try{if(onChangeEnrollment)await onChangeEnrollment(id,status);else {const response=await apiFetch(`${localDatabaseApiUrl}/api/students/${id}/enrollment`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status,expectedStatus:status==="active"?"inactive":"active"})});if(!response.ok)throw new Error();}setRetired(items=>items.filter(item=>item.id!==id));await onSaved();}
    catch{setError("No pudimos cambiar la matrícula. Recarga Mi aula y vuelve a intentarlo.");}finally{setBusy(false);}
  }
  return <div>{studentId?<details className="mt-4"><summary className="min-h-11 cursor-pointer font-semibold">Matrícula del alumno</summary><p className="my-3 text-sm">Retirar al niño de la lista activa conserva sus observaciones, documentos e historia. Puedes reincorporarlo desde Mi aula.</p><Button variant="outline" disabled={busy||disabled} onClick={()=>setReview(true)}>Retirar del aula</Button>{review&&<div className="mt-3 flex flex-wrap gap-3"><Button disabled={busy||disabled} onClick={()=>void change(studentId,"inactive")}>Confirmar retiro</Button><Button variant="outline" disabled={busy||disabled} onClick={()=>setReview(false)}>Mantener en el aula</Button></div>}</details>:<><Button type="button" variant="outline" disabled={busy||disabled} aria-expanded={review} onClick={()=>{setError("");setReview(value=>!value);}}>Recuperar niño</Button>{review&&<section className="mt-3 rounded-xl border bg-white p-4" aria-label="Recuperar niño"><p className="font-semibold">Elige al niño que quieres recuperar.</p><ul className="mt-3 space-y-3">{retired.map(student=><li key={student.id} className="flex flex-wrap items-center justify-between gap-3"><span>{student.name}</span><Button disabled={busy||disabled} variant="outline" onClick={()=>void change(student.id,"active")}>Recuperar</Button></li>)}</ul>{!retired.length&&<p className="mt-2 text-sm">No hay niños para recuperar.</p>}</section>}</>}{error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}</div>;
}
