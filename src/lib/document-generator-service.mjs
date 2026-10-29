import { loadKnowledgeBaseV4 } from './knowledge-base-v4.mjs';
import { applicableCompetencyCards } from './competency-applicability.mjs';
import { isDocumentGenerator } from './ayni-product-mode.mjs';
import { workshopCatalog } from './workshop-catalog.mjs';
import { workshopForAge } from './workshop-ages.mjs';
import { hasWorkshopPrintMaterial } from './workshop-print-material.mjs';

export const GENERATOR_FORMATS = [
  { id: 'roster', title: 'Nómina del aula', description: 'Nombres, edad curricular y datos del colegio.' },
  { id: 'diagnostic', title: 'Diagnóstico del aula', description: 'Competencias por edad y espacios para registrar hallazgos y prioridades.' },
  { id: 'observations', title: 'Registro de observaciones', description: 'Nombres y espacios para escribir lo que cada niño hace o dice.' },
  { id: 'evaluation', title: 'Registro de evaluación', description: 'Matriz de alumnos y competencias con valoraciones vacías.' },
  { id: 'conclusions', title: 'Conclusiones descriptivas', description: 'Una ficha por alumno con competencias y espacios para completar.' },
  { id: 'family', title: 'Informe a la familia', description: 'Identificación y competencias de cada niño, listas para completar en Word.' },
  { id: 'attendance', title: 'Registro de asistencia', description: 'Lista del aula y casillas por día del mes elegido.' },
];

export async function loadDocumentGeneratorContext(db, teacherId) {
  if (!(await isDocumentGenerator(db, teacherId))) throw new TypeError('Esta cuenta no usa el generador de documentos.');
  const rows = (await db.query(`select c.*,ag.age_years as age,y.year,p.display_name as teacher_name,
      coalesce(ip.display_name,c.institution_name) as school_name,ip.ugel,ip.district,ip.director_name,ip.institution_code
    from classrooms c join school_years y on y.id=c.school_year_id and y.owner_id=$1
    join profiles p on p.user_id=c.teacher_id left join age_grades ag on ag.id=c.age_grade_id
    left join institution_profiles ip on ip.owner_user_id=c.teacher_id
    where c.teacher_id=$1 and c.status='active'`, [teacherId])).rows;
  if (rows.length !== 1) throw new TypeError('Configura tu aula antes de descargar documentos.');
  const row = rows[0], multi = Number(row.curriculum_contract_version) === 2;
  const students = (await db.query(`select id,first_name,last_name,birth_date::text from students
    where classroom_id=$1 and status='active' order by last_name,first_name,id`, [row.id])).rows;
  let groups = [], assignments = [];
  if (multi) {
    groups = (await db.query(`select g.id,ag.age_years as age from classroom_age_groups g
      join age_grades ag on ag.id=g.age_grade_id where g.classroom_id=$1 and g.status='active' order by ag.age_years`, [row.id])).rows;
    assignments = (await db.query(`select a.student_id,ag.age_years as age from student_curriculum_assignments a
      join age_grades ag on ag.id=a.age_grade_id where a.classroom_id=$1 and a.school_year_id=$2 and a.status='active'`, [row.id, row.school_year_id])).rows;
  }
  const ages = multi ? groups.map(g => Number(g.age)) : [Number(row.age)];
  if (!ages.length || ages.some(a => ![3,4,5].includes(a))) throw new TypeError('Revisa las edades curriculares del aula.');
  const kb = await loadKnowledgeBaseV4();
  const conditions = { castellanoL2Applicable: row.castellano_l2_applicable === true, religionApplicable: row.religion_applicable === true };
  let planningContext=[];
  if(multi){
    const decision=(await db.query(`select messages from multi_age_planning_decisions where teacher_id=$1
      and classroom_id=$2 and scope_key='annual' order by revision desc limit 1`,[teacherId,row.id])).rows[0];
    planningContext=(decision?.messages??[]).map(message=>message.text);
  }else{
    const conversation=(await db.query(`select payload from ai_pending_generations where classroom_id=$1
      and workflow='annual_journey_conversation' and payload->>'teacher_id'=$2 and expires_at>now()
      order by created_at desc,id limit 1`,[row.id,teacherId])).rows[0];
    // Use the current editable context; never restore items the teacher removed.
    planningContext=(conversation?.payload?.context_draft?.value?.contextItems??[]).map(item=>item.text);
  }
  planningContext=planningContext.filter(text=>typeof text==='string'&&text.trim());
  return { classroomId: row.id, institution: row.school_name, teacher: row.teacher_name, section: row.section,
    planningContext,
    year: Number(row.year), ages, multi, ugel: row.ugel ?? '', district: row.district ?? '', director: row.director_name ?? '', institutionCode: row.institution_code ?? '',
    students: students.map(s => {
      const age = multi ? Number(assignments.find(a => a.student_id === s.id)?.age) : ages[0];
      if (!ages.includes(age)) throw new TypeError('Un niño no tiene su edad curricular confirmada. Revisa la matrícula.');
      return { id: s.id, name: `${s.first_name} ${s.last_name}`.trim(), age, birthDate: s.birth_date ?? '' };
    }),
    curriculumVersion: kb.version ?? 'v4.1.0',
    competencies: ages.map(age => ({ age, cards: applicableCompetencyCards(kb.competencyCards, age, conditions)
      .map(c => ({ id: c.id, name: c.official_name, reference: c.ages[String(age)] })) })),
    formats: GENERATOR_FORMATS,
  };
}

export function generatorWorkshops(context, age) {
  if (!context.ages.includes(age)) throw new TypeError('Elige una edad de tu aula.');
  return workshopCatalog.map(w => workshopForAge(w, age)).filter(Boolean).map(w=>({...w,printable:hasWorkshopPrintMaterial({resources:w.resources,workshopId:w.id,age})}));
}

export function generatorDocumentSelection(context, { studentId, period = '1', month = '3' } = {}) {
  if (!['1','2','3','4'].includes(String(period))) throw new TypeError('Elige un bimestre del 1 al 4.');
  if (!/^([1-9]|1[0-2])$/.test(String(month))) throw new TypeError('Elige un mes válido.');
  const students = studentId ? context.students.filter(s => s.id === studentId) : context.students;
  if (!students.length) throw new TypeError(studentId ? 'El alumno no pertenece a tu aula.' : 'Agrega a tus alumnos antes de descargar este formato.');
  const ages=studentId?[students[0].age]:context.ages;
  return { ...context, ages, competencies:context.competencies.filter(group=>ages.includes(group.age)), students, period: Number(period), month: Number(month) };
}
