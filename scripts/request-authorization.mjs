const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export class RequestAccessError extends Error {
  constructor(status) {
    super(status === 403 ? "No tienes acceso a esta aula." : "Recurso no encontrado.");
    this.status = status;
  }
}

// Selectors locate rows; they never establish ownership. Every lookup resolves
// back to the verified teacher of the classroom or school year.
const ownerSql = {
  classroom: "select c.teacher_id as owner_id from classrooms c join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where c.id=$1",
  student: "select c.teacher_id as owner_id from students s join classrooms c on c.id=s.classroom_id join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where s.id=$1",
  year: "select owner_id from school_years where id=$1",
  period: "select y.owner_id from evaluation_periods p join school_years y on y.id=p.school_year_id where p.id=$1",
  plan: "select c.teacher_id as owner_id from annual_plans p join classrooms c on c.id=p.classroom_id join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where p.id=$1",
  experience: "select c.teacher_id as owner_id from learning_experiences e join classrooms c on c.id=e.classroom_id join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where e.id=$1",
  activity: "select c.teacher_id as owner_id from activities a join learning_experiences e on e.id=a.experience_id join classrooms c on c.id=e.classroom_id join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where a.id=$1",
  criterion: "select c.teacher_id as owner_id from activity_criteria k join activities a on a.id=k.activity_id join learning_experiences e on e.id=a.experience_id join classrooms c on c.id=e.classroom_id join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where k.id=$1",
  evidence: "select c.teacher_id as owner_id from evidences v join students s on s.id=v.student_id join classrooms c on c.id=s.classroom_id join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where v.id=$1",
  assessment: "select c.teacher_id as owner_id from competency_assessments a join students s on s.id=a.student_id join classrooms c on c.id=s.classroom_id join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where a.id=$1",
  conclusion: "select c.teacher_id as owner_id from competency_descriptive_conclusions a join students s on s.id=a.student_id join classrooms c on c.id=s.classroom_id join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where a.id=$1",
  report: "select c.teacher_id as owner_id from family_reports r join students s on s.id=r.student_id join classrooms c on c.id=s.classroom_id join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where r.id=$1",
  schedule: "select c.teacher_id as owner_id from class_schedule_entries e join classrooms c on c.id=e.classroom_id join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where e.id=$1",
  diagnostic_review: "select c.teacher_id as owner_id from diagnostic_competency_reviews r join classrooms c on c.id=r.classroom_id where r.id=$1",
  student_review: "select c.teacher_id as owner_id from diagnostic_student_reviews r join classrooms c on c.id=r.classroom_id where r.id=$1",
  group_review: "select c.teacher_id as owner_id from diagnostic_group_reviews r join classrooms c on c.id=r.classroom_id where r.id=$1",
  spontaneous_observation: "select c.teacher_id as owner_id from diagnostic_spontaneous_observations o join classrooms c on c.id=o.classroom_id where o.id=$1",
};

const selectorFields = {
  classroomId: "classroom", studentId: "student", schoolYearId: "year", yearId: "year",
  periodId: "period", evaluationPeriodId: "period", annualPlanId: "plan", planId: "plan",
  experienceId: "experience", activityId: "activity", criterionId: "criterion",
  evidenceId: "evidence", assessmentId: "assessment", conclusionId: "conclusion",
  reportId: "report", scheduleEntryId: "schedule",
};

function pathSelector(pathname) {
  const parts = pathname.split("/");
  if (parts[1] !== "api") return null;
  if (parts[2] === "students" && parts[3] && parts[3] !== "import") return ["student", parts[3]];
  if (parts[2] === "diagnostics") {
    if (parts[3] === "students" && parts[4]) return ["student", parts[4]];
    const kind = { reviews: "diagnostic_review", "student-reviews": "student_review",
      "group-review": "group_review", "spontaneous-observations": "spontaneous_observation" }[parts[3]];
    if (kind && parts[4] && !["prepare", "suggest", "matrix"].includes(parts[4])) return [kind, parts[4]];
  }
  const kind = {
    "annual-plans": "plan", "learning-experiences": "experience", activities: "activity",
    "activity-criteria": "criterion", assessments: "assessment",
    "descriptive-conclusions": "conclusion", "family-reports": "report",
  }[parts[2]];
  if (kind && parts[3] && !["options", "context", "current"].includes(parts[3])) return [kind, parts[3]];
  return null;
}

export async function authorizeRequestSelectors({ db, teacherId, url, body }) {
  const selectors = [];
  const path = pathSelector(url.pathname);
  if (path) selectors.push(path);
  for (const [field, kind] of Object.entries(selectorFields)) {
    const queryValue = url.searchParams.get(field);
    if (queryValue) selectors.push([kind, queryValue]);
    if (body && typeof body[field] === "string") selectors.push([kind, body[field]]);
  }
  if (Array.isArray(body?.records)) {
    for (const record of body.records) if (typeof record?.studentId === "string") selectors.push(["student", record.studentId]);
  }
  const checked = new Set();
  for (const [kind, id] of selectors) {
    if (!uuid.test(id)) throw new RequestAccessError(404);
    const key = `${kind}:${id}`;
    if (checked.has(key)) continue;
    checked.add(key);
    const row = (await db.query(ownerSql[kind], [id])).rows[0];
    if (!row) throw new RequestAccessError(404);
    if (row.owner_id !== teacherId) throw new RequestAccessError(kind === "classroom" ? 403 : 404);
  }
}
