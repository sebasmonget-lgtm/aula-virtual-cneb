import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateProjectMaster } from "../src/lib/project-flow-service.mjs";
import { generateWorkshopMaster, generateWorkshopDay } from "../src/lib/workshop-master-service.mjs";
import { generateTeacherActivity } from "../src/lib/ai-activity-ui-service.mjs";
import { ageFilteredAnnualCurriculum } from "../src/lib/annual-preplan-service.mjs";
import { selectWorkshopSheet, availableSheets } from "../src/lib/workshop-sheet-catalog.mjs";
import { saveActivityDetails } from "../src/lib/experience-lineage.mjs";
import { renderActivityUnifiedWord } from "../src/lib/activity-unified-word.mjs";

if (!process.env.OPENAI_API_KEY) throw new Error("Configura OPENAI_API_KEY para esta prueba real.");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".local", "qa", "daily-workshop");
await mkdir(output, { recursive: true });
const classroom = { id: "11111111-1111-4111-8111-111111111111", age: 5, section: "Aula de prueba",
  group_context: "Grupo ficticio de cinco años; dispone de un patio y objetos para comparar.",
  diagnostic_summary: "Se prevén oportunidades de indagación y resolución de situaciones de cantidad; sin conclusiones individuales.",
  school_context: "Institución de prueba", religion_applicable: false, castellano_l2_applicable: false };
const cards = await ageFilteredAnnualCurriculum(classroom);
const decisions = { context_summary: "Durante el juego, el grupo ficticio se pregunta por las sombras en el patio.",
  purpose: "Explorar cambios visibles de las sombras y resolver problemas de cantidad en juegos relacionados.",
  competency_ids: ["CYT_INDAGA", "MAT_CANTIDAD"], additional_context: "Patio, linternas, bloques y objetos reutilizables." };
const dependents = { guiding_questions: ["¿Cómo cambian las sombras?", "¿Cómo podemos comparar los objetos que usamos?"],
  journey: [{ title: "Exploramos", description: "Jugamos con luz y objetos en el patio." },
    { title: "Comparamos", description: "Comparamos hallazgos y representamos lo que vimos." }],
  general_criteria: [{ competency_id: "CYT_INDAGA", criterion: "Observa, pregunta y explica cambios visibles.",
    expected_evidence: ["Explicación oral", "Registro comentado"] },
  { competency_id: "MAT_CANTIDAD", criterion: "Compara colecciones con un propósito de juego.",
    expected_evidence: ["Estrategia comentada", "Organización de objetos"] }] };
const start = Date.now();
const projectResult = await generateProjectMaster({ context: { age: 5, classroom, curriculum: cards,
  project: { title: "Sombras y objetos", purpose: decisions.purpose } }, decisions, dependents,
  availableDates: ["2026-04-13", "2026-04-14"] });
const project = { id: "22222222-2222-4222-8222-222222222222", type: "project", status: "active",
  title: "Sombras y objetos", purpose: decisions.purpose, source_proposal_id: "fixture-proposal",
  details: { flow_version: "project-master-v2", project_master: projectResult.output,
    decisions, dependents, activity_route: projectResult.output.activity_route,
    primary_competency_ids: decisions.competency_ids, spaces_and_materials: projectResult.output.resources,
    trigger_or_interest: decisions.context_summary, starting_point: decisions.context_summary } };
const workshopResult = await generateWorkshopMaster({ classroom, project, annualPlan: { proposal: {
  proposed_experiences: [{ proposal_id: "fixture-proposal", primary_competency_ids: decisions.competency_ids }] } }, cards });
const workshopItems = structuredClone(workshopResult.proposal.items);
let selected = workshopItems.find((item) => item.sheet_id);
let teacherFixtureEdit = false;
if (!selected) {
  const first = workshopItems[0];
  first.competency_id = "MAT_CANTIDAD";
  first.workshop_type = "matemática";
  first.title = "Comparamos objetos del patio";
  first.purpose = "Comparar colecciones de objetos durante el juego y explicar estrategias.";
  first.observation_focus = "Explica cómo compara las colecciones.";
  const sheet = await selectWorkshopSheet({ age: 5, competencyId: first.competency_id,
    intention: `${first.purpose} ${first.observation_focus}` }) ?? (await availableSheets({ age: 5, competencyId: first.competency_id }))[0];
  if (!sheet) throw new Error("No existe ficha real disponible para completar la prueba.");
  first.sheet_id = sheet.id;
  first.sheet_reason = "Ayuda a representar y comentar la comparación después del juego.";
  selected = first;
  teacherFixtureEdit = true;
}
const master = { id: "33333333-3333-4333-8333-333333333333", parent_project_id: project.id,
  status: "active", version: 1, details: { schema: "workshop-master-v1", items: workshopItems } };
const route = project.details.activity_route[selected.index - 1];
const main = await generateTeacherActivity({ request: { routeItemId: route.id,
  activityPurpose: route.specific_purpose, competencyId: route.competency_id }, classroom,
  learningExperience: project });
const sheet = (await availableSheets({ age: 5, competencyId: selected.competency_id }))
  .find((item) => item.id === selected.sheet_id);
const workshop = await generateWorkshopDay({ classroom, project, master, itemIndex: selected.index,
  mainActivity: main.proposal, sheet });
const details = saveActivityDetails(main.proposal, route, null, true);
const doc = { kind: "activity", school_year: 2026, institution_name: "Institución de prueba",
  teacher_name: "Docente de prueba", classroom: classroom.section, age: classroom.age,
  title: details.title, occurs_on: route.date, experience_title: project.title,
  experience_details: { activity_route: project.details.activity_route },
  active_criterion: { criterion_text: route.evaluation_criterion,
    observation_focus: route.observation_focus }, content: { ...details, materials: route.materials },
  workshop: { content: workshop.proposal } };
const filename = path.join(output, "actividad-taller-con-ficha.docx");
await writeFile(filename, await renderActivityUnifiedWord(doc, cards));
await writeFile(path.join(output, "resultado.json"), JSON.stringify({
  fixture: "Solo datos ficticios; confirmaciones de proyecto y taller simuladas para esta prueba aislada.",
  teacher_fixture_edit_to_add_sheet: teacherFixtureEdit,
  project_master: projectResult.output, workshop_master: master.details,
  activity: main.proposal, workshop: workshop.proposal,
  models: { project: "gpt-6-sol", workshop_master: workshopResult.metadata.model,
    activity: main.internalMetadata.model, workshop: workshop.metadata.model },
  usage: { project: projectResult.provider_metadata?.usage ?? projectResult.metadata?.usage ?? null,
    workshop_master: workshopResult.metadata.usage, activity: main.internalMetadata.usage,
    workshop: workshop.metadata.usage }, elapsed_ms: Date.now() - start,
}, null, 2));
console.log(JSON.stringify({ docx: filename, result: path.join(output, "resultado.json"),
  elapsed_ms: Date.now() - start, sheet_id: selected.sheet_id, teacher_fixture_edit: teacherFixtureEdit }));
