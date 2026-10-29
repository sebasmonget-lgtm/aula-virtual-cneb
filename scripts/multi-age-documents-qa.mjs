import { writeFile,mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { makeMultiAgeDocumentFixture } from './fixtures/multi-age-document-fixture.mjs';
import { loadMultiAgeDocument } from '../src/lib/multi-age-document-service.mjs';
import { renderMultiAgePlanningWord } from '../src/lib/multi-age-planning-word.mjs';

/** Reproducible fictitious documents from the real local services; no credentials or app database. */
const fixture=await makeMultiAgeDocumentFixture(),directory=new URL('../.local/multi-age-documents-20261022/',import.meta.url);
try{
  await mkdir(directory,{recursive:true});
  const documents=[['mi-ano-multiedad.docx','annual_plan',fixture.plan.planId],...fixture.children.map(c=>[`diagnostico-${c.age}-anos.docx`,'diagnostic_student_review',c.reviewId])];
  for(const [name,kind,id]of documents){const document=await loadMultiAgeDocument(fixture.db,fixture.teacher,kind,id);await writeFile(new URL(name,directory),await renderMultiAgePlanningWord(document));process.stdout.write(`${fileURLToPath(new URL(name,directory))}\n`);}
}finally{await fixture.db.close();}
