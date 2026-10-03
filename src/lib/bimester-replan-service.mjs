import { randomUUID } from "node:crypto";
import { periodClosureFingerprint, loadPeriodEvaluationRows, periodRowResolved } from "./period-evaluation-service.mjs";
import { VersionConflictError, versionTransaction } from "./version-integrity.mjs";

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const todayInPeru = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const priorityChoices = new Set(["prioritize", "maintain", "not_prioritize"]);
const workshopChoices = new Set(["recommended", "library", "create", "ignore"]);
const workshopFamily = (name) => /motricidad/i.test(name) ? "psicomotricidad"
  : /lenguajes artísticos|proyectos.*artístic/i.test(name) ? "gráfico-plástico" : null;
export function recommendWorkshops(resources, age, competencies) {
  return competencies.flatMap((item) => {
    const family = workshopFamily(item.name), resource = family && resources.find((candidate) =>
      candidate.kind === "workshop" && Number(candidate.age) === Number(age)
      && candidate.area.toLocaleLowerCase("es").includes(family));
    return resource ? [{ competency_id: item.competency_id, resource_id: resource.id,
      title: resource.title, purpose: resource.purpose, reason: item.reason }] : [];
  });
}

export function replanSummary(statistics, students, period) {
  const total = students.length;
  const competencies = statistics.competencies.map((item) => {
    const withoutEvidence = Number(item.students_without_evidence ?? total);
    const attention = Number(item.levels?.C ?? 0);
    const developing = Number(item.levels?.B ?? 0);
    const tone = attention > 0 ? "attention" : withoutEvidence > 0 || developing > 0 ? "opportunities" : "well";
    const reason = attention > 0
      ? `${attention} ${attention === 1 ? "niño necesita" : "niños necesitan"} más acompañamiento según las valoraciones confirmadas.`
      : withoutEvidence > 0 ? `${withoutEvidence} ${withoutEvidence === 1 ? "niño necesita" : "niños necesitan"} más oportunidades de mostrar lo que sabe.`
        : developing > 0 ? `${developing} ${developing === 1 ? "niño sigue" : "niños siguen"} desarrollando esta competencia.`
          : "El grupo cuenta con evidencias registradas para esta competencia.";
    return { competency_id: item.competency_id, name: item.short_label || item.official_name,
      tone, reason, without_evidence: withoutEvidence, attention, developing,
      evaluated: Number(item.evaluated ?? 0), evidence_coverage: Number(item.evidence_coverage ?? 0) };
  }).sort((a, b) => ({ attention: 0, opportunities: 1, well: 2 })[a.tone] - ({ attention: 0, opportunities: 1, well: 2 })[b.tone]
    || b.without_evidence - a.without_evidence || a.name.localeCompare(b.name, "es"));
  const studentsWithoutEvidence = new Set();
  for (const row of statistics.student_rows ?? []) if (!row.evidence_count) studentsWithoutEvidence.add(row.student_id);
  const observationStudents = students.filter((student) => studentsWithoutEvidence.has(student.id))
    .map((student) => ({ id: student.id, name: [student.preferred_name || student.first_name, student.last_name].filter(Boolean).join(" ") }));
  return { period_label: period.label, students_total: total,
    assessments_confirmed: Number(statistics.classroom.confirmed_assessments ?? 0),
    assessments_total: Number(statistics.classroom.total_assessments ?? 0),
    competencies_evaluated: competencies.filter((item) => item.evaluated > 0).length,
    competencies, students_needing_observation: studentsWithoutEvidence.size,
    observation_students: observationStudents };
}

export async function loadBimesterReplanPreview(db, { teacherId, classroom, period, statistics, model, closure, workshopResources = [], competencyNames = new Map() }) {
  const source = (await db.query(`select ap.* from annual_plans ap join school_years sy on sy.id=ap.school_year_id
    where ap.classroom_id=$1 and ap.school_year_id=$2 and sy.owner_id=$3 and ap.status='active'`,
  [classroom.id, classroom.school_year_id, teacherId])).rows[0] ?? null;
  const next = (await db.query(`select id,label,starts_on,ends_on from evaluation_periods
    where school_year_id=$1 and ordinal>$2 and kind=$3 order by ordinal limit 1`,
  [classroom.school_year_id, period.ordinal, period.kind])).rows[0] ?? null;
  const history = (await db.query(`select generation_metadata from annual_plans
    where classroom_id=$1 and school_year_id=$2`, [classroom.id, classroom.school_year_id])).rows;
  const adjusted = history.some((item) => item.generation_metadata?.workflow === "bimester_replan"
    && item.generation_metadata?.source_period_id === period.id
    && item.generation_metadata?.source_closure_version_id === closure.current_version_id);
  const cutoff = [dateOnly(period.ends_on), todayInPeru()].sort().at(-1);
  const slots = source ? (await db.query(`select ps.proposal_id,ps.slot_index,ps.starts_on,ps.ends_on,
      exists(select 1 from learning_experiences le where le.classroom_id=$2 and le.annual_plan_id=ps.annual_plan_id
        and (le.source_proposal_id=ps.proposal_id or (le.source_proposal_id is null and le.source_proposal_index=ps.slot_index-1))) as developed
      from project_slots ps where ps.annual_plan_id=$1 order by ps.slot_index`, [source.id, classroom.id])).rows : [];
  const proposals = slots.map((slot) => {
    const row = source.proposal?.proposed_experiences?.[Number(slot.slot_index) - 1];
    return row ? { proposal_id: row.proposal_id ?? slot.proposal_id, title: row.title,
      competency_ids: row.primary_competency_ids ?? [],
      competency_names: (row.primary_competency_ids ?? []).map((id) => competencyNames.get(id)).filter(Boolean),
      starts_on: dateOnly(slot.starts_on), ends_on: dateOnly(slot.ends_on),
      editable: dateOnly(slot.starts_on) > cutoff && !slot.developed,
      reason_locked: slot.developed ? "Este proyecto ya fue desarrollado. Sus decisiones se ajustan desde su propia versión." : "Este proyecto ya comenzó o pertenece al período cerrado." } : null;
  }).filter(Boolean);
  const summary = { ...replanSummary({ ...statistics, student_rows: model.rows.map((row) => ({ student_id: row.student_id, evidence_count: row.sourceRows?.length ?? 0 })) }, model.students, period),
    assessments_total:model.rows.length,
    assessments_confirmed:model.rows.filter((row)=>row.state==="confirmed").length,
    assessments_resolved:model.rows.filter(periodRowResolved).length,
    observation_pending:model.rows.filter((row)=>["observation_pending","insufficient_information"].includes(row.state)).length,
    review_pending:model.rows.filter((row)=>row.state==="pending").length };
  return { classroom_id: classroom.id, period: { id: period.id, label: period.label, ends_on: dateOnly(period.ends_on) },
    next_period: next ? { id: next.id, label: next.label, starts_on: dateOnly(next.starts_on) } : null,
    closure: { ...closure }, adjusted: Boolean(adjusted), summary,
    workshop_options: recommendWorkshops(workshopResources, classroom.age, summary.competencies),
    available_workshops: workshopResources.filter((item) => item.kind === "workshop" && Number(item.age) === Number(classroom.age))
      .map((item) => ({ resource_id: item.id, title: item.title, purpose: item.purpose, area: item.area })),
    plan: source ? { id: source.id, version: Number(source.version), revision: Number(source.revision),
      format: source.proposal?.plan_format, proposals } : null };
}

export async function confirmBimesterReplan(db, { teacherId, classroom, period, applicableIds, expected,
  priorities, adjustments, workshops, workshopOptions = [], libraryWorkshops = [], includeOrdinary = false }) {
  if (!expected || !Array.isArray(priorities) || !Array.isArray(adjustments) || !Array.isArray(workshops))
    throw new Error("Revisa las decisiones antes de actualizar la planificación.");
  const allowed = new Set(applicableIds);
  if (priorities.length > allowed.size || priorities.some((item) => !allowed.has(item.competency_id) || !priorityChoices.has(item.choice))
    || new Set(priorities.map((item) => item.competency_id)).size !== priorities.length)
    throw new Error("Las prioridades elegidas no corresponden a esta aula.");
  const prioritized = new Set(priorities.filter((item) => item.choice === "prioritize").map((item) => item.competency_id));
  if (adjustments.length > allowed.size || adjustments.some((item) => !["accept", "keep"].includes(item.choice)
    || !prioritized.has(item.competency_id)) || new Set(adjustments.map((item) => item.competency_id)).size !== adjustments.length)
    throw new Error("Revisa los cambios propuestos para los proyectos.");
  if (workshops.length > allowed.size || workshops.some((item) => !prioritized.has(item.competency_id) || !workshopChoices.has(item.choice)
    || (item.choice === "recommended" && !workshopOptions.some((option) => option.competency_id === item.competency_id
      && option.resource_id === item.resource_id))
    || (item.choice === "library" && !libraryWorkshops.some((resource) => resource.resource_id === item.resource_id)))
    || new Set(workshops.map((item) => item.competency_id)).size !== workshops.length)
    throw new Error("Revisa las decisiones sobre talleres.");
  return versionTransaction(db, `annual:${classroom.school_year_id}`, async (tx) => {
    if (dateOnly(period.ends_on) >= todayInPeru())
      throw new Error("Espera a que termine el período para reajustar el siguiente.");
    if (!(await tx.query(`select 1 from evaluation_periods where school_year_id=$1 and kind=$2 and ordinal>$3 limit 1`,
      [classroom.school_year_id, period.kind, period.ordinal])).rows.length)
      throw new Error("Este es el último período del año. No hay planificación posterior que reajustar.");
    const closure = (await tx.query(`select pc.current_version_id,pc.source_fingerprint from period_closures pc
      where pc.classroom_id=$1 and pc.evaluation_period_id=$2 for update`, [classroom.id, period.id])).rows[0];
    if (!closure?.current_version_id || closure.current_version_id !== expected.closure_version_id)
      throw new VersionConflictError("El cierre cambió. Revisa el resumen actualizado.");
    const current = await loadPeriodEvaluationRows(tx, { classroomId: classroom.id, period, applicableIds: allowed, includeOrdinary });
    if (closure.source_fingerprint !== periodClosureFingerprint(current.rows))
      throw new VersionConflictError("Hay nueva información en la evaluación. Revisa el cierre antes de reajustar.");
    const source = (await tx.query(`select ap.* from annual_plans ap join school_years sy on sy.id=ap.school_year_id
      where ap.id=$1 and ap.classroom_id=$2 and ap.school_year_id=$3 and sy.owner_id=$4 and ap.status='active' for update of ap`,
    [expected.plan_id, classroom.id, classroom.school_year_id, teacherId])).rows[0];
    if (!source || Number(source.revision) !== Number(expected.plan_revision))
      throw new VersionConflictError("El plan cambió. Revisa la versión vigente antes de continuar.");
    if (source.proposal?.plan_format !== "annual_preplan_v1") throw new Error("Este plan necesita el formato actual de «Mi año».");
    const history = (await tx.query(`select generation_metadata from annual_plans
      where classroom_id=$1 and school_year_id=$2`, [classroom.id, classroom.school_year_id])).rows;
    if (history.some((item) => item.generation_metadata?.workflow === "bimester_replan"
      && item.generation_metadata?.source_period_id === period.id
      && item.generation_metadata?.source_closure_version_id === closure.current_version_id))
      throw new VersionConflictError("Este bimestre ya tiene un reajuste confirmado.");
    if ((await tx.query(`select 1 from annual_plans where school_year_id=$1 and status='draft' limit 1`, [classroom.school_year_id])).rows.length)
      throw new VersionConflictError("Ya hay un borrador del plan anual. Revísalo antes de reajustar.");
    const slots = (await tx.query(`select ps.* from project_slots ps where ps.annual_plan_id=$1 order by slot_index`, [source.id])).rows;
    const cutoff = [dateOnly(period.ends_on), todayInPeru()].sort().at(-1);
    if (source.proposal?.journey_version === 2) throw new Error("Abre Mi año y Cambiar con Ayni para crear oportunidades completas desde las nuevas observaciones.");
    const proposal = structuredClone(source.proposal);
    const applied = [];
    for (const decision of adjustments.filter((item) => item.choice === "accept")) {
      const index = proposal.proposed_experiences.findIndex((item) => item.proposal_id === decision.proposal_id);
      const slot = slots.find((item) => item.proposal_id === decision.proposal_id || (item.proposal_id === null && Number(item.slot_index) === index + 1));
      if (index < 0 || !slot || dateOnly(slot.starts_on) <= cutoff)
        throw new VersionConflictError("Una propuesta ya comenzó o dejó de ser futura.");
      const developed = (await tx.query(`select 1 from learning_experiences where classroom_id=$1 and annual_plan_id=$2
        and (source_proposal_id=$3 or (source_proposal_id is null and source_proposal_index=$4)) limit 1`,
      [classroom.id, source.id, decision.proposal_id, index])).rows.length;
      if (developed) throw new VersionConflictError("Una propuesta ya fue desarrollada. Ajústala desde su propia versión.");
      const row = proposal.proposed_experiences[index];
      if (row.primary_competency_ids.includes(decision.competency_id) || row.primary_competency_ids.length >= 5)
        throw new Error("Esta competencia ya está prevista o el proyecto llegó al límite de competencias.");
      row.primary_competency_ids.push(decision.competency_id);
      applied.push({ proposal_id: decision.proposal_id, competency_id: decision.competency_id,
        before: source.proposal.proposed_experiences[index], after: structuredClone(row) });
    }
    const version = Number((await tx.query(`select coalesce(max(version),0)+1 as version from annual_plans
      where classroom_id=$1 and school_year_id=$2`, [classroom.id, classroom.school_year_id])).rows[0].version);
    const id = randomUUID();
    const metadata = { workflow: "bimester_replan", source_plan_id: source.id, source_period_id: period.id,
      source_period_label: period.label,
      source_closure_version_id: closure.current_version_id, priorities, adjustments, workshops,
      applied_count: applied.length, confirmed_by: teacherId };
    await tx.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,
      generation_metadata,document_context,supersedes_plan_id,source_diagnostic_review_id,source_priority_review_id,
      source_context_fingerprint,source_personalization_review_id,teacher_confirmed_at,preplan_confirmed_at)
      values($1,$2,$3,$4,$5,'draft',$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,now(),now())`,
    [id, classroom.id, classroom.school_year_id, source.curriculum_version_id, version, JSON.stringify(proposal),
      JSON.stringify(metadata), JSON.stringify(source.document_context ?? {}), source.id,
      source.source_diagnostic_review_id, source.source_priority_review_id, source.source_context_fingerprint,
      source.source_personalization_review_id]);
    for (const slot of slots) await tx.query(`insert into project_slots(id,annual_plan_id,slot_index,calendar_block_id,
      duration_weeks,starts_on,ends_on,proposal_id) values($1,$2,$3,$4,$5,$6,$7,$8)`,
    [randomUUID(), id, slot.slot_index, slot.calendar_block_id, slot.duration_weeks, slot.starts_on, slot.ends_on, slot.proposal_id]);
    const previousFormal = (await tx.query(`select content from annual_plan_formal_content where annual_plan_id=$1`, [source.id])).rows[0];
    if (previousFormal) {
      const formal = structuredClone(previousFormal.content);
      formal.competency_overview = [...new Set(proposal.proposed_experiences.flatMap((item) => item.primary_competency_ids))];
      formal.proposed_experiences = proposal.proposed_experiences.map((item, index) => ({
        ...formal.proposed_experiences[index], ...item,
        possible_secondary_competency_ids: formal.proposed_experiences[index]?.possible_secondary_competency_ids ?? [],
      }));
      await tx.query(`insert into annual_plan_formal_content(annual_plan_id,content,ai_metadata,source_revision)
        values($1,$2::jsonb,$3::jsonb,1)`, [id, JSON.stringify(formal),
        JSON.stringify({ workflow: "bimester_replan", derived_from_plan_id: source.id })]);
    }
    for (const item of applied) await tx.query(`insert into annual_plan_changes(id,plan_id,change_type,reason,previous_payload,new_payload,confirmed_by_teacher)
      values($1,$2,'observed_need',$3,$4::jsonb,$5::jsonb,true)`, [randomUUID(), id,
      `Reajuste después de ${period.label}`, JSON.stringify(item.before), JSON.stringify(item.after)]);
    await tx.query(`update annual_plans set status='archived',updated_at=now() where id=$1 and status='active'`, [source.id]);
    await tx.query(`update annual_plans set status='active',updated_at=now() where id=$1 and status='draft'`, [id]);
    return { id, version, status: "active", supersedes_plan_id: source.id,
      applied_count: applied.length, workshop_decisions: workshops.filter((item) => item.choice !== "ignore").length };
  });
}
