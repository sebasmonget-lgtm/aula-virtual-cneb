import { artifactRelativePath } from "./document-sync-path.mjs";

const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))]
  .map(value=>value.toString(16).padStart(2,"0")).join("");
const bytesOf = value => value instanceof Uint8Array ? value : new Uint8Array(value);
const missing = error => error?.name === "NotFoundError" || error?.code === 8;

async function existingFile(directory,name) {
  try { return await directory.getFileHandle(name,{create:false}); }
  catch(error) { if (missing(error)) return null;throw error; }
}
async function fileDigest(handle) { return digest(await (await handle.getFile()).arrayBuffer()); }
async function folder(root,segments) {
  let current=root;
  for(const segment of segments) current=await current.getDirectoryHandle(segment,{create:true});
  return current;
}
async function verifiedWrite(directory,name,bytes,expected) {
  const handle=await directory.getFileHandle(name,{create:true});
  const current=await handle.getFile();
  if (current.size) return (await fileDigest(handle)) === expected ? "skipped" : "conflict";
  const stream=await handle.createWritable();
  await stream.write(bytes);await stream.close();
  if ((await fileDigest(handle)) !== expected) throw new Error("El archivo escrito no coincide con el documento confirmado.");
  return "written";
}

async function readManifest(root) {
  const handle=await existingFile(root,".ayni-sync.json");
  if(!handle) return {format:"ayni-document-sync-v1",entries:{}};
  let value;
  try { value=JSON.parse(await (await handle.getFile()).text()); }
  catch { throw new Error("El manifiesto local fue modificado. No se sobrescribirá."); }
  if(value?.format!=="ayni-document-sync-v1" || !value.entries || typeof value.entries!=="object"
    || Array.isArray(value.entries)) throw new Error("El manifiesto local fue modificado. No se sobrescribirá.");
  return value;
}
async function writeManifest(root,manifest) {
  const handle=await root.getFileHandle(".ayni-sync.json",{create:true});
  const stream=await handle.createWritable();
  await stream.write(JSON.stringify(manifest,null,2));await stream.close();
}

/** Browser-side only. Never deletes files or sends the chosen local path to the server. */
export async function syncDocumentArtifacts(root,artifacts,download,{copyConflicts=false,onProgress=(event)=>{void event;}}={}) {
  if (!root?.getDirectoryHandle || !Array.isArray(artifacts) || artifacts.length>100)
    throw new Error("Selecciona una carpeta y hasta 100 documentos.");
  const permission=await root.queryPermission?.({mode:"readwrite"});
  if(permission!=="granted" && await root.requestPermission?.({mode:"readwrite"})!=="granted")
    throw new Error("No hay permiso para escribir en la carpeta elegida.");
  const manifest=await readManifest(root), result={written:[],skipped:[],conflicts:[],copies:[]};
  for(const artifact of artifacts) {
    const relative=artifactRelativePath(artifact), segments=relative.split("/");
    const name=segments.pop(),directory=await folder(root,segments);
    const existing=await existingFile(directory,name);
    if(existing) {
      if((await fileDigest(existing))===artifact.sha256){
        result.skipped.push(artifact.id);onProgress({id:artifact.id,status:"skipped"});
        if(manifest.entries[artifact.id]?.sha256!==artifact.sha256 || manifest.entries[artifact.id]?.path!==relative){
          manifest.entries[artifact.id]={artifact_version:artifact.version,sha256:artifact.sha256,path:relative};
          await writeManifest(root,manifest);
        }
        continue;
      }
      result.conflicts.push({id:artifact.id,path:relative});onProgress({id:artifact.id,status:"conflict"});
      if(!copyConflicts) continue;
      const copyName=name.replace(/\.docx$/,`-copia-${artifact.id.slice(0,8)}.docx`);
      const priorCopy=await existingFile(directory,copyName);
      if(priorCopy) {
        if((await fileDigest(priorCopy))===artifact.sha256){result.skipped.push(artifact.id);continue;}
        // Do not overwrite even an edited prior conflict copy.
        continue;
      }
      const bytes=bytesOf(await download(artifact));
      if((await digest(bytes))!==artifact.sha256) throw new Error("La descarga no coincide con el hash confirmado.");
      if(await verifiedWrite(directory,copyName,bytes,artifact.sha256)==="written") {
        result.copies.push({id:artifact.id,path:[...segments,copyName].join("/")});
        manifest.entries[artifact.id]={artifact_version:artifact.version,sha256:artifact.sha256,
          path:[...segments,copyName].join("/")};
        await writeManifest(root,manifest);
      }
      continue;
    }
    const bytes=bytesOf(await download(artifact));
    if((await digest(bytes))!==artifact.sha256) throw new Error("La descarga no coincide con el hash confirmado.");
    const status=await verifiedWrite(directory,name,bytes,artifact.sha256);
    if(status==="conflict") {result.conflicts.push({id:artifact.id,path:relative});continue;}
    result[status].push(artifact.id);onProgress({id:artifact.id,status});
    manifest.entries[artifact.id]={artifact_version:artifact.version,sha256:artifact.sha256,path:relative};
    await writeManifest(root,manifest);
  }
  return result;
}
