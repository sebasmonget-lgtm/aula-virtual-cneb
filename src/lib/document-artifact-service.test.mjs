import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import JSZip from "jszip";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { createLocalPrivateDocumentArtifactStorage,
  createSupabasePrivateDocumentArtifactStorage } from "./private-document-artifact-storage.mjs";
import { listConfirmedDocumentArtifacts,listDocumentArtifactStates,prepareConfirmedDocumentArtifact,
  readConfirmedDocumentArtifact } from "./document-artifact-service.mjs";
import { buildAuthorizedDocumentZip } from "./document-sync-package.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const foreign = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function fixture() {
  const db = new PGlite(), directory = new URL("../../local-db/migrations/",import.meta.url);
  for (const name of (await readdir(directory)).filter(name=>name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(name,directory),"utf8"));
  const own = await createPilotClassroom(db,teacher,{ teacherName:"Docente A",institutionName:"Jardín",
    section:"A",age:5,year:2026,startsOn:"2026-03-01",endsOn:"2026-12-31",
    castellanoL2Applicable:false,religionApplicable:false });
  await createPilotClassroom(db,foreign,{ teacherName:"Docente B",institutionName:"Otro",
    section:"B",age:5,year:2026,startsOn:"2026-03-01",endsOn:"2026-12-31",
    castellanoL2Applicable:false,religionApplicable:false });
  const curriculum = (await db.query(`select id from curriculum_versions where active=true limit 1`)).rows[0].id;
  const plan = randomUUID(), project = randomUUID();
  await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,
    proposal,teacher_confirmed_at) values($1,$2,$3,$4,1,'active',$5::jsonb,now())`,
  [plan,own.classroomId,own.schoolYearId,curriculum,JSON.stringify({title:"Mi año",proposed_experiences:[]})]);
  await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,
    status,version,details,teacher_confirmed_at)
    values($1,$2,'project','Proyecto de prueba','Explorar','2026-10-19','2026-11-06',
      'active',1,$3::jsonb,now())`,[project,own.classroomId,JSON.stringify({starting_point:"Juego observado"})]);
  const root = await mkdtemp(path.join(tmpdir(),"ayni-artifact-"));
  return { db,root,plan,project,storage:createLocalPrivateDocumentArtifactStorage(root) };
}

test("F10 congela bytes/hash por fuente confirmada, reintenta sin regenerar y aísla docentes",async()=>{
  const f = await fixture();let renders=0;
  const render = async() => { renders++;return {buffer:Buffer.from("PK:documento-estable")}; };
  try {
    assert.equal(await prepareConfirmedDocumentArtifact(f.db,f.storage,foreign,"annual_plan",f.plan,{render}),null);
    const first = await prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"annual_plan",f.plan,{render});
    assert.equal(first.status,"confirmed");assert.equal(first.byte_length,Buffer.byteLength("PK:documento-estable"));
    assert.match(first.sha256,/^[0-9a-f]{64}$/);
    const second = await prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"annual_plan",f.plan,{render});
    assert.equal(second.id,first.id);assert.equal(renders,1);
    const download = await readConfirmedDocumentArtifact(f.db,f.storage,teacher,first.id);
    assert.equal(download.bytes.toString(),"PK:documento-estable");
    assert.equal(await readConfirmedDocumentArtifact(f.db,f.storage,foreign,first.id),null);
    assert.equal((await listConfirmedDocumentArtifacts(f.db,teacher)).length,1);
    assert.equal((await listConfirmedDocumentArtifacts(f.db,foreign)).length,0);
    await assert.rejects(f.db.query(`update document_artifacts set filename='otro.docx' where id=$1`,[first.id]),/inmutable/);
    await assert.rejects(f.db.query(`delete from document_artifacts where id=$1`,[first.id]),/no se borra/);
    const project = await prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"experience",f.project,{render});
    assert.notEqual(project.id,first.id);
    assert.equal((await listConfirmedDocumentArtifacts(f.db,teacher)).length,2);
  } finally { await f.db.close();await rm(f.root,{recursive:true,force:true}); }
});

test("F10 conserva pending tras fallo y reintento materializa una sola versión",async()=>{
  const f = await fixture();let attempts=0;
  try {
    await assert.rejects(prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"annual_plan",f.plan,
      {render:async()=>{attempts++;throw new Error("render falló");}}),/render falló/);
    const failed=(await f.db.query(`select id,status,attempts from document_artifacts where source_id=$1`,[f.plan])).rows[0];
    assert.equal(failed.status,"failed");assert.equal(failed.attempts,1);
    const ready=await prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"annual_plan",f.plan,
      {render:async()=>{attempts++;return {buffer:Buffer.from("PK:retry")};}});
    assert.equal(ready.id,failed.id);assert.equal(attempts,2);
    assert.equal((await f.db.query(`select status,attempts from document_artifacts where id=$1`,[ready.id])).rows[0].status,"confirmed");
  } finally { await f.db.close();await rm(f.root,{recursive:true,force:true}); }
});

test("F10 renderiza y congela un DOCX real de proyecto confirmado",async()=>{
  const f=await fixture();
  try {
    const artifact=await prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"experience",f.project);
    const first=await readConfirmedDocumentArtifact(f.db,f.storage,teacher,artifact.id);
    const second=await readConfirmedDocumentArtifact(f.db,f.storage,teacher,artifact.id);
    assert.deepEqual(first.bytes,second.bytes);
    const zip=await JSZip.loadAsync(first.bytes);
    const xml=await zip.file("word/document.xml").async("string");
    assert.match(xml,/Proyecto de prueba/);
    assert.match(xml,/Juego observado/);
    assert.equal(artifact.sha256,first.sha256);
  } finally { await f.db.close();await rm(f.root,{recursive:true,force:true}); }
});

test("F10 renderiza un DOCX real de plan anual confirmado",async()=>{
  const f=await fixture();
  try {
    const artifact=await prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"annual_plan",f.plan);
    const bytes=(await readConfirmedDocumentArtifact(f.db,f.storage,teacher,artifact.id)).bytes;
    const zip=await JSZip.loadAsync(bytes), xml=await zip.file("word/document.xml").async("string");
    assert.match(xml,/Mi año/);
  } finally { await f.db.close();await rm(f.root,{recursive:true,force:true}); }
});

test("Storage remoto privado no sobrescribe y nunca acepta clave de otro docente",async()=>{
  const stored=new Map();
  const fetchImpl=async(url,options={})=>{
    const key=decodeURIComponent(url.split("/ayni-document-artifacts/")[1]);
    if(options.method==="POST"){
      if(stored.has(key)) return {ok:false,status:409};
      stored.set(key,Buffer.from(options.body));return {ok:true,status:200};
    }
    const bytes=stored.get(key);
    return bytes?{ok:true,status:200,arrayBuffer:async()=>bytes}:{ok:false,status:404};
  };
  const storage=createSupabasePrivateDocumentArtifactStorage({url:"https://new-project.supabase.co",
    serviceRoleKey:"server-only-test-token",fetchImpl});
  const id=randomUUID(), key=`${teacher}/${id}.docx`;
  assert.equal((await storage.save(key,Buffer.from("primero"),teacher)).toString(),"primero");
  assert.equal((await storage.save(key,Buffer.from("segundo"),teacher)).toString(),"primero");
  await assert.rejects(storage.read(key,foreign),/privado/);
});

test("F11 ZIP conserva bytes y manifest de un aula, sin cruzar docentes",async()=>{
  const f=await fixture();
  try {
    const plan=await prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"annual_plan",f.plan);
    const project=await prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"experience",f.project);
    const output=await buildAuthorizedDocumentZip(f.db,f.storage,teacher,[plan.id,project.id]);
    assert.equal(output.entries.length,2);
    const zip=await JSZip.loadAsync(output.bytes);
    const manifest=JSON.parse(await zip.file("manifest.json").async("string"));
    assert.equal(manifest.format,"ayni-document-sync-v1");
    assert.equal(manifest.entries.length,2);
    for(const entry of manifest.entries){
      assert.match(entry.path,/^2026\/Aula-[^/]+\/(?:Plan-anual|Proyectos)\//);
      const saved=await readConfirmedDocumentArtifact(f.db,f.storage,teacher,entry.document_id);
      assert.deepEqual(await zip.file(entry.path).async("nodebuffer"),saved.bytes);
      assert.equal(entry.sha256,saved.sha256);
    }
    assert.equal(await buildAuthorizedDocumentZip(f.db,f.storage,foreign,[plan.id]),null);
    assert.equal(await buildAuthorizedDocumentZip(f.db,f.storage,teacher,[plan.id,randomUUID()]),null);
  }finally{await f.db.close();await rm(f.root,{recursive:true,force:true});}
});

test("F11 ZIP rechaza mezclar dos aulas aun del mismo docente",async()=>{
  const first=randomUUID(),second=randomUUID();
  const row=(id,classroomId)=>({id,classroom_id:classroomId,school_year:2026,classroom:"A",
    source_kind:"annual_plan",source_id:randomUUID(),artifact_version:1,source_version:1,
    filename:"plan-12345678-v1.docx",sha256:"a".repeat(64),byte_length:4,status:"confirmed"});
  const db={query:async()=>({rows:[row(first,randomUUID()),row(second,randomUUID())]})};
  await assert.rejects(buildAuthorizedDocumentZip(db,null,teacher,[first,second]),/una sola aula/);
});

test("F11 estados documentales muestran error y listo solo a su docente",async()=>{
  const f=await fixture();
  try {
    await assert.rejects(prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"annual_plan",f.plan,
      {render:async()=>{throw new Error("sin Word");}}),/sin Word/);
    assert.equal((await listDocumentArtifactStates(f.db,teacher))[0].status,"failed");
    assert.equal((await listDocumentArtifactStates(f.db,foreign)).length,0);
    await prepareConfirmedDocumentArtifact(f.db,f.storage,teacher,"annual_plan",f.plan,
      {render:async()=>({buffer:Buffer.from("PK:ok")})});
    assert.equal((await listDocumentArtifactStates(f.db,teacher))[0].status,"confirmed");
  }finally{await f.db.close();await rm(f.root,{recursive:true,force:true});}
});
