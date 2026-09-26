import { randomUUID } from "node:crypto";
import { ANNUAL_PLAN_TEMPLATE_FORMAT } from "./annual-plan-contract.mjs";
import { buildFlexibleAnnualSchedule, buildEditableAnnualSchedule } from "./annual-plan-calendar.mjs";
import { ANNUAL_PREPLAN_FORMAT } from "./annual-preplan-service.mjs";
import { assertRevision, versionTransaction, VersionConflictError } from "./version-integrity.mjs";
const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

export class AnnualPlanVersionError extends Error {
  constructor(reason, message) { super(message); this.name = "AnnualPlanVersionError"; this.reason = reason; }
}

export async function copyConfirmedAnnualPlan(db, teacherId, context, sourcePlanId, documentContext, expectedSourceRevision = null) {
  if (!context?.source_diagnostic_review_id)
    throw new AnnualPlanVersionError("diagnostic_review_required", "Revisa y confirma el diagnóstico del aula antes de preparar una nueva versión.");
  return versionTransaction(db, `annual:${context.school_year_id}`, async (tx) => {
    const source = (await tx.query(`select ap.* from annual_plans ap
      join school_years sy on sy.id=ap.school_year_id and sy.owner_id=$1
      where ap.id=$2 and ap.classroom_id=$3 and ap.school_year_id=$4 and ap.status='active' for update of ap`,
    [teacherId, sourcePlanId, context.id, context.school_year_id])).rows[0];
    if (!source) throw new AnnualPlanVersionError("source_unavailable", "El plan vigente ya no está disponible para crear otra versión.");
    if (expectedSourceRevision !== null) assertRevision(source, expectedSourceRevision);
    if (![ANNUAL_PLAN_TEMPLATE_FORMAT, ANNUAL_PREPLAN_FORMAT].includes(source.proposal?.plan_format))
      throw new AnnualPlanVersionError("legacy_plan", "Este plan usa un formato anterior. Usa «Preparar versión actualizada» para convertirlo al formato de doce propuestas.");
    const existingDraft = (await tx.query(`select id from annual_plans where school_year_id=$1 and status='draft' limit 1`, [context.school_year_id])).rows[0];
    if (existingDraft) throw new VersionConflictError("Ya hay un borrador de este año. Ábrelo antes de crear otra versión.", source.revision, "draft_exists");
    const diagnostic = (await tx.query(`select id from diagnostic_group_reviews
      where id=$1 and classroom_id=$2 and status='confirmed'`, [context.source_diagnostic_review_id, context.id])).rows[0];
    if (!diagnostic) throw new AnnualPlanVersionError("diagnostic_review_required", "El diagnóstico confirmado ya no corresponde a esta aula.");
    const version = Number((await tx.query(`select coalesce(max(version),0)::int + 1 as next
      from annual_plans where classroom_id=$1 and school_year_id=$2`, [context.id, context.school_year_id])).rows[0].next);
    const id = randomUUID();
    await tx.query(`insert into annual_plans
      (id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,generation_metadata,document_context,
       supersedes_plan_id,source_diagnostic_review_id,source_priority_review_id,source_context_fingerprint)
      values ($1,$2,$3,$4,$5,'draft',$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12)`,
    [id, context.id, context.school_year_id, source.curriculum_version_id, version,
      JSON.stringify(source.proposal), JSON.stringify({ workflow: "annual_plan_copy", source_plan_id: source.id }),
      JSON.stringify({ ...documentContext, supersedes_plan_id: source.id }), source.id,
      context.source_diagnostic_review_id, context.source_priority_review_id ?? source.source_priority_review_id,
      context.context_v4.source_fingerprint]);
    const sourceSlots = (await tx.query(`select slot_index,calendar_block_id,duration_weeks,starts_on,ends_on
      from project_slots where annual_plan_id=$1 order by slot_index`, [source.id])).rows;
    const slots = sourceSlots.length === source.proposal.proposed_experiences.length ? sourceSlots.map((slot) => ({
      index: slot.slot_index, calendar_block_id: slot.calendar_block_id, duration_weeks: slot.duration_weeks,
      starts_on: dateOnly(slot.starts_on), ends_on: dateOnly(slot.ends_on),
    })) : (source.proposal.plan_format === ANNUAL_PREPLAN_FORMAT
      ? buildEditableAnnualSchedule(context.calendar, source.proposal.proposed_experiences)
      : buildFlexibleAnnualSchedule(context.calendar, source.proposal.proposed_experiences)).projects;
    for (const slot of slots) await tx.query(`insert into project_slots
      (id,annual_plan_id,slot_index,calendar_block_id,duration_weeks,starts_on,ends_on,proposal_id)
      values ($1,$2,$3,$4,$5,$6::date,$7::date,$8)`, [randomUUID(), id, slot.index,
      slot.calendar_block_id, slot.duration_weeks, slot.starts_on, slot.ends_on,
      source.proposal.proposed_experiences[slot.index - 1]?.proposal_id ?? null]);
    return { id, version, revision: 1, status: "draft", supersedes_plan_id: source.id, source_diagnostic_review_id: diagnostic.id };
  });
}

export async function confirmAnnualPlanVersion(db, context, draftId, expectedDraftRevision, validate = async () => {}) {
  return versionTransaction(db, `annual:${context.school_year_id}`, async (tx) => {
    const draft=(await tx.query(`select * from annual_plans where id=$1 and classroom_id=$2 and school_year_id=$3 and status='draft' for update`,
      [draftId,context.id,context.school_year_id])).rows[0];
    assertRevision(draft,expectedDraftRevision);
    const current=(await tx.query(`select id from annual_plans where school_year_id=$1 and status='active' for update`,
      [context.school_year_id])).rows[0];
    if(current&&current.id!==draft.supersedes_plan_id)
      throw new VersionConflictError("El plan vigente cambió. Prepara una versión desde el actual.",draft.revision);
    await validate(draft,tx);
    if(current) await tx.query(`update annual_plans set status='archived',updated_at=now() where id=$1 and status='active'`,[current.id]);
    const confirmed=(await tx.query(`update annual_plans set status='active',teacher_confirmed_at=now(),
      preplan_confirmed_at=case when proposal->>'plan_format'=$3 then now() else preplan_confirmed_at end,updated_at=now()
      where id=$1 and status='draft' and revision=$2 returning id,status,version,revision`,[draftId,expectedDraftRevision,ANNUAL_PREPLAN_FORMAT])).rows[0];
    if(!confirmed) throw new VersionConflictError();
    return confirmed;
  });
}
