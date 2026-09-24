import { diagnosticPlanningSummary } from "./diagnostic-assessment-v4.mjs";
import { getCurrentClassroomContext } from "./classroom-context-service.mjs";

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "").slice(0, 10);
const timestamp = (value) => value instanceof Date ? value.toISOString() : String(value ?? "");
const validId = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const kinds = new Set(["annual_plan", "diagnostic_summary", "experience", "activity", "family_report"]);
const selectContent = (source, fields) => Object.fromEntries(fields.map((field) => [field, source?.[field]]).filter(([, value]) => value !== undefined));

/** A read-only catalog over canonical rows. No document copy or AI metadata is stored. */
export async function listSavedDocuments(db, teacherId) {
  const annual = (await db.query(`select ap.id,ap.status,ap.version,ap.proposal,ap.updated_at,sy.year,c.section
    from annual_plans ap join classrooms c on c.id=ap.classroom_id join school_years sy on sy.id=ap.school_year_id
    where c.teacher_id=$1 and sy.owner_id=$1 and ap.proposal ? 'title'`, [teacherId])).rows.map((row) => ({
      id: row.id, kind: "annual_plan", title: row.proposal?.title || "Plan anual", status: row.status,
      version: Number(row.version), school_year: Number(row.year), classroom: row.section, date: timestamp(row.updated_at),
    }));
  const diagnostics = (await db.query(`select d.id,d.status,d.version,d.updated_at,sy.year,c.section
    from diagnostic_group_reviews d join classrooms c on c.id=d.classroom_id join school_years sy on sy.id=c.school_year_id
    where c.teacher_id=$1 and sy.owner_id=$1`, [teacherId])).rows.map((row) => ({
      id: row.id, kind: "diagnostic_summary", title: "Resumen diagnóstico del aula", status: row.status,
      version: Number(row.version), school_year: Number(row.year), classroom: row.section, date: timestamp(row.updated_at),
    }));
  const experiences = (await db.query(`select e.id,e.type,e.title,e.status,e.starts_on,sy.year,c.section
    from learning_experiences e join classrooms c on c.id=e.classroom_id join school_years sy on sy.id=c.school_year_id
    where c.teacher_id=$1 and sy.owner_id=$1 and e.type in ('project','unit') and e.details ? 'starting_point'`, [teacherId])).rows.map((row) => ({
      id: row.id, kind: "experience", subtype: row.type, title: row.title, status: row.status,
      school_year: Number(row.year), classroom: row.section, date: dateOnly(row.starts_on),
    }));
  const activities = (await db.query(`select a.id,a.title,a.status,a.occurs_on,sy.year,c.section
    from activities a join learning_experiences e on e.id=a.experience_id
    join classrooms c on c.id=e.classroom_id join school_years sy on sy.id=c.school_year_id
    where c.teacher_id=$1 and sy.owner_id=$1 and a.details ? 'meaningful_situation'`, [teacherId])).rows.map((row) => ({
      id: row.id, kind: "activity", title: row.title, status: row.status,
      school_year: Number(row.year), classroom: row.section, date: dateOnly(row.occurs_on),
    }));
  const reports = (await db.query(`select r.id,r.status,r.version,r.updated_at,s.first_name,s.preferred_name,sy.year,c.section
    from family_reports r join students s on s.id=r.student_id join classrooms c on c.id=s.classroom_id
    join school_years sy on sy.id=c.school_year_id where c.teacher_id=$1 and sy.owner_id=$1`, [teacherId])).rows.map((row) => ({
      id: row.id, kind: "family_report", title: `Informe a la familia de ${row.preferred_name || row.first_name}`,
      status: row.status, version: Number(row.version), school_year: Number(row.year),
      classroom: row.section, date: timestamp(row.updated_at),
    }));
  return [...annual, ...diagnostics, ...experiences, ...activities, ...reports]
    .sort((a, b) => b.school_year - a.school_year || b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

export async function loadSavedDocument(db, teacherId, kind, id) {
  if (!kinds.has(kind) || !validId(id)) return null;
  if (kind === "annual_plan") {
    const row = (await db.query(`select ap.id,ap.status,ap.version,ap.proposal,ap.document_context,ap.teacher_confirmed_at,
      ap.classroom_id,sy.year,sy.starts_on,sy.ends_on,c.section,coalesce(ip.display_name,c.institution_name) as institution_name,ag.age_years,p.display_name as teacher_name,
      ip.institution_code,ip.district,ip.ugel
      from annual_plans ap join classrooms c on c.id=ap.classroom_id join school_years sy on sy.id=ap.school_year_id
      join age_grades ag on ag.id=c.age_grade_id join profiles p on p.user_id=c.teacher_id
      left join institution_profiles ip on ip.owner_user_id=c.teacher_id
      where ap.id=$2 and c.teacher_id=$1 and sy.owner_id=$1 and ap.proposal ? 'title'`, [teacherId, id])).rows[0];
    if (!row) return null;
    const fallback = { institution_name: row.institution_name, teacher_name: row.teacher_name,
      classroom_section: row.section, age: Number(row.age_years), school_year: Number(row.year),
      starts_on: dateOnly(row.starts_on), ends_on: dateOnly(row.ends_on) };
    const documentContext = { ...fallback, ...row.document_context };
    // A draft may have been saved before the institution profile was completed.
    // Keep explicit snapshot values, but fill missing display fields from the current profile.
    for (const field of ["institution_name", "teacher_name", "classroom_section", "institution_code", "district", "ugel"]) {
      const current = field === "classroom_section" ? row.section : row[field];
      const saved = typeof documentContext[field] === "string" ? documentContext[field].trim() : documentContext[field];
      if ((!saved || (field === "ugel" && saved === "No registrada")) && current) documentContext[field] = current;
    }
    // A confirmed diagnostic can arrive after a historical v1 plan was saved. Fill only absent fields.
    if (row.status === "active") {
      if (documentContext.student_count == null) {
        documentContext.student_count = Number((await db.query(`select count(*)::int as total from students
          where classroom_id=$1 and status='active'`, [row.classroom_id])).rows[0]?.total ?? 0);
      }
      if (!documentContext.diagnostic_group?.strengths || !documentContext.diagnostic_group?.needs) {
        const group = (await db.query(`select details from diagnostic_group_reviews
          where classroom_id=$1 and status='confirmed' order by version desc limit 1`, [row.classroom_id])).rows[0];
        if (group) {
          const names = (await db.query(`select coalesce(preferred_name,first_name) as name from students
            where classroom_id=$1 and status='active'`, [row.classroom_id])).rows.map((student) => student.name);
          documentContext.diagnostic_group = { ...Object.fromEntries(["strengths", "needs", "planning_priorities"]
            .map((field) => [field, diagnosticPlanningSummary({ [field]: group.details?.[field] }, names) ?? ""])),
          ...Object.fromEntries(Object.entries(documentContext.diagnostic_group ?? {}).filter(([, value]) => Boolean(value))) };
        }
      }
      if (!Array.isArray(documentContext.group_interests) || !documentContext.group_interests.length) {
        try {
          const context = await getCurrentClassroomContext(db, teacherId, row.classroom_id);
          documentContext.group_interests = context.common_interests.map((item) => item.label);
        } catch { documentContext.group_interests = []; }
      }
    }
    return { id: row.id, kind, title: row.proposal?.title || "Plan anual", status: row.status,
      version: Number(row.version), school_year: Number(row.year), classroom: row.section,
      confirmed_at: row.teacher_confirmed_at ? timestamp(row.teacher_confirmed_at) : null,
      content: row.proposal, document_context: documentContext };
  }
  if (kind === "diagnostic_summary") {
    const row = (await db.query(`select d.id,d.status,d.version,d.details,d.teacher_confirmed_at,sy.year,c.section,c.institution_name
      from diagnostic_group_reviews d join classrooms c on c.id=d.classroom_id join school_years sy on sy.id=c.school_year_id
      where d.id=$2 and c.teacher_id=$1 and sy.owner_id=$1`, [teacherId, id])).rows[0];
    return row ? { id: row.id, kind, title: "Resumen diagnóstico del aula", status: row.status,
      version: Number(row.version), school_year: Number(row.year), classroom: row.section,
      institution_name: row.institution_name, confirmed_at: row.teacher_confirmed_at ? timestamp(row.teacher_confirmed_at) : null,
      content: { strengths: row.details?.strengths ?? "", needs: row.details?.needs ?? "", planning_priorities: row.details?.planning_priorities ?? "" } } : null;
  }
  if (kind === "experience") {
    const row = (await db.query(`select e.id,e.type,e.title,e.purpose,e.status,e.details,e.starts_on,e.ends_on,e.origin,e.planning_reason,
      sy.year,c.section,c.institution_name from learning_experiences e join classrooms c on c.id=e.classroom_id
      join school_years sy on sy.id=c.school_year_id
      where e.id=$2 and c.teacher_id=$1 and sy.owner_id=$1 and e.type in ('project','unit') and e.details ? 'starting_point'`, [teacherId, id])).rows[0];
    return row ? { id: row.id, kind, subtype: row.type, title: row.title, status: row.status,
      school_year: Number(row.year), classroom: row.section, institution_name: row.institution_name,
      starts_on: dateOnly(row.starts_on), ends_on: dateOnly(row.ends_on), origin: row.origin,
      content: { ...selectContent(row.details, ["starting_point", "trigger_or_interest", "learning_need_or_context", "primary_competency_ids", "possible_secondary_competency_ids", "possible_pathways", "proposed_situations", "spaces_and_materials", "evidence_opportunities", "family_or_community_links", "adjustment_points", "flexibility_notes"]), purpose: row.details?.purpose || row.purpose, planning_reason: row.planning_reason } } : null;
  }
  if (kind === "activity") {
    const row = (await db.query(`select a.id,a.title,a.purpose,a.status,a.details,a.preparation,a.occurs_on,e.title as experience_title,
      sy.year,c.section,c.institution_name from activities a join learning_experiences e on e.id=a.experience_id
      join classrooms c on c.id=e.classroom_id join school_years sy on sy.id=c.school_year_id
      where a.id=$2 and c.teacher_id=$1 and sy.owner_id=$1 and a.details ? 'meaningful_situation'`, [teacherId, id])).rows[0];
    return row ? { id: row.id, kind, title: row.title, status: row.status,
      school_year: Number(row.year), classroom: row.section, institution_name: row.institution_name,
      occurs_on: dateOnly(row.occurs_on), experience_title: row.experience_title,
      content: { ...selectContent(row.details, ["meaningful_situation", "teacher_preparation", "child_actions", "mediation", "evidence_opportunities", "closure_or_continuity", "competency_status", "competency_id"]), purpose: row.details?.purpose || row.purpose, materials: row.preparation?.materials ?? [] } } : null;
  }
  const row = (await db.query(`select r.id,r.status,r.version,r.details,r.period_start,r.period_end,r.teacher_confirmed_at,
    s.first_name,s.preferred_name,sy.year,c.section,c.institution_name from family_reports r
    join students s on s.id=r.student_id join classrooms c on c.id=s.classroom_id
    join school_years sy on sy.id=c.school_year_id
    where r.id=$2 and c.teacher_id=$1 and sy.owner_id=$1`, [teacherId, id])).rows[0];
  return row ? { id: row.id, kind, title: `Informe a la familia de ${row.preferred_name || row.first_name}`,
    status: row.status, version: Number(row.version), school_year: Number(row.year),
    classroom: row.section, institution_name: row.institution_name,
    period_start: dateOnly(row.period_start), period_end: dateOnly(row.period_end),
    confirmed_at: row.teacher_confirmed_at ? timestamp(row.teacher_confirmed_at) : null,
    content: selectContent(row.details, ["introduction", "sections", "closing_note"]) } : null;
}

/** Aggregate only authorized diagnostic sources for the classroom Word report.
 * Family answers, child comments and observation text stay outside this projection.
 */
export async function loadDiagnosticWordContext(db, teacherId, reviewId) {
  if (!validId(reviewId)) return null;
  const scope = (await db.query(`select d.classroom_id,c.section,sy.year,ag.age_years,
      coalesce(ip.display_name,c.institution_name) as institution_name,ip.ugel,p.display_name as teacher_name
    from diagnostic_group_reviews d join classrooms c on c.id=d.classroom_id
    join school_years sy on sy.id=c.school_year_id join age_grades ag on ag.id=c.age_grade_id
    join profiles p on p.user_id=c.teacher_id
    left join institution_profiles ip on ip.owner_user_id=c.teacher_id
    where d.id=$2 and c.teacher_id=$1 and sy.owner_id=$1`, [teacherId, reviewId])).rows[0];
  if (!scope) return null;
  const students = (await db.query(`select id,first_name,last_name,preferred_name
    from students where classroom_id=$1 and status='active'`, [scope.classroom_id])).rows;
  const activeIds = new Set(students.map((row) => row.id));
  const [guided, spontaneous, legacy, interviews, childReviews] = await Promise.all([
    db.query(`select o.student_id,o.competency_v4_id,o.observed_at from diagnostic_experience_observations o
      join students s on s.id=o.student_id and s.classroom_id=o.classroom_id
      where o.classroom_id=$1 and s.status='active'`, [scope.classroom_id]),
    db.query(`select o.student_id,o.competency_v4_id,o.classification_status,o.observed_at
      from diagnostic_spontaneous_observations o join students s on s.id=o.student_id and s.classroom_id=o.classroom_id
      where o.classroom_id=$1 and s.status='active'`, [scope.classroom_id]),
    db.query(`select de.student_id,so.observed_at from student_observations so
      join diagnostic_entries de on de.id=so.diagnostic_entry_id
      join diagnostic_sessions ds on ds.id=de.session_id
      join students s on s.id=de.student_id and s.classroom_id=ds.classroom_id
      where ds.classroom_id=$1 and s.status='active'`, [scope.classroom_id]),
    db.query(`select distinct i.student_id from student_family_interviews i
      join students s on s.id=i.student_id and s.classroom_id=i.classroom_id
      where i.classroom_id=$1 and i.status='confirmed' and s.status='active'`, [scope.classroom_id]),
    db.query(`select distinct r.student_id from diagnostic_student_reviews r
      join students s on s.id=r.student_id and s.classroom_id=r.classroom_id
      where r.classroom_id=$1 and r.status='confirmed' and s.status='active'`, [scope.classroom_id]),
  ]);
  const observations = [...guided.rows, ...spontaneous.rows, ...legacy.rows]
    .filter((row) => activeIds.has(row.student_id));
  const coverage = new Map();
  for (const row of [...guided.rows, ...spontaneous.rows.filter((item) => item.classification_status === 'classified')]) {
    if (!row.competency_v4_id) continue;
    const item = coverage.get(row.competency_v4_id) ?? { competency_id: row.competency_v4_id, records: 0, students: new Set() };
    item.records += 1;
    item.students.add(row.student_id);
    coverage.set(row.competency_v4_id, item);
  }
  const dates = observations.map((row) => dateOnly(row.observed_at)).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
  return {
    institution_name: scope.institution_name, ugel: scope.ugel, teacher_name: scope.teacher_name,
    classroom: scope.section, age: Number(scope.age_years), school_year: Number(scope.year),
    student_count: students.length, student_names: students.flatMap((row) =>
      [row.first_name, row.last_name, row.preferred_name].filter(Boolean)),
    interview_count: interviews.rows.length, reviewed_children: childReviews.rows.length,
    observed_children: new Set(observations.map((row) => row.student_id)).size,
    observation_count: observations.length,
    observed_from: dates[0] ?? null, observed_to: dates.at(-1) ?? null,
    competency_coverage: [...coverage.values()].map((item) => ({ competency_id: item.competency_id,
      student_count: item.students.size, record_count: item.records })),
  };
}
