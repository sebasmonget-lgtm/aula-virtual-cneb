import { randomUUID, createHash } from "node:crypto";
import { ageFilteredAnnualCurriculum } from "../src/lib/annual-preplan-service.mjs";
import { personalizationSources } from "../src/lib/annual-personalization-service.mjs";
import { buildAnnualClassroomSnapshot } from "../src/lib/annual-classroom-snapshot.mjs";
import { loadEffectiveCalendar } from "../src/lib/school-calendar-service.mjs";
import { effectiveCalendarFingerprint, solveAnnualJourneyCalendar } from "../src/lib/annual-journey-calendar.mjs";
import { generateAnnualJourney, appendJourneyIntent, applyAnnualJourneyChanges, materializeJourneyRows, refreshJourneySnapshot } from "../src/lib/annual-journey-service.mjs";
import { journeyFail, validateAnnualJourney } from "../src/lib/annual-journey-contract.mjs";
import { assertRevision, expectedRevision, versionTransaction, VersionConflictError, httpStatusForError, publicErrorMessage } from "../src/lib/version-integrity.mjs";
import { persistAnnualProjectSlots } from "../src/lib/annual-project-slots.mjs";
import { confirmAnnualPlanVersion } from "../src/lib/annual-plan-version-service.mjs";
import { annualJourneySafeText } from "../src/lib/annual-journey-privacy.mjs";

export async function handleAnnualJourneyRoutes({ request, response, url, db, teacherId, origin, send, readJson,
  annualPlanningContext, annualDocumentContext, createProvider, resolvePlan }) {
  if (!url.pathname.startsWith("/api/annual-journey")) return false;
  let draftId = null;
  try {
    const context = await annualPlanningContext();
    if (!context || !(await db.query(`select 1 from classrooms c join school_years sy on sy.id=c.school_year_id
      where c.id=$1 and c.teacher_id=$2 and sy.owner_id=$2 and c.status='active'`, [context.id, teacherId])).rows.length)
      journeyFail("not_found", "Aula no disponible.");
    const curriculum = await ageFilteredAnnualCurriculum(context);
    const calendar = { ...await loadEffectiveCalendar(db, { teacherId, classroomId: context.id }), initial_stage: context.calendar.initial_stage };
    const sources = await personalizationSources(db, teacherId, context);
    const snapshot = buildAnnualClassroomSnapshot(sources, context, curriculum);
    const load = async (id, tx = db, draftOnly = true) => {
      const row = (await tx.query(`select ap.* from annual_plans ap join school_years sy on sy.id=ap.school_year_id
        where ap.id=$1 and ap.classroom_id=$2 and ap.school_year_id=$3 and sy.owner_id=$4
        and ($5::boolean=false or ap.status='draft')`, [id, context.id, context.school_year_id, teacherId, draftOnly])).rows[0];
      if (!row || row.proposal?.journey_version !== 2) journeyFail("not_found", "Este año no está disponible en el nuevo recorrido.");
      return row;
    };
    const protectedIds = async (row, tx = db) => {
      const linked = (await tx.query(`select source_proposal_id,source_proposal_index from learning_experiences where annual_plan_id=$1`, [row.supersedes_plan_id ?? row.id])).rows;
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
      return row.proposal.proposed_experiences.filter((r, i) => r.teacher_protected || row.supersedes_plan_id && r.planned_start_date <= today || linked.some((x) =>
        x.source_proposal_id === r.proposal_id || Number(x.source_proposal_index) === i)).map((r) => r.proposal_id);
    };
    const write = async (row, proposal, tx) => {
      const next = (await tx.query(`update annual_plans set proposal=$1::jsonb,source_context_fingerprint=$4,updated_at=now()
        where id=$2 and status='draft' and revision=$3 returning id,revision,status,version,proposal`,
      [JSON.stringify(proposal), row.id, row.revision, proposal.classroom_snapshot.source_fingerprint])).rows[0];
      if (!next) throw new VersionConflictError();
      return { ...next, revision: Number(next.revision) };
    };
    if (url.pathname === "/api/annual-journey/start" && request.method === "GET") {
      send(response, 200, { snapshot, curriculum, calendar_integrity: solveAnnualJourneyCalendar(calendar).integrity }, origin); return true;
    }
    if (url.pathname === "/api/annual-journey/generate" && request.method === "POST") {
      const body = await readJson(request);
      if (typeof body.teacherIdeas !== "string" || body.teacherIdeas.length > 2000) journeyFail("invalid", "Cuenta tus ideas en menos de 2000 caracteres.");
      if (body.sourceFingerprint !== snapshot.source_fingerprint) throw new VersionConflictError("Los registros del aula cambiaron. Actualiza el resumen y vuelve a preparar tu año.");
      const preparation = { teacher_preferences: body.teacherIdeas, classroom_snapshot: snapshot, journey_version: 2,
        plan_format: "annual_preplan_v1", title: "Mi año", school_year: String(context.year), proposed_experiences: [],
        pending_changes: [], change_history: [], preparation_status: "saved", metrics: { started_at: new Date().toISOString(), regenerations: 0, operations: [] } };
      const row = await versionTransaction(db, `annual:${context.school_year_id}`, async (tx) => {
        if (body.draftId) { const existing = await load(body.draftId, tx); assertRevision(existing, expectedRevision(body.expectedRevision)); return existing; }
        const existing = (await tx.query(`select id from annual_plans where school_year_id=$1 and status='draft'`, [context.school_year_id])).rows[0];
        if (existing) { draftId = existing.id; throw new VersionConflictError("Ya tienes un borrador. Ábrelo para continuar."); }
        const active = (await tx.query(`select id from annual_plans where school_year_id=$1 and status='active'`, [context.school_year_id])).rows[0];
        const version = Number((await tx.query(`select coalesce(max(version),0)+1 as next from annual_plans where school_year_id=$1`, [context.school_year_id])).rows[0].next);
        const id = randomUUID();
        return (await tx.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,
          document_context,generation_metadata,supersedes_plan_id,source_context_fingerprint)
          values($1,$2,$3,$4,$5,'draft',$6::jsonb,$7::jsonb,$8::jsonb,$9,$10) returning *`,
        [id,context.id,context.school_year_id,context.curriculum_version_id,version,JSON.stringify(preparation),
          JSON.stringify(annualDocumentContext(context)),JSON.stringify({ workflow: "annual_journey_v2" }),active?.id ?? null,snapshot.source_fingerprint])).rows[0];
      });
      draftId = row.id;
      if ((await protectedIds(row)).length) journeyFail("protected_proposal", "Este borrador conserva decisiones o trabajo iniciado. Usa Cambiar con Ayni para modificar solo propuestas futuras.");
      const safeIdeas = annualJourneySafeText(body.teacherIdeas, sources.names);
      if (body.teacherIdeas.trim() && !safeIdeas) journeyFail("private_text", "La indicación incluye información privada. Conservamos tu preparación; escribe la idea sin nombres ni datos personales.");
      const generatedSnapshot = { ...snapshot, facts: [...snapshot.facts, ...(safeIdeas ? [{ key: "teacher_preferences", kind: "teacher_decision",
        subject: "teacher", scope: "classroom_preference", uncertainty: "preference_not_observed_interest", support_text: body.teacherIdeas, ai_support_text: safeIdeas,
        occurred_at: new Date().toISOString(), competency_id: null, source_refs: [] }] : [])] };
      const proposal = await generateAnnualJourney({ context, snapshot: generatedSnapshot, curriculum, calendar, teacherIdeas: safeIdeas, createProvider, resolvePlan });
      proposal.teacher_preferences = body.teacherIdeas;
      proposal.metrics = { ...proposal.metrics, started_at: row.proposal.metrics?.started_at ?? proposal.metrics.started_at,
        regenerations: (row.proposal.metrics?.regenerations ?? 0) + 1, operations: [...(row.proposal.metrics?.operations ?? []), ...proposal.metrics.operations] };
      const result = await versionTransaction(db, `annual:${context.school_year_id}`, async (tx) => {
        const current = await load(row.id, tx); assertRevision(current, Number(row.revision));
        const fresh = await personalizationSources(tx, teacherId, context);
        if (fresh.fingerprint !== snapshot.source_fingerprint) throw new VersionConflictError("Aparecieron registros nuevos durante la generación. El borrador anterior se conserva.");
        const saved = await write(current, proposal, tx);
        await persistAnnualProjectSlots(tx, row.id, proposal.resolved_calendar);
        return saved;
      });
      send(response, 201, result, origin); return true;
    }
    const match = /^\/api\/annual-journey\/([0-9a-f-]{36})\/(intent|remove-intent|apply|keep|move|confirm|copy|refresh)$/i.exec(url.pathname);
    if (!match || request.method !== "POST") { send(response, 404, { error: "Acción no disponible." }, origin); return true; }
    const [, id, operation] = match, body = await readJson(request), revision = expectedRevision(body.expectedRevision);
    draftId = id;
    if (operation === "confirm") {
      const result = await confirmAnnualPlanVersion(db, context, id, revision, async (row, tx) => {
        if (row.proposal?.journey_version !== 2) journeyFail("invalid", "Usa el recorrido de esta versión.");
        validateAnnualJourney(row.proposal, curriculum, { confirmation: true });
        if (row.proposal.evidence_interpretations.length && body.interpretationsReviewed !== true) journeyFail("teacher_review_required", "Revisa las interpretaciones de actuaciones antes de confirmar este año.");
        if (row.proposal.classroom_snapshot.source_fingerprint !== (await personalizationSources(tx, teacherId, context)).fingerprint)
          throw new VersionConflictError("Hay información nueva del aula. Vuelve a preparar el borrador antes de confirmar.");
        const freshCalendar = await loadEffectiveCalendar(tx, { teacherId, classroomId: context.id });
        if (effectiveCalendarFingerprint({ ...freshCalendar, initial_stage: context.calendar.initial_stage }) !== row.proposal.resolved_calendar.calendar_fingerprint)
          throw new VersionConflictError("Cambió el calendario efectivo. Vuelve a preparar el borrador; el año vigente se conserva.");
        const content = { ...row.proposal, metrics: { ...row.proposal.metrics, confirmed_at: new Date().toISOString(),
          time_to_confirm_ms: Date.now() - Date.parse(row.proposal.metrics.started_at) } };
        // One immutable projection: no model, exporter prompt or semantic enrichment after this point.
        await tx.query(`insert into annual_plan_formal_content(annual_plan_id,content,ai_metadata,source_revision)
          values($1,$2::jsonb,$3::jsonb,$4)`, [id,JSON.stringify(row.proposal),JSON.stringify({ render_only: true,
          content_hash: createHash("sha256").update(JSON.stringify(row.proposal)).digest("hex") }),row.revision]);
        // Metrics are stored beside the immutable content without bumping the draft CAS revision.
        await tx.query(`update annual_plan_formal_content set ai_metadata=ai_metadata || $1::jsonb where annual_plan_id=$2`,
          [JSON.stringify({ confirmed_at: content.metrics.confirmed_at, time_to_confirm_ms: content.metrics.time_to_confirm_ms }),id]);
      });
      send(response, 200, result, origin); return true;
    }
    if (operation === "copy") {
      const result = await versionTransaction(db, `annual:${context.school_year_id}`, async (tx) => {
        const source = await load(id, tx, false); assertRevision(source, revision);
        if (source.status !== "active") journeyFail("invalid", "Solo el año vigente puede abrir una nueva revisión.");
        if ((await tx.query(`select id from annual_plans where school_year_id=$1 and status='draft'`, [context.school_year_id])).rows.length) throw new VersionConflictError("Ya hay un borrador para revisar.");
        const version = Number((await tx.query(`select max(version)+1 as next from annual_plans where school_year_id=$1`,[context.school_year_id])).rows[0].next);
        const newId = randomUUID();
        const copied = refreshJourneySnapshot({ ...source.proposal, pending_changes: [], metrics: { ...source.proposal.metrics, started_at: new Date().toISOString() } }, snapshot);
        const next = (await tx.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,
          document_context,generation_metadata,supersedes_plan_id,source_context_fingerprint)
          values($1,$2,$3,$4,$5,'draft',$6::jsonb,$7::jsonb,$8::jsonb,$9,$10) returning id,revision,status,version,proposal`,
        [newId,context.id,context.school_year_id,source.curriculum_version_id,version,JSON.stringify(copied),JSON.stringify(source.document_context),
          JSON.stringify({ workflow: "annual_journey_copy" }),id,snapshot.source_fingerprint])).rows[0];
        await persistAnnualProjectSlots(tx, newId, copied.resolved_calendar); return next;
      });
      send(response, 201, result, origin); return true;
    }
    const base = await load(id); assertRevision(base, revision);
    let proposal = base.proposal;
    if (proposal.proposed_experiences.length !== 12) journeyFail("preparation_only", "Tu preparación está guardada. Reintenta «Preparar mi año».");
    if (operation === "apply") {
      if (snapshot.source_fingerprint !== proposal.classroom_snapshot.source_fingerprint || effectiveCalendarFingerprint(calendar) !== proposal.resolved_calendar.calendar_fingerprint)
        throw new VersionConflictError("Las fuentes o el calendario cambiaron. Actualiza la preparación antes de aplicar.");
      const changes = proposal.pending_changes.map((c) => ({ ...c, text: annualJourneySafeText(c.text, sources.names) }));
      if (changes.some((c) => !c.text)) journeyFail("private_text", "Reformula la indicación sin datos privados antes de aplicar. Conservamos los cambios pendientes.");
      proposal = await applyAnnualJourneyChanges({ ...proposal, pending_changes: changes }, { context, curriculum,
        protectedIds: await protectedIds(base), createProvider, resolvePlan });
      if (changes.length) proposal.change_history.at(-1).changes = base.proposal.pending_changes;
    }
    const result = await versionTransaction(db, `annual:${context.school_year_id}`, async (tx) => {
      const row = await load(id, tx); assertRevision(row, revision);
      const protectedRows = await protectedIds(row, tx);
      if (operation === "refresh") proposal = refreshJourneySnapshot(proposal, snapshot);
      if (operation === "intent") proposal = appendJourneyIntent(proposal, body.text, body.proposalId);
      if (operation === "remove-intent") proposal = { ...proposal, pending_changes: proposal.pending_changes.filter((c) => c.id !== body.changeId) };
      if (operation === "keep") proposal = { ...proposal, proposed_experiences: proposal.proposed_experiences.map((r) =>
        r.proposal_id === body.proposalId ? { ...r, teacher_protected: !r.teacher_protected } : r) };
      if (operation === "move") {
        const from = proposal.proposed_experiences.findIndex((r) => r.proposal_id === body.proposalId), to = Number(body.to);
        if (from < 0 || !Number.isInteger(to) || to < 0 || to >= 12) journeyFail("invalid", "Revisa la posición de la propuesta.");
        const rows = [...proposal.proposed_experiences], [moving] = rows.splice(from, 1); rows.splice(to, 0, moving);
        const schedule = solveAnnualJourneyCalendar(calendar, rows);
        proposal = { ...proposal, resolved_calendar: schedule, proposed_experiences: materializeJourneyRows(rows, schedule) };
      }
      if (operation === "apply" || operation === "move") {
        for (const protectedId of protectedRows) {
          const before = row.proposal.proposed_experiences.find((r) => r.proposal_id === protectedId), after = proposal.proposed_experiences.find((r) => r.proposal_id === protectedId);
          if (JSON.stringify(before) !== JSON.stringify(after)) journeyFail("protected_proposal", "Este cambio afectaría trabajo iniciado o una decisión mantenida. El borrador se conserva.");
        }
        if (operation === "apply" && (snapshot.source_fingerprint !== proposal.classroom_snapshot.source_fingerprint
          || effectiveCalendarFingerprint(calendar) !== proposal.resolved_calendar.calendar_fingerprint)) throw new VersionConflictError("Las fuentes o el calendario cambiaron. Actualiza la preparación antes de aplicar.");
      }
      validateAnnualJourney(proposal, curriculum);
      const next = await write(row, proposal, tx);
      if (operation === "move") await persistAnnualProjectSlots(tx, id, proposal.resolved_calendar);
      return next;
    });
    send(response, 200, result, origin);
  } catch (error) {
    const providerFailure = error?.name === "OpenAIProviderError";
    console.warn(JSON.stringify({ event: "annual_journey_incident", category: error?.name === "AnnualCalendarError" ? "calendar" : providerFailure ? "provider" : "validation",
      reason: /^[a-z_]{1,50}$/.test(error?.reason ?? "") ? error.reason : "operation_failed", issues: error?.details?.issues?.length ?? 0 }));
    send(response, providerFailure ? 503 : error?.reason === "not_found" ? 404 : httpStatusForError(error, 422), {
      error: providerFailure ? "Ayni no pudo completar la preparación. Tus ideas y el borrador se conservan. Puedes reintentar." : publicErrorMessage(error),
      reason: error?.reason, ...(draftId ? { draft_id: draftId } : {}), ...(error?.details ? { details: error.details } : {}) }, origin);
  }
  return true;
}
