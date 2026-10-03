import { randomUUID } from "node:crypto";
import { versionTransaction, assertRevision, expectedRevision, VersionConflictError } from "./version-integrity.mjs";
import { generateAnnualJourney } from "./annual-journey-service.mjs";
import { journeyFail } from "./annual-journey-contract.mjs";
import { annualJourneySafeText } from "./annual-journey-privacy.mjs";
import { effectiveCalendarFingerprint } from "./annual-journey-calendar.mjs";
import { personalizationSources } from "./annual-personalization-service.mjs";
import { loadEffectiveCalendar } from "./school-calendar-service.mjs";
import { persistAnnualProjectSlots } from "./annual-project-slots.mjs";

const WORKFLOW = "annual_journey_v2_job", LEASE_MS = 210000;
export const JOURNEY_STAGES = ["sources", "calendar", "generation", "validation", "review"];
export function publicJourneyJob(id, payload, now = Date.now()) {
  const stalled = payload.status === "running" && Date.parse(payload.lease_until) <= now;
  return { id, draft_id: payload.draft_id, status: stalled ? "interrupted" : payload.status,
    stage: payload.stage, completed_stages: payload.completed_stages, updated_at: payload.updated_at,
    error: stalled ? "La preparación se interrumpió. Puedes continuar desde el trabajo guardado." : payload.error ?? null,
    calls_completed: payload.checkpoint?.events?.length ?? 0, calls_attempted:payload.checkpoint?.attempts?.length??0 };
}

/** Persisted checkpoints in the existing server-only handoff table; no worker or detached promise.
 * A quick prepare request returns an ID, run is awaited by the server, status survives a refresh.
 * Expiring leases fence concurrent retries, including an older function that finishes late.
 */
export async function handleJourneyJobs({ request, response, url, db, context, teacherId, sources, snapshot, curriculum,
  calendar, send, origin, readJson, load, write, protectedIds, annualDocumentContext, createProvider, resolvePlan }) {
  const match = /^\/api\/annual-journey\/jobs\/([0-9a-f-]{36})(\/run)?$/i.exec(url.pathname);
  if (url.pathname !== "/api/annual-journey/prepare" && !match) return false;
  const lock = `annual:${context.school_year_id}`;
  const get = async (id, tx = db) => {
    const row = (await tx.query(`select payload from ai_pending_generations where id=$1 and classroom_id=$2
      and workflow=$3 and expires_at>now()`, [id, context.id, WORKFLOW])).rows[0];
    if (!row || row.payload.teacher_id !== teacherId) journeyFail("not_found", "Esta preparación no está disponible.");
    return row.payload;
  };
  const update = async (id, payload, token, tx = db) => {
    payload.updated_at = new Date().toISOString();
    const rows = (await tx.query(`update ai_pending_generations set payload=$1::jsonb,expires_at=now()+interval '24 hours'
      where id=$2 and classroom_id=$3 and workflow=$4 and payload->>'lease_token'=$5 returning id`,
    [JSON.stringify(payload),id,context.id,WORKFLOW,token])).rows;
    if (!rows.length) throw new VersionConflictError("Otra preparación está en curso. Abre el trabajo guardado.");
  };
  if (url.pathname === "/api/annual-journey/prepare" && request.method === "POST") {
    const body = await readJson(request);
    if (typeof body.teacherIdeas !== "string" || body.teacherIdeas.length > 2000) journeyFail("invalid", "Cuenta tus ideas en menos de 2000 caracteres.");
    if (body.sourceFingerprint !== snapshot.source_fingerprint) throw new VersionConflictError("Hay registros nuevos. Actualiza el resumen antes de preparar tu año.");
    const safeIdeas = annualJourneySafeText(body.teacherIdeas, sources.names);
    if (body.teacherIdeas.trim() && !safeIdeas) journeyFail("private_text", "Escribe tus ideas sin datos personales. Tus registros se conservan.");
    const result = await versionTransaction(db, lock, async tx => {
      let row;
      if (body.draftId) {
        row = await load(body.draftId, tx); assertRevision(row, expectedRevision(body.expectedRevision));
        if ((await protectedIds(row, tx)).length) journeyFail("protected_proposal", "Este año contiene trabajo protegido. Usa Cambiar con Ayni para ajustar propuestas futuras.");
        if (row.proposal.generation_job_id) {
          const previous = await get(row.proposal.generation_job_id, tx).catch(e => { if (e.reason !== "not_found") throw e; });
          if (previous && (previous.status === "queued" || previous.status === "running" && Date.parse(previous.lease_until) > Date.now()))
            return publicJourneyJob(row.proposal.generation_job_id, previous);
        }
      } else {
        if ((await tx.query(`select id from annual_plans where school_year_id=$1 and status='draft'`,[context.school_year_id])).rows.length)
          throw new VersionConflictError("Ya tienes un borrador. Ábrelo para continuar.");
        const active = (await tx.query(`select id from annual_plans where school_year_id=$1 and status='active'`,[context.school_year_id])).rows[0];
        const version = Number((await tx.query(`select coalesce(max(version),0)+1 as next from annual_plans where school_year_id=$1`,[context.school_year_id])).rows[0].next);
        const proposal = { journey_version:2,plan_format:"annual_preplan_v1",title:"Mi año",school_year:String(context.year),
          classroom_snapshot:snapshot,proposed_experiences:[],pending_changes:[],change_history:[],metrics:{started_at:new Date().toISOString(),regenerations:0,operations:[]} };
        row = (await tx.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,
          document_context,generation_metadata,supersedes_plan_id,source_context_fingerprint)
          values($1,$2,$3,$4,$5,'draft',$6::jsonb,$7::jsonb,$8::jsonb,$9,$10) returning *`,
        [randomUUID(),context.id,context.school_year_id,context.curriculum_version_id,version,JSON.stringify(proposal),
          JSON.stringify(annualDocumentContext(context)),JSON.stringify({workflow:WORKFLOW}),active?.id??null,snapshot.source_fingerprint])).rows[0];
      }
      const id = randomUUID(), token = randomUUID();
      const messages = body.teacherIdeas.split(/\n+|;\s*|\s+y\s+(?=en\s+navidad)/i).map(text=>text.trim()).filter(Boolean)
        .map(text=>({kind:"teacher_preference",text,scope:"teacher_decision_not_observed_interest"}));
      const saved = await write(row, {...row.proposal,teacher_preferences:body.teacherIdeas,teacher_idea_messages:messages,
        generation_job_id:id,preparation_status:"saved"},tx);
      const generatedSnapshot = { ...snapshot, facts:[...snapshot.facts,...(safeIdeas ? [{key:"teacher_preferences",kind:"teacher_decision",subject:"teacher",
        scope:"classroom_preference",uncertainty:"preference_not_observed_interest",support_text:body.teacherIdeas,ai_support_text:safeIdeas,
        occurred_at:new Date().toISOString(),competency_id:null,source_refs:[]}] : [])] };
      const payload = {teacher_id:teacherId,draft_id:row.id,revision:saved.revision,status:"queued",stage:"sources",completed_stages:["sources"],
        updated_at:new Date().toISOString(),lease_token:token,teacherIdeas:body.teacherIdeas,safeIdeas,messages,snapshot:generatedSnapshot,
        sourceFingerprint:snapshot.source_fingerprint,calendarFingerprint:effectiveCalendarFingerprint(calendar),checkpoint:{}};
      await tx.query(`insert into ai_pending_generations(id,classroom_id,workflow,payload,created_at,expires_at)
        values($1,$2,$3,$4::jsonb,now(),now()+interval '24 hours')`,[id,context.id,WORKFLOW,JSON.stringify(payload)]);
      return publicJourneyJob(id,payload);
    });
    send(response,202,result,origin); return true;
  }
  if (!match) return false;
  const [,id,run] = match;
  if (!run && request.method === "GET") { send(response,200,publicJourneyJob(id,await get(id)),origin); return true; }
  if (!run || request.method !== "POST") return false;
  const payload = await versionTransaction(db,lock,async tx => {
    const job = await get(id,tx);
    if (job.status === "succeeded") return job;
    if (job.status === "running" && Date.parse(job.lease_until) > Date.now())
      throw new VersionConflictError("Ayni sigue preparando tu año. Puedes consultar el avance aquí.");
    try {
      const row = await load(job.draft_id,tx); assertRevision(row,Number(job.revision));
      if (snapshot.source_fingerprint !== job.sourceFingerprint || effectiveCalendarFingerprint(calendar) !== job.calendarFingerprint)
        throw new VersionConflictError("Los registros o el calendario cambiaron. Tus ideas se conservan; actualiza la preparación.");
    } catch(error) {
      job.status="failed";job.error=error.name==="VersionConflictError"?error.message:"Este borrador cambió. Abre el año guardado para continuar.";
      await update(id,job,job.lease_token,tx);return job;
    }
    const token = randomUUID(), priorToken = job.lease_token;
    job.lease_token=token; job.lease_until=new Date(Date.now()+LEASE_MS).toISOString();job.status="running";job.error=null;
    await update(id,job,priorToken,tx);return job;
  });
  if (payload.status === "succeeded") { send(response,200,publicJourneyJob(id,payload),origin);return true; }
  if (payload.status === "failed") { send(response,409,publicJourneyJob(id,payload),origin);return true; }
  const token = payload.lease_token;
  let completedCalls = payload.checkpoint.outputs?.length ?? 0;
  try {
    const proposal = await generateAnnualJourney({context,snapshot:payload.snapshot,curriculum,calendar,teacherIdeas:payload.safeIdeas,
      createProvider,resolvePlan,checkpoint:payload.checkpoint,onCheckpoint:async checkpoint => {
        payload.checkpoint=checkpoint;payload.stage=checkpoint.stage;
        payload.lease_until=new Date(Date.now()+LEASE_MS).toISOString();
        const done = new Set(payload.completed_stages);
        done.add("calendar"); if(checkpoint.outputs[0])done.add("generation");
        if(checkpoint.validation_passed)done.add("validation");
        payload.completed_stages=[...done];await update(id,payload,token);
        // One actual model call per HTTP run stays within the serverless duration.
        // Cached calls are replayed in code on the next run, preserving the bounded repair sequence.
        if(checkpoint.outputs.length>completedCalls) {
          completedCalls=checkpoint.outputs.length;
          throw Object.assign(new Error("checkpoint ready"),{name:"JourneyCheckpointReady"});
        }
      }});
    const result = await versionTransaction(db,lock,async tx => {
      const job = await get(id,tx);
      if(job.lease_token!==token)throw new VersionConflictError();
      const row = await load(payload.draft_id,tx);assertRevision(row,Number(payload.revision));
      if((await personalizationSources(tx,teacherId,context)).fingerprint!==payload.sourceFingerprint)
        throw new VersionConflictError("Aparecieron registros nuevos. El trabajo preparado queda guardado; actualiza el resumen.");
      const freshCalendar={...await loadEffectiveCalendar(tx,{teacherId,classroomId:context.id}),initial_stage:context.calendar.initial_stage};
      if(effectiveCalendarFingerprint(freshCalendar)!==payload.calendarFingerprint)throw new VersionConflictError("El calendario cambió. Actualiza la preparación.");
      proposal.teacher_preferences=payload.teacherIdeas;proposal.teacher_idea_messages=payload.messages;proposal.generation_job_id=id;
      proposal.metrics={...proposal.metrics,started_at:row.proposal.metrics.started_at,
        regenerations:(row.proposal.metrics.regenerations??0)+1,operations:[...(row.proposal.metrics.operations??[]),...proposal.metrics.operations]};
      const saved=await write(row,proposal,tx);await persistAnnualProjectSlots(tx,row.id,proposal.resolved_calendar);
      payload.status="succeeded";payload.completed_stages=[...JOURNEY_STAGES];payload.error=null;await update(id,payload,token,tx);
      return saved;
    });
    console.info(JSON.stringify({event:"annual_journey_completed",calls_completed:payload.checkpoint.events.length,
      calls_attempted:payload.checkpoint.attempts.length,insufficient_interpretations:proposal.insufficient_interpretations.length}));
    send(response,201,{...publicJourneyJob(id,payload),plan_id:result.id},origin);
  } catch(error) {
    if(error.name==="JourneyCheckpointReady") {
      payload.status="queued";payload.lease_until=new Date().toISOString();await update(id,payload,token);
      send(response,202,publicJourneyJob(id,payload),origin);return true;
    }
    payload.status="failed";
    console.warn(JSON.stringify({event:"annual_journey_checkpoint_failed",stage:payload.stage,
      reason:/^[a-z_]{1,50}$/.test(error.reason??"")?error.reason:"operation_failed",calls_attempted:payload.checkpoint.attempts?.length??0}));
    payload.error=error.name==="VersionConflictError" ? error.message : payload.stage==="review"||payload.stage==="repair"
      ? "No pude terminar la última revisión. Las propuestas están guardadas. Puedes reintentar esa revisión."
      : "La preparación se interrumpió. Tus ideas y las etapas completadas están guardadas. Puedes continuar.";
    // A failed semantic verdict may be reviewed again on an explicit retry, never regenerate the twelve proposals.
    if(["repair_failed","semantic_review"].includes(error.reason))payload.checkpoint.outputs=payload.checkpoint.outputs.slice(0,1);
    await update(id,payload,token).catch(()=>{});
    send(response,error.name==="VersionConflictError"?409:503,publicJourneyJob(id,payload),origin);
  }
  return true;
}
