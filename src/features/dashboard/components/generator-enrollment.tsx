'use client';
import {useState} from 'react';
import {Input} from '@/components/ui/input';
import {multiAgeAppRequest as api} from '@/src/lib/multi-age-app-client';
import type {MultiAgeAppState} from '@/src/lib/multi-age-app-types';
import {EnrollmentWorkspace} from './enrollment-workspace';

type Workspace=NonNullable<MultiAgeAppState['workspace']>;
/** Only the V2 data/age adapter. The entire enrollment screen is the original. */
export function GeneratorEnrollment({w,onRefresh,onContinue,onBack,onSignOut}:{w:Workspace;onRefresh:()=>Promise<void>;onContinue:()=>void;onBack:()=>void;onSignOut?:()=>void}){
 const [age,setAge]=useState(w.classroom.ages[0]),[reason,setReason]=useState(''),[editingId,setEditingId]=useState<string|null>(null);
 const [enrolledOn,setEnrolledOn]=useState(w.classroom.starts_on);
 const editing=w.students.find(s=>s.id===editingId);
 const changeEnrollment=async(studentId:string,status:'active'|'inactive')=>{await api('/roster/enrollment',{classroomId:w.classroom.id,studentId,status,expectedStatus:status==='active'?'inactive':'active',teacherConfirmed:true});};
 return <EnrollmentWorkspace documentsOnly onBack={onBack} onContinue={async()=>onContinue()} onSignOut={onSignOut} backend={{
   teacherName:w.classroom.teacher_name??'Profesora',students:w.students.map(s=>({...s,name:`${s.first_name} ${s.last_name}`,age_years:s.age})),
   dirty:editing?age!==editing.age||Boolean(reason.trim()):age!==w.classroom.ages[0]||enrolledOn!==w.classroom.starts_on,
   refresh:onRefresh,onEdit:student=>{const own=w.students.find(s=>s.id===student?.id);setEditingId(own?.id??null);setAge(own?.age??w.classroom.ages[0]);setEnrolledOn(own?.enrolled_on??w.classroom.starts_on);setReason('');},
   save:async(students,student,requestId)=>{
     if(student){const own=w.students.find(s=>s.id===student.id);if(!own)throw new Error('Actualiza la lista de niños.');
       await api('/corrections/student',{...students[0],preferredName:own.preferred_name,studentId:own.id,age,reason,impactsAcknowledged:true,teacherConfirmed:true,expectedAssignmentId:own.assignment_id,expectedStudentFingerprint:own.correction_fingerprint});return own.id;}
     const saved=await api<{studentIds:string[]}>('/roster/import',{students,age,enrolledOn,classroomId:w.classroom.id,expectedRevision:w.classroom.curriculum_revision,teacherConfirmed:true,clientRequestId:requestId});return saved.studentIds[0];
   },
   remove:student=>changeEnrollment(student.id,'inactive'),recover:id=>changeEnrollment(id,'active'),
   extraFields:<div className="mt-4 space-y-4"><label className="block text-sm font-semibold">Edad curricular<select className="mt-2" value={age} onChange={e=>setAge(Number(e.target.value))}>{w.classroom.ages.map(age=><option key={age} value={age}>{age} años</option>)}</select></label>{!editing&&<><label className="block text-sm font-semibold">Fecha de ingreso al aula<Input type="date" required value={enrolledOn} min={w.classroom.starts_on} max={w.classroom.ends_on} onChange={e=>setEnrolledOn(e.target.value)}/></label><p className="text-sm text-[#476596]">Al importar una lista, esta edad y fecha se aplican a todos sus niños. Puedes importar cada grupo por separado.</p></>}{editing&&<label className="block text-sm font-semibold">Motivo del cambio<Input required minLength={3} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/><span className="mt-2 block font-normal">Al guardar confirmas la edad elegida. Los documentos anteriores conservan su versión.</span></label>}</div>
 }}/>
}
