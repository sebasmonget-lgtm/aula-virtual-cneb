import { randomUUID } from "node:crypto";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { selectWorkshopSheet, availableSheets, publicSheet } from "./workshop-sheet-catalog.mjs";
import { versionTransaction, VersionConflictError } from "./version-integrity.mjs";
import { focusedKnowledgeForDirectWorkflow } from "./ai-focused-knowledge.mjs";

const types = ["gráfico-plástico", "psicomotricidad", "ciencia", "matemática", "lectura y escritura", "juego dramático", "música"];
const itemFields = ["index", "linked_activity_index", "title", "workshop_type", "competency_id", "purpose", "rationale", "observation_focus", "materials", "brief_outline"];
const string = (value, max = 700) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const dateOnly = (value) => String(value).slice(0, 10);

export const WORKSHOP_MASTER_SCHEMA = { id: "workshop-master-v1", type: "object", additionalProperties: false,
  required: ["items"], properties: { items: { type: "array", minItems: 1, maxItems: 20,
    items: { type: "object", additionalProperties: false, required: itemFields, properties: {
      index: { type: "integer" }, linked_activity_index: { type: "integer" }, title: { type: "string" },
      workshop_type: { enum: types }, competency_id: { type: "string" }, purpose: { type: "string" },
      rationale: { type: "string" }, observation_focus: { type: "string" },
      materials: { type: "array", items: { type: "string" } }, brief_outline: { type: "string" },
    } } } } };

export const WORKSHOP_DAY_SCHEMA = { id: "workshop-v1", type: "object", additionalProperties: false,
  required: ["title", "workshop_type", "competency_id", "purpose", "criterion_or_observation_focus", "opening", "development", "closure", "evidence_expected", "materials", "sheet_id"],
  properties: Object.fromEntries([
    ...["title", "workshop_type", "competency_id", "purpose", "criterion_or_observation_focus", "opening", "development", "closure", "evidence_expected"]
      .map((field) => [field, { type: "string" }]),
    ["materials", { type: "array", items: { type: "string" } }], ["sheet_id", { type: ["string", "null"] }],
  ]) };

export function workshopCoverage(route, applicableCards) {
  const counts = new Map(applicableCards.map((card) => [card.id, 0]));
  for (const item of route) for (const id of new Set(item.competency_ids?.length ? item.competency_ids : [item.competency_id]))
    if (counts.has(id)) counts.set(id, counts.get(id) + 1);
  return [...counts].map(([competency_id, main_opportunities]) => ({ competency_id, main_opportunities }))
    .sort((a, b) => a.main_opportunities - b.main_opportunities || a.competency_id.localeCompare(b.competency_id));
}

export function validateWorkshopMaster(output, route, applicableIds, sheetIds = null) {
  if (!output || Object.keys(output).some((key) => !["items", "schema"].includes(key)) || !Array.isArray(output.items)
    || output.items.length !== route.length) throw new Error("El mapa de talleres debe tener un taller por día del proyecto.");
  const allowed = new Set(applicableIds);
  for (const [index, item] of output.items.entries()) {
    if (Object.keys(item).some((key) => ![...itemFields, "sheet_id", "sheet_reason"].includes(key))
      || item.index !== index + 1 || item.linked_activity_index !== index + 1
      || !allowed.has(item.competency_id) || !types.includes(item.workshop_type)
      || !["title", "purpose", "rationale", "observation_focus", "brief_outline"].every((field) => string(item[field]))
      || !Array.isArray(item.materials) || item.materials.length > 12 || !item.materials.every((value) => string(value, 150)))
      throw new Error(`Revisa el taller del día ${index + 1}: no coincide con el mapa confirmado o la edad.`);
    if (sheetIds && item.sheet_id !== null && !sheetIds.has(item.sheet_id))
      throw new Error("La ficha elegida no corresponde a la edad y competencia del taller.");
  }
  return output;
}

export async function attachWorkshopSheets(master, route, age, { selectSheet = selectWorkshopSheet } = {}) {
  return { items: await Promise.all(master.items.map(async (item, index) => {
    // The competence and purpose are chosen before any sheet is inspected.
    const intention = [item.purpose, item.observation_focus, item.brief_outline, route[index]?.title].join(" ");
    const sheet = await selectSheet({ age, competencyId: item.competency_id, intention });
    return { ...item, sheet_id: sheet?.id ?? null,
      sheet_reason: sheet ? `Apoya el registro de ${item.observation_focus.toLocaleLowerCase("es")}.` : null };
  })) };
}

export async function generateWorkshopMaster({ classroom, project, annualPlan, cards, createProvider = createAIProviderForPlan,
  resolvePlan = resolveAIExecutionPlan, attachSheets = attachWorkshopSheets }) {
  const route = project.details?.activity_route ?? [];
  if (project.status !== "active" || !["project", "unit"].includes(project.type) || !route.length)
    throw new Error("Confirma primero el mapa de actividades del proyecto.");
  const coverage = workshopCoverage(route, cards);
  const plan = resolvePlan({ workflow: "workshop_master", task: "generation" });
  const bundle = { workflow: "workshop_master", age: classroom.age, classroom: {
    section: classroom.section, group_context: classroom.group_context, diagnostic_summary: classroom.diagnostic_summary,
    available_materials: project.details?.spaces_and_materials ?? [],
  }, annual_priorities: annualPlan?.proposal?.proposed_experiences?.find((item) => item.proposal_id === project.source_proposal_id)?.primary_competency_ids ?? [],
  confirmed_project: { id: project.id, title: project.title, purpose: project.purpose,
    project_master: project.details.project_master, decisions: project.details.decisions,
    activity_route: route }, curriculum: { age: classroom.age, competency_cards: cards }, coverage,
  didactic_knowledge: await focusedKnowledgeForDirectWorkflow({ workflow: "workshop", age: classroom.age,
    competencyIds: [...new Set(route.flatMap((item) => item.competency_ids ?? [item.competency_id]))]
      .filter((id) => cards.some((card) => card.id === id)), request: project.purpose,
    castellanoL2Applicable: classroom.castellano_l2_applicable === true,
    religionApplicable: classroom.religion_applicable === true }),
  task: "Propón exactamente un taller por fila y fecha del mapa. Elige primero la competencia y la intención. Prioriza oportunidades poco cubiertas si son pertinentes para un taller; no fuerces cuotas. El taller es juego, exploración, creación o movimiento con mediación docente. No inventes observaciones. No conoces fichas todavía; no menciones una ficha concreta." };
  const result = await createProvider(plan).generate(buildProviderRequest("workshop_master", bundle, plan, WORKSHOP_MASTER_SCHEMA));
  const base = validateWorkshopMaster(result.output, route, cards.map((card) => card.id));
  const proposal = await attachSheets(base, route, classroom.age);
  return { proposal, metadata: { workflow: "workshop_master", model: plan.model,
    response_id: result.provider_metadata?.response_id ?? null, usage: result.provider_metadata?.usage ?? null } };
}

export async function workshopSheetChoices({ age, competencyId }) {
  return (await availableSheets({ age, competencyId })).map(publicSheet);
}

export function validateWorkshopDay(output, item) {
  if (!output || Object.keys(output).some((field) => !WORKSHOP_DAY_SCHEMA.required.includes(field))
    || !WORKSHOP_DAY_SCHEMA.required.every((field) => Object.hasOwn(output, field))
    || output.competency_id !== item.competency_id || output.sheet_id !== item.sheet_id
    || output.workshop_type !== item.workshop_type
    || !["title", "purpose", "criterion_or_observation_focus", "opening", "development", "closure", "evidence_expected"]
      .every((field) => string(output[field], 1400))
    || !Array.isArray(output.materials) || !output.materials.every((value) => string(value, 150)))
    throw new Error("El taller generado no respeta el maestro confirmado.");
  return output;
}

export async function generateWorkshopDay({ classroom, project, master, itemIndex, mainActivity,
  sheet, createProvider = createAIProviderForPlan, resolvePlan = resolveAIExecutionPlan }) {
  if (master.status !== "active" || master.details?.schema !== "workshop-master-v1"
    || master.parent_project_id !== project.id) throw new Error("Confirma primero los talleres del proyecto.");
  const item = master.details.items[itemIndex - 1];
  if (!item || item.index !== itemIndex) throw new Error("El taller elegido no corresponde al día.");
  const plan = resolvePlan({ workflow: "workshop", task: "generation" });
  const bundle = { workflow: "workshop", age: classroom.age, confirmed_project: { id: project.id,
    title: project.title, purpose: project.purpose, project_master: project.details.project_master },
  workshop_master: { id: master.id, version: master.version, items: master.details.items.map((entry) => ({
    index: entry.index, title: entry.title, competency_id: entry.competency_id, purpose: entry.purpose })) },
  current_workshop: item, previous_workshop: master.details.items[itemIndex - 2] ?? null,
  next_workshop: master.details.items[itemIndex] ?? null,
  linked_activity: { index: itemIndex, title: mainActivity.title, purpose: mainActivity.purpose,
    child_actions: mainActivity.child_actions },
  selected_sheet: sheet ? publicSheet(sheet) : null,
  didactic_knowledge: await focusedKnowledgeForDirectWorkflow({ workflow: "workshop", age: classroom.age,
    competencyIds: [item.competency_id], request: item.purpose,
    castellanoL2Applicable: classroom.castellano_l2_applicable === true,
    religionApplicable: classroom.religion_applicable === true }),
  task: "Desarrolla el taller ya confirmado. Conserva tipo, competencia y ficha exactamente. Inicio: exploración o juego; desarrollo: acción real y conversación; la ficha, si existe, solo representa o registra después. Cierre breve. Sin observaciones inventadas." };
  const result = await createProvider(plan).generate(buildProviderRequest("workshop", bundle, plan, WORKSHOP_DAY_SCHEMA));
  return { proposal: validateWorkshopDay(result.output, item), metadata: { workflow: "workshop", model: plan.model,
    response_id: result.provider_metadata?.response_id ?? null, usage: result.provider_metadata?.usage ?? null } };
}

export async function confirmWorkshopMaster(db, { teacherId, projectId, masterId, expectedRevision, age, applicableIds }) {
  return versionTransaction(db, `workshop-master:${projectId}`, async (tx) => {
    const row = (await tx.query(`select wm.*,p.status as project_status,p.details as project_details
      from learning_experiences wm join learning_experiences p on p.id=wm.parent_project_id
      join classrooms c on c.id=wm.classroom_id and c.id=p.classroom_id
      join school_years sy on sy.id=c.school_year_id
      where wm.id=$1 and wm.parent_project_id=$2 and wm.type='workshop' and wm.status='draft'
      and c.teacher_id=$3 and sy.owner_id=$3 for update of wm`, [masterId, projectId, teacherId])).rows[0];
    if (!row || row.project_status !== "active") throw new VersionConflictError("El proyecto o el borrador de talleres cambió.");
    if (Number(row.revision) !== Number(expectedRevision)) throw new VersionConflictError("El borrador cambió. Vuelve a revisarlo.");
    const route = row.project_details.activity_route ?? [];
    validateWorkshopMaster(row.details, route, applicableIds);
    for (const item of row.details.items) {
      const sheets = await availableSheets({ age, competencyId: item.competency_id });
      if (item.sheet_id !== null && !sheets.some((sheet) => sheet.id === item.sheet_id))
        throw new Error("Una ficha elegida dejó de estar disponible o no corresponde a la competencia.");
    }
    if (row.supersedes_experience_id) await tx.query(`update learning_experiences set status='archived',superseded_at=now(),updated_at=now()
      where id=$1 and status='active'`, [row.supersedes_experience_id]);
    const saved = (await tx.query(`update learning_experiences set status='active',teacher_confirmed_at=now(),updated_at=now()
      where id=$1 and status='draft' and revision=$2 returning id,status,version,revision`, [masterId, expectedRevision])).rows[0];
    if (!saved) throw new VersionConflictError("El borrador cambió durante la confirmación.");
    return saved;
  });
}

export function newWorkshopMasterDetails(items) { return { schema: "workshop-master-v1", items }; }
export function workshopMasterId() { return randomUUID(); }
export { dateOnly };
