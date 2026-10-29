import {randomUUID} from 'node:crypto';
import {openMultiAgePersistentDb,multiAgeLocalStorage} from './multi-age-local-db.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent} from '../src/lib/multi-age-local-service.mjs';
import {multiAgeAnnualContext,multiAgeAnnualWorkspace,sampleMultiAgeAnnualProposal,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan} from '../src/lib/multi-age-annual.mjs';
const storeName='generador-qa-proyecto-final-20261025',db=await openMultiAgePersistentDb({storeName}),teacher=multiAgeLocalStorage(db).teacherId;
const conf=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
try{
 if((await db.query('select id from classrooms where teacher_id=$1',[teacher])).rows.length)throw new Error('El almacén QA ya está preparado; no se sobrescribe.');
 await chooseAyniProductMode(db,teacher,{mode:'documents'});
 const {classroomId}=await createMultiAgeClassroom(db,teacher,{...conf(),teacherName:'Docente ficticia',institutionName:'Colegio QA · prueba aislada',section:'Exploradores',ages:[3,4],year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});
 for(const age of [3,4])await enrollMultiAgeStudent(db,teacher,{...conf(),classroomId,expectedRevision:1,firstName:'Niño ficticio',lastName:'QA',age});
 let data=await multiAgeAnnualContext(db,teacher,classroomId);
 const proposal=sampleMultiAgeAnnualProposal(data);
 const draft=await saveMultiAgeAnnualDraft(db,teacher,{...conf(),classroomId,proposal,sourceFingerprint:data.sourceFingerprint});
 await confirmMultiAgeAnnualPlan(db,teacher,{...conf(),classroomId,planId:draft.planId,expectedRevision:draft.revision});
 data=await multiAgeAnnualContext(db,teacher,classroomId);
 const {plans}=await multiAgeAnnualWorkspace(db,teacher,classroomId),base=plans.find(p=>p.status==='active');
 await saveMultiAgeAnnualDraft(db,teacher,{...conf(),classroomId,proposal,sourceFingerprint:data.sourceFingerprint,expectedBasePlanId:base.id,expectedBaseRevision:base.revision});
 process.stdout.write(JSON.stringify({storeName,syntheticOnly:true,activeAndDraft:true,students:2})+'\n');
}finally{await db.close();}
