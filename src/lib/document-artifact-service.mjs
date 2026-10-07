import { createHash, randomUUID } from "node:crypto";
import { loadSavedDocument } from "./document-library-service.mjs";
import { prepareWordDownload } from "./document-word-export.mjs";
import { versionTransaction, VersionConflictError } from "./version-integrity.mjs";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const hash = value => createHash("sha256").update(value).digest("hex");
const supported = new Set(["annual_plan", "experience", "diagnostic_summary", "activity", "family_report", "period_closure"]);
const publicArtifact = row => ({ id: row.id, source_kind: row.source_kind, source_id: row.source_id,
  source_version: Number(row.source_version), version: Number(row.artifact_version),
  status: row.status, filename: row.filename, sha256: row.sha256,
  byte_length: row.byte_length == null ? null : Number(row.byte_length),
  mime_type: row.mime_type, school_year: row.school_year == null ? null : Number(row.school_year),
  classroom_id: row.classroom_id, classroom: row.classroom,
  title: row.title ?? null, confirmed_at: row.confirmed_at });

async function sourceScope(db, teacherId, kind, sourceId) {
  const relation = {annual_plan:"annual_plans",experience:"learning_experiences",diagnostic_summary:"diagnostic_group_reviews",activity:"activities",family_report:"family_reports",period_closure:"period_closure_versions"}[kind];
  const joins = kind === "activity" ? "join learning_experiences e on e.id=source.experience_id join classrooms c on c.id=e.classroom_id" :
    kind === "family_report" ? "join students s on s.id=source.student_id join classrooms c on c.id=s.classroom_id" : "join classrooms c on c.id=source.classroom_id";
  const confirmation = kind === "period_closure" ? "'confirmed' as status,source.confirmed_at as teacher_confirmed_at" : "source.status,source.teacher_confirmed_at";
  return (await db.query(`select source.id,source.version,${confirmation},
      c.id as classroom_id,c.section as classroom,sy.year
    from ${relation} source ${joins}
    join school_years sy on sy.id=c.school_year_id
    where source.id=$1 and c.teacher_id=$2 and sy.owner_id=$2`, [sourceId,teacherId])).rows[0] ?? null;
}

export async function prepareConfirmedDocumentArtifact(db, storage, teacherId, kind, sourceId,
  { cards = [], logo = null, photoStorage = null, render = prepareWordDownload, expectedSourceHash = null } = {}) {
  if (!supported.has(kind) || !uuid.test(sourceId ?? "")) return null;
  const scope = await sourceScope(db,teacherId,kind,sourceId);
  if (!scope) return null;
  if (!scope.teacher_confirmed_at || !["active","archived","confirmed"].includes(scope.status))
    throw new Error("Confirma primero la fuente para preparar una versión estable.");
  const document = await loadSavedDocument(db,teacherId,kind,sourceId);
  if (!document) return null;
  if (kind === "annual_plan" && document.source_plan_format === "annual_preplan_v1" && !document.formal_ready)
    throw new Error("Prepara primero el contenido formal del plan.");
  if (kind === "experience" && document.content?.document_template_version === "experience-unified-v2" && !document.formal_ready)
    throw new Error("Prepara primero el Word del proyecto confirmado.");
  const sourceHash = hash(JSON.stringify(document));
  if(expectedSourceHash && sourceHash!==expectedSourceHash)throw new VersionConflictError("El documento cambió durante la descarga. Prepara una descarga nueva; los archivos anteriores se conservan.");
  const templateVersion = kind === "annual_plan" ? document.content?.experience_context ? "annual-experience-v1" : document.document_context?.template_version ?? "annual-legacy-v1"
    : kind === "experience" ? document.content?.document_template_version ?? "experience-legacy-v1"
    : `${document.content?.document_template_version ?? document.content?.document_format ?? kind}-snapshot-${sourceHash.slice(0,16)}`;
  const row = await versionTransaction(db,`artifact:${kind}:${sourceId}`,async tx => {
    const current = (await tx.query(`select * from document_artifacts where source_kind=$1 and source_id=$2
      and source_version=$3 and artifact_version=1 and template_version=$4`,
    [kind,sourceId,scope.version,templateVersion])).rows[0];
    if (current) {
      if (current.status === "confirmed") return current;
      if (current.source_sha256 !== sourceHash) throw new VersionConflictError("La fuente cambió sin nueva versión. Revisa el documento antes de continuar.");
      return current;
    }
    const id = randomUUID();
    // Filename is fixed at creation; bytes and checksum are committed only after storage verification.
    const prefix = {annual_plan:"plan",experience:"proyecto",diagnostic_summary:"diagnostico",activity:"actividad",family_report:"informe",period_closure:"cierre"}[kind];
    const filename = `${prefix}-${sourceId.slice(0,8)}-v${scope.version}.docx`;
    return (await tx.query(`insert into document_artifacts(id,teacher_id,classroom_id,source_kind,
      source_id,source_version,template_version,source_sha256,filename)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
    [id,teacherId,scope.classroom_id,kind,sourceId,scope.version,templateVersion,sourceHash,filename])).rows[0];
  });
  if (row.status === "confirmed") return publicArtifact(row);
  const key = `${teacherId}/${row.id}.docx`;
  try {
    let bytes;
    try { bytes = await storage.read(key,teacherId); }
    catch {
      const generated = await render(db,teacherId,kind,sourceId,cards,{ logo,photoStorage });
      if (!generated?.buffer?.length) throw new Error("Word no disponible.");
      bytes = await storage.save(key,generated.buffer,teacherId);
    }
    const checksum = hash(bytes);
    if (!bytes.length || bytes.length > 30_000_000) throw new Error("Tamaño de documento inválido.");
    const confirmed = await versionTransaction(db,`artifact:${kind}:${sourceId}`,async tx => {
      const latest = (await tx.query(`select * from document_artifacts where id=$1 for update`,[row.id])).rows[0];
      if (latest.status === "confirmed") {
        if (latest.sha256 !== checksum || Number(latest.byte_length) !== bytes.length)
          throw new VersionConflictError("El archivo guardado no coincide con la versión confirmada.");
        return latest;
      }
      return (await tx.query(`update document_artifacts set status='confirmed',storage_key=$2,
        sha256=$3,byte_length=$4,confirmed_at=now(),attempts=attempts+1,last_error_code=null
        where id=$1 returning *`,[row.id,key,checksum,bytes.length])).rows[0];
    });
    return publicArtifact(confirmed);
  } catch (error) {
    await db.query(`update document_artifacts set status='failed',attempts=attempts+1,
      last_error_code='materialization_failed' where id=$1 and status<>'confirmed'`,[row.id]).catch(()=>{});
    throw error;
  }
}

export async function listConfirmedDocumentArtifacts(db, teacherId) {
  return (await db.query(`select da.*,c.section as classroom,sy.year as school_year
    from document_artifacts da join classrooms c on c.id=da.classroom_id
    join school_years sy on sy.id=c.school_year_id
    where da.teacher_id=$1 and c.teacher_id=$1 and sy.owner_id=$1 and da.status='confirmed'
    order by sy.year desc,da.confirmed_at desc,da.id`,[teacherId])).rows.map(publicArtifact);
}

export async function listDocumentArtifactStates(db, teacherId) {
  return (await db.query(`select da.id,da.source_kind,da.source_id,da.source_version,
      da.artifact_version,da.status,da.created_at
    from document_artifacts da join classrooms c on c.id=da.classroom_id
    join school_years sy on sy.id=c.school_year_id
    where da.teacher_id=$1 and c.teacher_id=$1 and sy.owner_id=$1
    order by da.created_at desc,da.id desc`,[teacherId])).rows.map(row=>({
      id:row.id,source_kind:row.source_kind,source_id:row.source_id,
      source_version:Number(row.source_version),version:Number(row.artifact_version),status:row.status,
    }));
}

export async function readConfirmedDocumentArtifact(db, storage, teacherId, artifactId) {
  if (!uuid.test(artifactId ?? "")) return null;
  const row = (await db.query(`select da.*,c.section as classroom,sy.year as school_year from document_artifacts da
    join classrooms c on c.id=da.classroom_id join school_years sy on sy.id=c.school_year_id
    where da.id=$1 and da.teacher_id=$2 and c.teacher_id=$2 and sy.owner_id=$2
      and da.status='confirmed'`,[artifactId,teacherId])).rows[0];
  if (!row) return null;
  const bytes = await storage.read(row.storage_key,teacherId);
  if (bytes.length !== Number(row.byte_length) || hash(bytes) !== row.sha256)
    throw new Error("La integridad del documento no coincide con la versión confirmada.");
  return { ...publicArtifact(row), bytes };
}
