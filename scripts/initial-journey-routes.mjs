import { randomUUID, randomBytes, createHash } from "node:crypto";
import { versionTransaction } from "../src/lib/version-integrity.mjs";
import { applicableDiagnosticCompetencies, validateFamilyInterviewDetails } from "../src/lib/diagnostic-sources-v4.mjs";
import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { buildClassifierOptions, createOpenAICompetencyClassifier } from "../src/lib/openai-competency-classifier.mjs";
import { annualJourneySafeText } from "../src/lib/annual-journey-privacy.mjs";
import { previewKey } from "../src/lib/initial-journey-service.mjs";

async function ownedStudent(db,teacherId,id) {
  const row=(await db.query(`select s.*,c.teacher_id,c.castellano_l2_applicable,c.religion_applicable,ag.age_years
    from students s join classrooms c on c.id=s.classroom_id join age_grades ag on ag.id=c.age_grade_id
    where s.id=$1 and c.teacher_id=$2 and c.status='active' and s.status='active'`,[id,teacherId])).rows[0];
  if(!row)throw new Error("Niño no disponible.");return row;
}
export async function previewSpontaneous({db,teacherId,input,v24=null,classifier=createOpenAICompetencyClassifier()}) {
  const student=await ownedStudent(db,teacherId,input.studentId);
  if(typeof input.observationText!=="string"||!input.observationText.trim()||input.observationText.length>4000||typeof input.contextLabel!=="string"||!input.contextLabel.trim()||input.contextLabel.length>120)throw new Error("Escribe una observación y el momento.");
  const key=previewKey(teacherId,input),workflow="observation_capture_preview_v2";
  let pending, cached;
  const lease=randomUUID();
  await versionTransaction(db,`preview:${key}`,async tx=>{
    pending=(await tx.query(`select id,payload from ai_pending_generations where classroom_id=$1 and workflow=$2 and payload->>'key'=$3 and payload->>'teacher_id'=$4 and expires_at>now()`,[student.classroom_id,workflow,key,teacherId])).rows[0];
    if(pending?.payload.result){cached={...pending.payload.result,original_calls:pending.payload.result.calls,calls:0,cached:true};return;}
    if(pending?.payload.lease_until&&Date.parse(pending.payload.lease_until)>Date.now())throw new Error("Ayni ya está leyendo esta observación. Espera un momento y vuelve a consultar.");
    const payload={teacher_id:teacherId,key,lease_token:lease,lease_until:new Date(Date.now()+40000).toISOString(),attempts:(pending?.payload.attempts??0)+1};
    if(pending)await tx.query('update ai_pending_generations set payload=$1::jsonb where id=$2',[JSON.stringify(payload),pending.id]);
    else {pending={id:randomUUID()};await tx.query(`insert into ai_pending_generations(id,classroom_id,workflow,payload,created_at,expires_at) values($1,$2,$3,$4::jsonb,now(),now()+interval '1 day')`,[pending.id,student.classroom_id,workflow,JSON.stringify(payload)]);}
  });
  if(cached)return cached;
  let providerCalls=0;
  try {
    const options=await applicableDiagnosticCompetencies({...student,id:student.classroom_id});
    const allowed=new Set(options.map(c=>c.id));
    let ids=[];
    // No database transaction around provider IO: usage recording may use the same local DB.
    if(v24){const result=await v24.classify({observation:input.observationText,age:student.age_years,applicability:{castellano_as_second_language:student.castellano_l2_applicable,religion_applicable:student.religion_applicable}});providerCalls=result.provider_calls??2;if(result.status==="classification_failed")throw new Error("La sugerencia no está disponible. Puedes elegir una competencia o guardar sin competencia.");ids=[result.primary,...(result.additional??[])].filter(Boolean);}
    else {const names=(await db.query('select first_name,last_name,preferred_name from students where classroom_id=$1',[student.classroom_id])).rows.flatMap(s=>[s.first_name,s.last_name,s.preferred_name]).filter(Boolean);
      const observation=annualJourneySafeText(input.observationText,names),context=annualJourneySafeText(input.contextLabel,names);
      if(!observation)throw new Error("Puedes elegir la competencia manualmente para esta nota.");
      providerCalls=1;ids=(await classifier.classify({observation,context,age:student.age_years,options:buildClassifierOptions((await loadKnowledgeBaseV4()).competencyCards,student.age_years,[...allowed])})).candidate_ids;
    }
    if(!Array.isArray(ids)||ids.some(id=>!allowed.has(id)))throw new Error("Sugerencia no válida. Elige la competencia manualmente.");
    const result={competency_ids:[...new Set(ids)].slice(0,2),calls:providerCalls};
    const saved=await db.query(`update ai_pending_generations set payload=jsonb_set(jsonb_set(payload,'{result}',$1::jsonb),'{lease_until}','null'::jsonb) where id=$2 and payload->>'lease_token'=$3 returning id`,[JSON.stringify(result),pending.id,lease]);
    if(!saved.rows.length)throw new Error("La sugerencia cambió. Vuelve a consultar.");
    console.info("[observation_preview]",JSON.stringify({calls:providerCalls,candidates:result.competency_ids.length}));return result;
  } catch(error) {
    await db.query(`update ai_pending_generations set payload=jsonb_set(jsonb_set(payload,'{lease_until}','null'::jsonb),'{failed_provider_calls}',$3::jsonb) where id=$1 and payload->>'lease_token'=$2`,[pending.id,lease,JSON.stringify(providerCalls)]);throw error;
  }
}
export async function handleStudentPhoto({request,response,url,db,teacherId,origin,send,sendAsset,readJson,storage}) {
  const match=/^\/api\/students\/([0-9a-f-]{36})\/photo$/i.exec(url.pathname);if(!match)return false;
  const student=await ownedStudent(db,teacherId,match[1]);
  if(!storage){send(response,503,{error:"Storage privado no configurado."},origin);return true;}
  if(request.method==="GET"){if(!student.profile_photo_path){send(response,404,{error:"Sin foto."},origin);return true;}const media=await storage.read(student.profile_photo_path,{teacherId,studentId:student.id});sendAsset(response,200,media.data,media.mimeType,origin,"private, no-store");return true;}
  if(!["PUT","DELETE"].includes(request.method))return false;
  let path=null;
  if(request.method==="PUT"){
    const {media}=await readJson(request),bytes=Buffer.from(media?.base64??"","base64");
    const sharp=(await import("sharp")).default;let normalized;
    try{if(!["image/jpeg","image/png","image/webp"].includes(media?.mimeType)||bytes.length>3000000)throw new Error();normalized=await sharp(bytes,{limitInputPixels:16000000}).rotate().resize(320,320,{fit:"cover",withoutEnlargement:true}).jpeg({quality:75}).toBuffer();}catch{send(response,422,{error:"Usa una foto JPG, PNG o WebP válida de hasta 3 MB."},origin);return true;}
    if(normalized.length>100_000){send(response,422,{error:"No se pudo reducir la foto. Elige otra imagen."},origin);return true;}
    path=await storage.save({teacherId,studentId:student.id,mimeType:"image/jpeg",bytes:normalized});
  }
  try{const changed=await db.query('update students set profile_photo_path=$1 where id=$2 and classroom_id=$3 and profile_photo_path is not distinct from $4 returning id',[path,student.id,student.classroom_id,student.profile_photo_path]);if(!changed.rows.length)throw new Error('La foto cambió en otra pestaña. Recarga el perfil.');}
  catch(e){if(path)await storage.delete(path,{teacherId,studentId:student.id}).catch(()=>{});throw e;}
  if(student.profile_photo_path)await storage.delete(student.profile_photo_path,{teacherId,studentId:student.id}).catch(()=>{});
  send(response,200,{ok:true},origin);return true;
}
const digest=token=>createHash("sha256").update(token).digest("hex");
export async function handleFamilyShare({request,response,url,db,teacherId,origin,send,readJson}) {
  const match=/^\/api\/diagnostics\/students\/([0-9a-f-]{36})\/family-share$/i.exec(url.pathname);
  const workflow="family_interview_invitation";
  if(match&&teacherId){
    const student=await ownedStudent(db,teacherId,match[1]);
    if(request.method==="GET"){const row=(await db.query(`select payload from ai_pending_generations where classroom_id=$1 and workflow=$2 and payload->>'student_id'=$3 and payload->>'teacher_id'=$4 and expires_at>now() order by created_at desc limit 1`,[student.classroom_id,workflow,student.id,teacherId])).rows[0];send(response,200,{details:row?.payload.details??null},origin);return true;}
    if(request.method!=="POST")return false;
    const token=randomBytes(32).toString("base64url");
    await versionTransaction(db,`invite:${student.id}`,async tx=>{
      await tx.query(`update ai_pending_generations set expires_at=greatest(created_at+interval '1 millisecond',now()) where classroom_id=$1 and workflow=$2 and payload->>'student_id'=$3`,[student.classroom_id,workflow,student.id]);
      await tx.query(`insert into ai_pending_generations(id,classroom_id,workflow,payload,created_at,expires_at) values($1,$2,$3,$4::jsonb,now(),now()+interval '7 days')`,[randomUUID(),student.classroom_id,workflow,JSON.stringify({teacher_id:teacherId,student_id:student.id,token_hash:digest(token),name:student.preferred_name??student.first_name,details:{}})]);
    });send(response,201,{token,expires_in_days:7},origin);return true;
  }
  if(url.pathname!=="/api/family-share")return false;
  const token=request.headers["x-ayni-family-token"];
  if(typeof token!=="string"||!/^[\w-]{43}$/.test(token)){send(response,404,{error:"Enlace no disponible."},origin);return true;}
  // Only the token's response, never a teacher interview, roster, photo or observations.
  const row=(await db.query(`select g.id,g.payload from ai_pending_generations g join students s on s.id=(g.payload->>'student_id')::uuid and s.classroom_id=g.classroom_id join classrooms c on c.id=g.classroom_id
    where g.workflow=$1 and g.payload->>'token_hash'=$2 and g.expires_at>now() and c.teacher_id=(g.payload->>'teacher_id')::uuid and c.status='active' and s.status='active'`,[workflow,digest(token)])).rows[0];
  if(!row){send(response,404,{error:"El enlace venció o fue reemplazado. Pide uno nuevo a la profesora."},origin);return true;}
  if(request.method==="GET"){send(response,200,{name:row.payload.name,details:row.payload.details},origin);return true;}
  if(request.method==="PUT"){const body=await readJson(request),details=validateFamilyInterviewDetails(body.details);const updated=await db.query(`update ai_pending_generations set payload=jsonb_set(payload,'{details}',$1::jsonb) where id=$2 and expires_at>now() returning id`,[JSON.stringify(details),row.id]);send(response,updated.rows.length?200:404,updated.rows.length?{ok:true}:{error:"El enlace venció o fue reemplazado."},origin);return true;}
  return false;
}
