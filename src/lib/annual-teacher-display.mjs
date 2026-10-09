/** Resolve saved aliases by source IDs, never by the current roster's position. */
export async function annualDisplaySubjects(db, { teacherId, classroomId, proposal }) {
  const facts = proposal?.classroom_snapshot?.facts ?? [];
  const ids = [...new Set(facts.flatMap(fact => (fact.source_refs ?? []).map(ref => ref.id)))].filter(id =>
    typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  if (!ids.length) return {};
  const records = (await db.query(`select source.id, s.id as student_id,
    coalesce(nullif(s.preferred_name,''),s.first_name) as name
    from (
      select id,student_id,classroom_id from ordinary_observations where id=any($3::uuid[])
      union all select id,student_id,classroom_id from diagnostic_spontaneous_observations where id=any($3::uuid[])
      union all select id,student_id,classroom_id from diagnostic_experience_observations where id=any($3::uuid[])
      union all select id,student_id,classroom_id from student_family_interviews where id=any($3::uuid[])
      union all select so.id,de.student_id,ds.classroom_id from student_observations so
        join diagnostic_entries de on de.id=so.diagnostic_entry_id join diagnostic_sessions ds on ds.id=de.session_id
        where so.id=any($3::uuid[])
    ) source join students s on s.id=source.student_id and s.classroom_id=source.classroom_id
    join classrooms c on c.id=s.classroom_id join school_years sy on sy.id=c.school_year_id
    where c.id=$1 and c.teacher_id=$2 and sy.owner_id=$2`, [classroomId, teacherId, ids])).rows;
  const byId = new Map(records.map(row => [row.id, row]));
  const bindings = new Map();
  const subjects = {};
  for (const fact of facts) {
    if (!/^child_\d+$/i.test(fact.subject ?? "")) continue;
    const matches = (fact.source_refs ?? []).map(ref => byId.get(ref.id)).filter(Boolean);
    const alias = fact.subject.toLowerCase();
    bindings.set(alias, [...(bindings.get(alias) ?? []), ...matches]);
  }
  for (const [alias, matches] of bindings) if (new Set(matches.map(row => row.student_id)).size === 1) subjects[alias] = matches[0].name;
  return subjects;
}

/** Teacher-only presentation. Stored evidence, model payloads and IDs stay literal. */
export function annualTeacherText(value, subjects = {}) {
  return typeof value === "string" ? value.replace(/\bchild_\d+\b/gi, alias => subjects[alias.toLowerCase()] || "un niño o niña") : value;
}
const proseKeys = new Set(["title", "purpose", "rationale", "invitation", "children_actions", "materials", "supports", "flexibility",
  "interpretation", "organization_criteria", "transversal_approaches", "teaching_strategies", "assessment_followup", "family_collaboration",
  "inclusive_supports", "child_action", "conditions", "mediation", "observation", "teacher_notes", "suggested_experiences", "what_to_observe", "family_actions", "diagnostic_focus"]);
export function annualTeacherProposalView(proposal, subjects = {}) {
  const walk = (value, prose = false) => typeof value === "string" ? prose ? annualTeacherText(value, subjects) : value
    : Array.isArray(value) ? value.map(item => walk(item, prose))
      : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, walk(item, proseKeys.has(key))])) : value;
  return walk(proposal);
}
