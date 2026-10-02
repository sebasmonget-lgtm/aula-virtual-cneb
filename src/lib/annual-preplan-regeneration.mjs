import { assertRevision, VersionConflictError, versionTransaction } from "./version-integrity.mjs";
import { buildEditableAnnualSchedule } from "./annual-plan-calendar.mjs";
import { ageFilteredAnnualCurriculum, validateAnnualPreplan, validatePreplanTrace } from "./annual-preplan-service.mjs";
import { persistAnnualProjectSlots } from "./annual-project-slots.mjs";

/** Regeneration replaces only an explicitly selected, owned draft. Active/history stay intact. */
export async function saveRegeneratedAnnualDraft(db, teacherId, context, draftId, expectedRevision, generated, documentContext) {
  return versionTransaction(db, `annual:${context.school_year_id}`, async (tx) => {
    const row = (await tx.query(`select ap.id,ap.revision from annual_plans ap
      join school_years sy on sy.id=ap.school_year_id and sy.owner_id=$4
      join classrooms c on c.id=ap.classroom_id and c.teacher_id=$4
      where ap.id=$1 and ap.classroom_id=$2 and ap.school_year_id=$3 and ap.status='draft' for update of ap`,
    [draftId,context.id,context.school_year_id,teacherId])).rows[0];
    assertRevision(row, expectedRevision);
    const preparation = (await tx.query(`select id,details from annual_personalization_reviews where classroom_id=$1
      and school_year_id=$2 and created_by=$3 and status='confirmed' order by version desc limit 1`,
    [context.id,context.school_year_id,teacherId])).rows[0];
    if (preparation?.id !== generated.source.personalization_review_id)
      throw new VersionConflictError("La preparación cambió mientras se generaban propuestas. Abre la revisión guardada y vuelve a generar.");
    const curriculum = await ageFilteredAnnualCurriculum(context);
    const proposal = validatePreplanTrace(validateAnnualPreplan(generated.proposal, curriculum.map((card) => card.id), context.year), preparation.details);
    const schedule = buildEditableAnnualSchedule(context.calendar, proposal.proposed_experiences);
    const saved = (await tx.query(`update annual_plans set proposal=$1::jsonb,generation_metadata=$2::jsonb,document_context=$3::jsonb,
      source_personalization_review_id=$4,source_context_fingerprint=$5,updated_at=now()
      where id=$6 and status='draft' and revision=$7 returning id,version,revision,status`,
    [JSON.stringify(proposal),JSON.stringify({workflow:"annual_preplan_regeneration",...generated.metadata}),JSON.stringify(documentContext),preparation.id,
      context.context_v4?.source_fingerprint ?? "",row.id,row.revision])).rows[0];
    if (!saved) throw new VersionConflictError();
    await persistAnnualProjectSlots(tx, row.id, schedule);
    const persisted = (await tx.query("select revision,proposal from annual_plans where id=$1", [row.id])).rows[0];
    return { ...saved, revision: Number(persisted.revision), proposal: persisted.proposal };
  });
}
