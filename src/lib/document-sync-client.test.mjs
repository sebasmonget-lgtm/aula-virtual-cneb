import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID, webcrypto } from "node:crypto";
import { syncDocumentArtifacts } from "./document-sync-client.mjs";
import { artifactRelativePath } from "./document-sync-path.mjs";

globalThis.crypto ??= webcrypto;
const bytes = value => new TextEncoder().encode(value);
const hash = value => createHash("sha256").update(value).digest("hex");
const absent = () => Object.assign(new Error("missing"),{name:"NotFoundError"});
class FileHandle {
  constructor(content=new Uint8Array()) { this.content=content; }
  async getFile() { const value=this.content;return {size:value.length,arrayBuffer:async()=>value.slice().buffer,
    text:async()=>new TextDecoder().decode(value)}; }
  async createWritable() { return {write:async value=>{this.pending=typeof value==="string"?bytes(value):new Uint8Array(value);},
    close:async()=>{this.content=this.pending;}}; }
}
class Directory {
  constructor() { this.files=new Map();this.folders=new Map();this.permission="granted"; }
  async queryPermission() { return this.permission; }
  async requestPermission() { return this.permission; }
  async getDirectoryHandle(name,{create}={}) { if(!this.folders.has(name)){
    if(!create)throw absent();this.folders.set(name,new Directory());}return this.folders.get(name); }
  async getFileHandle(name,{create}={}) { if(!this.files.has(name)){
    if(!create)throw absent();this.files.set(name,new FileHandle());}return this.files.get(name); }
}
const artifact = (value,sourceId=randomUUID(),version=1) => ({id:randomUUID(),classroom_id:randomUUID(),
  classroom:"Celeste",school_year:2026,source_kind:"annual_plan",filename:`plan-${sourceId.slice(0,8)}-v${version}.docx`,
  version,sha256:hash(bytes(value)),content:bytes(value)});
async function localFile(root,path) { let directory=root;const parts=path.split("/");const name=parts.pop();
  for(const part of parts)directory=await directory.getDirectoryHandle(part);return directory.getFileHandle(name); }
const download = item => item.content;

test("F11 primera copia, repetición sin redescarga y nueva versión",async()=>{
  const root=new Directory(),sourceId=randomUUID(),one=artifact("primera",sourceId),two=artifact("segunda",sourceId,2);
  two.classroom_id=one.classroom_id;let calls=0;
  const fetch=item=>{calls++;return download(item);};
  assert.deepEqual((await syncDocumentArtifacts(root,[one],fetch)).written,[one.id]);
  assert.deepEqual((await syncDocumentArtifacts(root,[one],fetch)).skipped,[one.id]);
  assert.equal(calls,1);
  assert.deepEqual((await syncDocumentArtifacts(root,[two],fetch)).written,[two.id]);
  assert.equal(calls,2);
  const manifest=JSON.parse(await (await root.getFileHandle(".ayni-sync.json")).getFile().then(file=>file.text()));
  assert.equal(Object.keys(manifest.entries).length,2);
});

test("F11 edición local produce conflicto sin sobreescritura y copia explícita",async()=>{
  const root=new Directory(),item=artifact("original"),relative=artifactRelativePath(item);
  await syncDocumentArtifacts(root,[item],download);
  const file=await localFile(root,relative);file.content=bytes("edición docente");
  const conflict=await syncDocumentArtifacts(root,[item],download);
  assert.equal(conflict.conflicts.length,1);assert.equal(conflict.copies.length,0);
  assert.equal(new TextDecoder().decode(file.content),"edición docente");
  const copy=await syncDocumentArtifacts(root,[item],download,{copyConflicts:true});
  assert.equal(copy.copies.length,1);
  assert.equal(new TextDecoder().decode(file.content),"edición docente");
  assert.equal(new TextDecoder().decode((await localFile(root,copy.copies[0].path)).content),"original");
});

test("F11 permiso revocado, archivo borrado, descarga corrupta e interrumpida",async()=>{
  const root=new Directory(),item=artifact("original"),relative=artifactRelativePath(item);
  await syncDocumentArtifacts(root,[item],download);
  root.permission="denied";
  await assert.rejects(syncDocumentArtifacts(root,[item],download),/permiso/);
  root.permission="granted";
  const parts=relative.split("/"),name=parts.pop();let directory=root;
  for(const part of parts)directory=await directory.getDirectoryHandle(part);
  directory.files.delete(name);
  await assert.rejects(syncDocumentArtifacts(root,[item],()=>{throw new Error("red interrumpida");}),/red interrumpida/);
  await assert.rejects(syncDocumentArtifacts(root,[item],()=>bytes("incorrecto")),/hash/);
  assert.equal(directory.files.has(name),false);
  assert.deepEqual((await syncDocumentArtifacts(root,[item],download)).written,[item.id]);
});

test("F11 rechaza rutas documentales inválidas",()=>{
  const item=artifact("x");item.filename="../secreto.docx";
  assert.throws(()=>artifactRelativePath(item),/inválida/);
  item.filename="plan-12345678-v1.docx";item.school_year="../../";
  assert.throws(()=>artifactRelativePath(item),/inválida/);
});
