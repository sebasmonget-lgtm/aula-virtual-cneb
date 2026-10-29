import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openMultiAgeLocalDb } from './multi-age-local-db.mjs';
import { seedMultiAgeAreaFixture } from './fixtures/multi-age-area-fixture.mjs';
import { multiAgeLocalWorkspace } from '../src/lib/multi-age-local-service.mjs';
import { validateOfficialPerformanceRefs } from '../src/lib/official-performance-references.mjs';
test('area fixture creates only a new synthetic classroom, authored masters and own age references',{timeout:90000},async()=>{
  const db=await openMultiAgeLocalDb(),teacher=randomUUID();
  try{
    await db.query("insert into profiles(user_id,display_name) values($1,'Docente ficticia de áreas')",[teacher]);
    const f=await seedMultiAgeAreaFixture(db,teacher),w=await multiAgeLocalWorkspace(db,teacher,f.classroomId);
    assert.equal(f.setupSource,'authored_synthetic_fixture_not_ai');assert.equal(w.projects.length,2);assert.equal(w.students.length,3);assert.equal(w.activities.length,2);
    assert.deepEqual(f.areas.map(a=>a.competencyId),['COM_ORAL','MAT_CANTIDAD']);
    for(const project of w.projects)for(const family of project.criteriaFamilies){assert.deepEqual(family.variants.map(v=>v.curricular_age),[3,4,5]);for(const variant of family.variants)assert.equal(validateOfficialPerformanceRefs(variant.official_performance_refs,family.competency_id,variant.curricular_age,{required:true}).length,2);}
    assert.equal((await db.query('select count(*)::int n from multi_age_generation_jobs')).rows[0].n,0);
    assert.ok(w.projects.find(p=>p.criteriaFamilies[0].competency_id==='MAT_CANTIDAD').criteriaFamilies[0].variants[0].criterion_text.includes('sin exigir un orden convencional'));
    await assert.rejects(seedMultiAgeAreaFixture(db,teacher),/no reemplaza/);
    assert.equal((await multiAgeLocalWorkspace(db,teacher,f.classroomId)).activities.length,2);
  }finally{await db.close();}
});
