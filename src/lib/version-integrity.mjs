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

export function httpStatusForError(error, fallback = 422) {
  if (isVersionConflict(error) || error?.code === "23503") return 409;
  if (error?.code === "42501") return 403;
  if (["22P02", "23502", "23514"].includes(error?.code)) return 400;
  if (error?.code === "57014" || /^08[A-Z0-9]{3}$/.test(error?.code ?? "")) return 500;
  return fallback;
}

export function conflictPayload(error) {
  return { error: "version_conflict", message: error instanceof VersionConflictError ? error.message :
    "Otra operación actualizó esta versión. Recarga y revisa los cambios.",
    currentRevision: error instanceof VersionConflictError ? error.currentRevision : null };
}

export function publicErrorMessage(error, fallback = "No se pudo completar esta operación. Recarga e inténtalo de nuevo.") {
  // SQLSTATE details can contain table names, row values and constraint names.
  if (typeof error?.code === "string" && /^[0-9A-Z]{5}$/.test(error.code)) {
    if (isVersionConflict(error)) return "Otro cambio se guardó primero. Recarga y revisa la versión actual.";
    if (error.code === "23503") return "El registro relacionado cambió o ya no está disponible.";
    if (error.code === "42501") return "No tienes permiso para esta operación.";
    if (["22P02", "23502", "23514"].includes(error.code)) return "Revisa los datos ingresados.";
    if (error.code === "57014") return "La operación tardó demasiado. Inténtalo de nuevo.";
    return fallback;
  }
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
