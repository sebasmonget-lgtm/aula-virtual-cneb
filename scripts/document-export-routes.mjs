import { listSavedDocuments, loadSavedDocument } from "../src/lib/document-library-service.mjs";
import { createHash } from "node:crypto";
import { enqueuePreparation, publicPreparationJob } from "../src/lib/preparation-jobs.mjs";
import { httpStatusForError, publicErrorMessage } from "../src/lib/version-integrity.mjs";

export async function handleDocumentExportRoutes({request,response,url,db,teacherId,origin,send,annualPlanningContext,storage}){
  if(url.pathname!=="/api/documents/export" || request.method!=="POST")return false;
  try{
    if(!storage){send(response,503,{error:"Conecta el almacenamiento documental privado para preparar la descarga."},origin);return true;}
    const context=await annualPlanningContext();if(!context)throw new Error("Aula no disponible.");
    const catalog=(await listSavedDocuments(db,teacherId)).filter(row=>row.classroom_id===context.id && ["active","confirmed","archived"].includes(row.status));
    if(!catalog.length)throw new Error("Todavía no hay documentos confirmados para descargar.");
    const items=[];
    for(const row of catalog){const document=await loadSavedDocument(db,teacherId,row.kind,row.id);if(document)items.push({kind:row.kind,source_id:row.id,source_version:row.version??1,source_hash:createHash("sha256").update(JSON.stringify(document)).digest("hex")});}
    const row=await enqueuePreparation(db,{teacherId,classroomId:context.id,kind:"document_export",sourceId:context.id,
      sourceRevision:1,input:items,payload:{stage:"documents",items}});
    send(response,202,publicPreparationJob(row),origin);
  }catch(error){send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin);}
  return true;
}
