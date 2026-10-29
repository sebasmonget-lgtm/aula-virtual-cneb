import JSZip from 'jszip';
import {isDocumentGenerator} from './ayni-product-mode.mjs';
import {CurriculumPermissionError} from './classroom-curriculum-scope.mjs';
import {VersionConflictError} from './version-integrity.mjs';
import {loadDocumentGeneratorProjectExport,loadMultiAgeDocument} from './multi-age-document-service.mjs';
import {loadSavedDocument} from './document-library-service.mjs';
import {renderMultiAgePlanningWord} from './multi-age-planning-word.mjs';
import {renderSavedDocumentWord} from './document-word-export.mjs';
import {normalizedDownloadName,savedDocumentDownloadName} from './document-download-name.mjs';

/** Capture authorized immutable document IDs before rendering. Never emit a partial archive. */
export async function buildDocumentGeneratorProjectZip(db,teacherId,id,{legacy=false,cards=[],logo=null}={}){
  const read=async tx=>{
    if(!await isDocumentGenerator(tx,teacherId))throw new CurriculumPermissionError();
    if(!legacy){
      const prepared=await loadDocumentGeneratorProjectExport(tx,teacherId,id),activities=[];
      for(const item of [...prepared.activityRoute].sort((a,b)=>a.position-b.position))activities.push(await loadMultiAgeDocument(tx,teacherId,'activity',item.id));
      return {...prepared,activities};
    }
    const document=await loadSavedDocument(tx,teacherId,'experience',id);
    if(!document||document.subtype!=='project'||!['active','archived'].includes(document.status))throw new CurriculumPermissionError();
    if(document.content?.document_template_version==='experience-unified-v2'&&!document.formal_ready)throw new VersionConflictError('Prepara primero el Word del proyecto.');
    const rows=(await tx.query(`select a.id from activities a join learning_experiences p on p.id=a.experience_id
      join classrooms c on c.id=p.classroom_id join school_years sy on sy.id=c.school_year_id
      where a.experience_id=$1 and c.teacher_id=$2 and sy.owner_id=$2 and a.status in ('active','archived') order by a.occurs_on,a.id`,[id,teacherId])).rows;
    const activities=[];
    for(const row of rows){const activity=await loadSavedDocument(tx,teacherId,'activity',row.id);if(!activity)throw new CurriculumPermissionError();activities.push(activity);}
    return {document,activities};
  };
  // V2 loaders require the factory's DB identity and validate every frozen parent fingerprint.
  // Legacy readers accept transaction handles, so retain one repeatable snapshot there.
  const snapshot=legacy?await db.transaction(async tx=>{await tx.query('set transaction isolation level repeatable read read only');return read(tx);}):await read(db);
  const zip=new JSZip(),{document,activities}=snapshot,projectName=savedDocumentDownloadName(document);
  const projectBytes=legacy?await renderSavedDocumentWord(document,cards,{logo}):await renderMultiAgePlanningWord(document,{activityRoute:snapshot.activityRoute,practical:true});
  zip.file(`01 Proyecto/${projectName}`,projectBytes);
  for(const activity of activities){
    const name=savedDocumentDownloadName(activity,{project:document});
    if(zip.file(`02 Actividades/${name}`))throw new VersionConflictError('Dos actividades tienen el mismo nombre de descarga. Revisa la numeración del proyecto.');
    const bytes=legacy?await renderSavedDocumentWord(activity,cards,{logo}):await renderMultiAgePlanningWord(activity,{practical:true});
    zip.file(`02 Actividades/${name}`,bytes);
  }
  return {filename:normalizedDownloadName([projectName.replace(/\.docx$/,''),'Proyecto y actividades'],'zip'),
    bytes:await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}}),activityCount:activities.length};
}
