export class VersionConflictError extends Error {
  constructor(message = "Esta versión cambió en otra pestaña. Recarga y revisa la versión actual.", currentRevision = null, reason = "version_conflict") {
    super(message);
    this.name = "VersionConflictError";
    this.currentRevision = currentRevision == null ? null : Number(currentRevision);
    this.reason = reason;
  }
}

export function expectedRevision(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new VersionConflictError("Recarga para obtener la revisión vigente.");
  return value;
}

export function assertRevision(row, revision) {
  if (!row || Number(row.revision) !== revision) throw new VersionConflictError(undefined, row?.revision ?? null);
}

export function isVersionConflict(error) {
  return error instanceof VersionConflictError || ["23505", "40001", "40P01"].includes(error?.code);
}

export function conflictPayload(error) {
  return { error: "version_conflict", message: error instanceof VersionConflictError ? error.message :
    "Otra operación actualizó esta versión. Recarga y revisa los cambios.",
    currentRevision: error instanceof VersionConflictError ? error.currentRevision : null };
}

export function publicErrorMessage(error, fallback = "No se pudo completar esta operación. Recarga e inténtalo de nuevo.") {
  // SQLSTATE details can contain table names, row values and constraint names.
  if (typeof error?.code === "string" && /^[0-9A-Z]{5}$/.test(error.code)) return fallback;
  return error?.message || fallback;
}

export async function versionTransaction(db, key, work) {
  try {
    return await db.transaction(async (tx) => {
      await tx.query("select pg_advisory_xact_lock(hashtext($1))", [key]);
      return work(tx);
    });
  } catch (error) {
    if (isVersionConflict(error) && !(error instanceof VersionConflictError)) throw new VersionConflictError();
    throw error;
  }
}
