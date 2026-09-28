import JSZip from "jszip";
import { listConfirmedDocumentArtifacts, readConfirmedDocumentArtifact } from "./document-artifact-service.mjs";
import { artifactRelativePath } from "./document-sync-path.mjs";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function buildAuthorizedDocumentZip(db, storage, teacherId, artifactIds) {
  if (!Array.isArray(artifactIds) || !artifactIds.length || artifactIds.length > 100 ||
    artifactIds.some(id => !uuid.test(id)) || new Set(artifactIds).size !== artifactIds.length)
    throw new Error("Selecciona entre 1 y 100 documentos distintos.");
  const allowed = new Map((await listConfirmedDocumentArtifacts(db,teacherId)).map(row => [row.id,row]));
  if (artifactIds.some(id => !allowed.has(id))) return null;
  if (new Set(artifactIds.map(id=>allowed.get(id).classroom_id)).size !== 1)
    throw new Error("Selecciona documentos de una sola aula por ZIP.");
  const zip = new JSZip(), entries = [];
  for (const id of artifactIds) {
    const artifact = await readConfirmedDocumentArtifact(db,storage,teacherId,id);
    if (!artifact) return null;
    const path = artifactRelativePath({ ...allowed.get(id),...artifact });
    zip.file(path,artifact.bytes,{binary:true,date:new Date("2020-01-01T00:00:00Z")});
    entries.push({ document_id:artifact.id,artifact_version:artifact.version,
      source_kind:artifact.source_kind,source_id:artifact.source_id,sha256:artifact.sha256,
      byte_length:artifact.byte_length,path });
  }
  entries.sort((a,b)=>a.path.localeCompare(b.path));
  zip.file("manifest.json",JSON.stringify({ format:"ayni-document-sync-v1",entries },null,2),
    {date:new Date("2020-01-01T00:00:00Z")});
  return { bytes: await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE"}),entries };
}
