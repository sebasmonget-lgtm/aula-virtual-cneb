import {loadMultiAgeDocument} from './multi-age-document-service.mjs';
import {loadSavedDocument} from './document-library-service.mjs';
import {savedDocumentDownloadName} from './document-download-name.mjs';

/** Document has already passed its authorized loader. Resolve its saved parent, never today's map. */
export async function documentGeneratorSavedFilename(db,teacherId,document){
  let project=null;
  if(document.kind==='activity'&&!document.content?.workshop_catalog){
    if(document.contract==='AyniMultiAgeDocument/v1'){
      const row=(await db.query(`select a.details->'activity_contract'->>'project_revision_id' as revision_id
        from activities a join learning_experiences p on p.id=a.experience_id join classrooms c on c.id=p.classroom_id
        join school_years sy on sy.id=c.school_year_id where a.id=$1 and c.teacher_id=$2 and sy.owner_id=$2`,[document.id,teacherId])).rows[0];
      project=await loadMultiAgeDocument(db,teacherId,'project',row?.revision_id??document.sourceSnapshot.projectId);
    }else if(document.experience_id)project=await loadSavedDocument(db,teacherId,'experience',document.experience_id);
  }
  return savedDocumentDownloadName(document,{project});
}
