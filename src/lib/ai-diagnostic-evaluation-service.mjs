import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { diagnosticGroupProposalSources, sameDiagnosticSources } from "./diagnostic-assessment-v4.mjs";
import { loadDiagnosticEvaluationSkill } from "./diagnostic-evaluation-skill.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { recordAIQAResult } from "./ai-qa-trace.mjs";
import { randomUUID } from "node:crypto";
import { currentSetupPerformance } from "./setup-performance.mjs";

const fields = ["strengths", "needs", "planning_priorities"];
const readingFields={competency_id:{type:'string'},summary:{type:'string',minLength:1,maxLength:700},next_step:{type:'string',minLength:1,maxLength:400},
  scope:{type:'string',enum:['individual','subgroup','information_gap']},source_refs:{type:'array',maxItems:20,items:{type:'string'}}};
const OUTPUT_SCHEMA = { id: "diagnostic-group-suggestion-v4", type: "object", additionalProperties: false,
  required: [...fields, "claims", "competency_readings"], properties: {
    ...Object.fromEntries(fields.map((field) => [field, { type: "string" }])),
    competency_readings:{type:'array',maxItems:14,items:{type:'object',additionalProperties:false,required:Object.keys(readingFields),properties:readingFields}},
    claims: { type: "array", minItems: 3, items: { type: "object", additionalProperties: false,
      required: ["field", "text", "scope", "source_refs"], properties: {
        field: { type: "string", enum: fields }, text: { type: "string", minLength: 1 },
        scope: { type: "string", enum: ["individual", "subgroup", "information_gap", "planning_decision"] },
        source_refs: { type: "array", items: { type: "string" } },
      } } },
  } };
const forbiddenJudgment = /\b(?:nivel\s*(?:AD|A|B|C)|calificaci[oó]n\s*(?:AD|A|B|C)|ranking)\b/i;

export class DiagnosticSuggestionError extends Error {
  constructor(reason) {
    super(reason === "in_progress" ? "Ayni ya está preparando este resumen. Espera un momento y vuelve a consultar; no iniciaremos otra generación." : reason === "stale_sources" ? "La información del aula cambió. Actualiza el borrador antes de pedir una propuesta." :
      reason === "proposal_invalid" ? "La propuesta llegó incompleta. Puedes escribir el resumen con tus palabras." :
      reason === "api_key_missing" || reason === "authentication_failed" ? "No se pudo acceder al servicio de IA. Puedes escribir el resumen con tus palabras." :
      reason === "timeout" ? "La propuesta tardó demasiado. Puedes escribir el resumen con tus palabras." :
      "No pudimos preparar la propuesta. Puedes escribir el resumen con tus palabras.");
    this.name = "DiagnosticSuggestionError";
    this.reason = reason;
  }
}

export function validateDiagnosticSuggestion(output, sources) {
  const knownNames = sources.known_names ?? [];
  if (!output || typeof output !== "object" || Array.isArray(output) ||
      Object.keys(output).some(key=>![...fields,'claims','competency_readings'].includes(key)) || fields.some((field) =>
        typeof output[field] !== "string" || !output[field].trim() || output[field].length > 3000 ||
        forbiddenJudgment.test(output[field]) || /\bchild_\d+\b/.test(output[field]) || neutralizeAssessmentText(output[field], knownNames) !== output[field]))
    throw new DiagnosticSuggestionError("proposal_invalid");
  const references = [ ...(sources.comments ?? []), ...(sources.family_reported_context ?? []),
    ...(sources.observed_records ?? []).flatMap(child => child.notes.map(note => ({ ...note, child: child.child }))) ];
  const byId = new Map(references.map(ref => [ref.source_id, ref]));
  if (!Array.isArray(output.claims) || output.claims.length < 3) throw new DiagnosticSuggestionError("proposal_invalid");
  for (const claim of output.claims) {
    if (!fields.includes(claim.field) || typeof claim.text !== "string" || !output[claim.field].includes(claim.text) ||
        !["individual", "subgroup", "information_gap", "planning_decision"].includes(claim.scope) ||
        !Array.isArray(claim.source_refs) || claim.source_refs.some(id => !byId.has(id)) ||
        (claim.scope === "individual" && new Set(claim.source_refs.map(id => byId.get(id).child)).size !== 1) ||
        (claim.scope === "subgroup" && new Set(claim.source_refs.map(id => byId.get(id).child)).size < 2))
      throw new DiagnosticSuggestionError("proposal_invalid");
  }
  for (const field of fields) if (output.claims.filter(claim => claim.field === field).map(claim => claim.text).join(" ") !== output[field])
    throw new DiagnosticSuggestionError("proposal_invalid");
  const readings=output.competency_readings;
  if(readings!==undefined){
    const observedIds=new Set((sources.observed_records??[]).flatMap(child=>child.notes.flatMap(note=>note.competency_ids??[])));
    if(!Array.isArray(readings)||readings.length>14||new Set(readings.map(item=>item.competency_id)).size!==readings.length||
      [...observedIds].some(id=>!readings.some(item=>item.competency_id===id)))throw new DiagnosticSuggestionError('proposal_invalid');
    for(const item of readings){
      const refs=item?.source_refs;
      if(!observedIds.has(item?.competency_id)||typeof item.summary!=='string'||!item.summary.trim()||item.summary.length>700||
        typeof item.next_step!=='string'||!item.next_step.trim()||item.next_step.length>400||forbiddenJudgment.test(item.summary+' '+item.next_step)||
        /\bchild_\d+\b/.test(item.summary+' '+item.next_step)||!['individual','subgroup','information_gap'].includes(item.scope)||
        !Array.isArray(refs)||refs.length>20||new Set(refs).size!==refs.length||refs.some(ref=>byId.get(ref)?.source_type!=='direct_observation'||!byId.get(ref)?.competency_ids?.includes(item.competency_id))||
        (item.scope==='individual'&&new Set(refs.map(ref=>byId.get(ref).child)).size!==1)||
        (item.scope==='subgroup'&&new Set(refs.map(ref=>byId.get(ref).child)).size<2))throw new DiagnosticSuggestionError('proposal_invalid');
    }
  }
  return { ...Object.fromEntries(fields.map((field) => [field, output[field].trim()])),
    ...(readings?{competency_readings:readings.map(item=>({...item,source_record_ids:[...new Set(item.source_refs.map(ref=>byId.get(ref)?.record_id).filter(Boolean))]}))}:{}),
    claims: output.claims.map(claim => ({ ...claim, sources: claim.source_refs.map(id => ({ source_id: id, child: byId.get(id).child, source_type: byId.get(id).source_type })) })), competency_priorities: [] };
}

function safeFailure(error) {
  if (error instanceof DiagnosticSuggestionError) return error;
  if (error?.reason === "stale_sources") return new DiagnosticSuggestionError("stale_sources");
  if (["api_key_missing", "authentication_failed", "timeout"].includes(error?.reason)) return new DiagnosticSuggestionError(error.reason);
  return new DiagnosticSuggestionError("provider_error");
}

/** Returns editable text only. Confirmation and DOCX creation remain separate teacher actions. */
export async function suggestDiagnosticGroupReview(db, teacherId, draftId, {
  resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan,
  loadSkill = loadDiagnosticEvaluationSkill, loadSources = diagnosticGroupProposalSources,
} = {}) {
  const started = performance.now(), timing = {};
  const sources = await loadSources(db, teacherId, draftId);
  timing.sources_before_ms = performance.now() - started;
  const old=(await db.query(`select ai_snapshot from diagnostic_group_reviews
    where id=$1 and created_by=$2 and status='draft'`,[draftId,teacherId])).rows[0]?.ai_snapshot;
  if(old?.output&&old.contract_version==='diagnostic-reading-v1'&&sameDiagnosticSources(old.source_snapshot,sources.source_snapshot))return {details:old.output,cached:true};
  const lease=randomUUID();
  const claimed=await db.query(`update diagnostic_group_reviews set ai_snapshot=$3::jsonb
    where id=$1 and created_by=$2 and status='draft' and
    (ai_snapshot->>'status' is distinct from 'processing' or (ai_snapshot->>'expires_at')::timestamptz<now()) returning id`,
      [draftId,teacherId,JSON.stringify({status:'processing',lease_token:lease,expires_at:new Date(Date.now()+210_000).toISOString(),source_snapshot:sources.source_snapshot})]);
  if(!claimed.rows.length)throw new DiagnosticSuggestionError('in_progress');
  try {
    const plan = resolvePlan({ workflow: "diagnostic_group_synthesis", task: "generation" });
    const provider = createProvider(plan, { timeoutMs: 180_000 });
    const bundle = { workflow: "diagnostic_group_synthesis", context: { age: sources.age, student_count: sources.student_count,
      confirmed_teacher_comments: sources.comments, observed_records: (sources.observed_records ?? []).map(child=>({...child,notes:child.notes.map(({record_id,...note})=>{void record_id;return note;})})), family_reported_context: sources.family_reported_context ?? [] }, curriculum: { competency_cards: sources.competency_options ?? [] },
      constraints: { must: ["Distinguir explícitamente lo observado, lo reportado por la familia y la interpretación docente. Una entrevista familiar no acredita un aprendizaje observado. Si hay contradicciones, conservar el tipo de fuente y expresar lo que falta observar. Cada afirmación cita sus fuentes únicamente en claims.source_refs. El texto docente y claims.text no contienen alias child_N ni IDs; usar expresiones prudentes como un niño o algunos niños según el alcance sustentado.", "Los comentarios individuales son opcionales; no suponer que su ausencia indica dificultad.", "Expresar necesidades como oportunidades pedagógicas.",
        "Redactar una visión breve del grupo, sin priorizar competencias todavía.", "No convertir ausencia de registro en dificultad.",
        "En competency_readings incluye una lectura por cada competencia con observaciones directas recibidas, sin añadir competencias sin registros. En summary describe qué permiten comprender esas actuaciones, en hasta 45 palabras; en next_step propone una oportunidad o ayuda concreta en hasta 25 palabras. No copies el conteo de registros como análisis ni repitas el mismo siguiente paso en todas las competencias. Usa solo source_refs de observaciones directas vinculadas a esa competencia. individual conserva un solo niño; subgroup exige al menos dos distintos y no representa a toda el aula. Si esos registros no permiten interpretar, information_gap y explica qué falta conocer. No imprimas alias ni IDs en summary o next_step.",
        "Recibir una pregunta o ayuda prevista para la edad no demuestra una dificultad. Propón observar cómo participa el niño y qué apoyo le resulta útil; no impongas actuar sin ayuda como condición general de aprendizaje.",
        "En needs, distinguir necesidad de acompañamiento observada de falta de información. Solo plantear una necesidad grupal con un patrón comparable en varios niños o comentarios docentes confirmados que la sustenten; si no hay ese sustento, formular qué conviene seguir observando.",
        "No generalizar a todo el grupo una conducta o necesidad presente en un solo alias.",
        "En planning_priorities, vincular cada decisión concreta de juego, organización, materiales o interacción con registros disponibles o con una dimensión que se necesita seguir observando; evitar recomendaciones genéricas.",
        "Cada alias child_N representa a un niño distinto; sus comentarios y notas no son niños adicionales. Divide cada campo en afirmaciones claims cuya concatenación con un espacio reproduce exactamente el texto del campo. En cada claim cita solo source_id entregados. individual requiere un solo niño; subgroup exige al menos dos niños distintos. information_gap y planning_decision conservan explícitamente lo desconocido o propuesto.",
        "Los registros son una selección reciente y pueden estar truncados. No completar lo que falte ni afirmar cobertura de todo el aula."],
        must_not: ["Inventar observaciones o niveles de logro.", "Nombrar o identificar a niños y familias.",
          "Concluir que todos los niños necesitan el mismo apoyo por una prioridad grupal."] },
      provenance: { source_type: "diagnostic_facts_and_optional_confirmed_comments", source_count: sources.comments.length + (sources.observed_records?.length ?? 0) } };
    const request = buildProviderRequest("diagnostic_group_synthesis", bundle, plan, OUTPUT_SCHEMA, await loadSkill());
    const providerStarted = performance.now();
    const response = await provider.generate(request);
    timing.provider_step_ms = performance.now() - providerStarted;
    timing.provider_http_ms = response.provider_metadata?.duration_ms ?? null;
    const details = validateDiagnosticSuggestion(response.output, sources);
    const validationStarted = performance.now();
    const current = await loadSources(db, teacherId, draftId);
    timing.sources_after_ms = performance.now() - validationStarted;
    if (!sameDiagnosticSources(sources.source_snapshot, current.source_snapshot)) throw new DiagnosticSuggestionError("stale_sources");
    timing.server_before_store_ms = performance.now() - started;
    const measured = currentSetupPerformance();
    timing.db_query_before_store_ms = measured?.db_query ?? null;
    timing.db_connect_before_store_ms = measured?.db_connect ?? null;
    timing.query_count_before_store = measured?.queries ?? null;
    const stored=await db.query(`update diagnostic_group_reviews set ai_snapshot=$1::jsonb,updated_at=now()
      where id=$2 and status='draft' and ai_snapshot->>'lease_token'=$3 returning id`, [JSON.stringify({ status:'ready',contract_version:'diagnostic-reading-v1',output: details,
      provider: response.provider_metadata?.provider ?? plan.provider, model: plan.model,
      reasoning_effort: plan.reasoning_effort, routing_policy_version: plan.routing_policy_version,
      response_id: response.provider_metadata?.response_id ?? null,
      usage: response.provider_metadata?.usage ?? null, timing, source_snapshot: sources.source_snapshot }), draftId,lease]);
    if(!stored.rows.length)throw new DiagnosticSuggestionError('stale_sources');
    await recordAIQAResult("diagnostic_group_synthesis", details, { validators: ["source_refs", "distinct_children_scope", "privacy", "source_fingerprint"], downstream: ["annual_plan"] });
    return { details };
  } catch (error) {
    await db.query(`update diagnostic_group_reviews set ai_snapshot=jsonb_set(ai_snapshot,'{status}','"failed"'::jsonb)
      where id=$1 and created_by=$2 and ai_snapshot->>'lease_token'=$3`,[draftId,teacherId,lease]);
    throw safeFailure(error);
  }
}
