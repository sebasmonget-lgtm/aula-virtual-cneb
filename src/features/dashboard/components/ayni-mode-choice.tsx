'use client';
import {Button} from '@/components/ui/button';

export function AyniModeChoice({saving,onChoose,generatorOnly=false,documentsAvailable=true}:{saving:boolean;onChoose:(mode:'daily'|'documents')=>void;generatorOnly?:boolean;documentsAvailable?:boolean}){
 return <main className="mx-auto max-w-3xl px-5 py-12 text-[#19334d]">
  <h1 className="text-3xl font-bold">¿Cómo quieres usar Ayni?</h1>
  <p className="mt-3 max-w-prose text-[#526b87]">Elige cómo trabajarás en esta cuenta. En ambas opciones podrás preparar y descargar tus planes.</p>
  <div className={`mt-8 grid gap-5 ${generatorOnly||!documentsAvailable?'':'sm:grid-cols-2'}`}>
   {!generatorOnly&&<section className="ayni-panel flex flex-col gap-4 rounded-2xl bg-white p-6">
    <h2 className="text-xl font-bold">Acompañamiento del aula</h2>
    <p className="grow">Planifica, registra observaciones y acompaña la evaluación de tus niños durante el año.</p>
    <Button className="min-h-12 whitespace-normal" disabled={saving} onClick={()=>onChoose('daily')}>Usar Ayni en el aula</Button>
   </section>}
   {documentsAvailable&&<section className="ayni-panel flex flex-col gap-4 rounded-2xl bg-white p-6">
    <h2 className="text-xl font-bold">Solo generar documentos</h2>
    <p className="grow">Conversa con Ayni y descarga tu plan anual, proyectos y actividades. Las observaciones se completan en Word.</p>
    <Button className="min-h-12 whitespace-normal" disabled={saving} onClick={()=>onChoose('documents')}>Preparar mis documentos</Button>
   </section>}
  </div>
  {saving&&<p className="mt-4" role="status">Guardando tu elección…</p>}
 </main>;
}
