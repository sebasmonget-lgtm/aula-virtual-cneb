/** Read only names and curricular ages from the authorized source classroom. */
export async function planningExportRoster(db,teacherId,kind,id){
 if(kind!=='activity')return null;
 const rows=(await db.query(`select s.id,s.first_name,s.last_name,coalesce(assigned.age_years,base.age_years) as age
  from activities source join learning_experiences p on p.id=source.experience_id
  join classrooms c on c.id=p.classroom_id join school_years sy on sy.id=c.school_year_id
  join students s on s.classroom_id=c.id
  left join age_grades base on base.id=c.age_grade_id
  left join student_curriculum_assignments a on a.student_id=s.id and a.classroom_id=c.id and a.school_year_id=sy.id and a.status='active'
  left join age_grades assigned on assigned.id=a.age_grade_id
  where source.id=$1 and c.teacher_id=$2 and sy.owner_id=$2 and s.status in ('active','archived')
  order by s.last_name,s.first_name,s.id`,[id,teacherId])).rows;
 const students=rows.map(s=>({studentId:s.id,name:[s.first_name,s.last_name].filter(Boolean).join(' ').trim(),age:Number(s.age)}));
 if(students.some(s=>![3,4,5].includes(s.age)))throw new TypeError('Falta la edad curricular de un alumno de la nómina.');
 return {contract:'ayni-document-observation-roster-v1',students};
}
