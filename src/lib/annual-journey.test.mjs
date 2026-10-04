import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import JSZip from "jszip";
import { solveAnnualJourneyCalendar } from "./annual-journey-calendar.mjs";
import { nationalSchoolHolidays2026, defaultInitialStage } from "./annual-plan-calendar.mjs";
import { fixtureCalendar, generationFixture as makeFixture } from "./test-fixtures/annual-journey.mjs";
const generationFixture = (cards = curriculum) => makeFixture(cards);
import { buildAnnualClassroomSnapshot } from "./annual-classroom-snapshot.mjs";
import { generateAnnualJourney, appendJourneyIntent, applyAnnualJourneyChanges, refreshJourneySnapshot } from "./annual-journey-service.mjs";
import { validateAnnualJourney } from "./annual-journey-contract.mjs";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { handleAnnualJourneyRoutes } from "../../scripts/annual-journey-routes.mjs";
import { loadSavedDocument } from "./document-library-service.mjs";
import { renderSavedDocumentWord } from "./document-word-export.mjs";
import { annualJourneyDocumentSections } from "./annual-journey-word.mjs";
import { scopedAnnualChanges, annualCalendarCriteria } from "./annual-change-scope.mjs";

const curriculum = [{ id: "MAT_CANTIDAD", name: "Cantidad", capacities: ["Comunica su comprensión"] },
  { id: "COM_ORAL", name: "Comunicación oral", capacities: ["Interactúa estratégicamente"] }];
const snapshot = () => buildAnnualClassroomSnapshot({ students: [{ id: "one" }, { id: "two" }], interviews: [],
  observations: [], names: [], fingerprint: "fixture" }, { id: "classroom", available_resources: [] }, curriculum);
const provider = (calls, cards = curriculum, reviewIssues = []) => (routing) => ({ generate: async (request) => {
  calls.push({ routing, request });
  if (request.workflow === "annual_journey_review") return { output: { issues: reviewIssues } };
  if (request.workflow === "annual_journey_intent") return { output: { proposal_ids: [request.ai_context_bundle.proposals[0].proposal_id] } };
  if (request.ai_context_bundle.global_prose_repair) { const {proposals,...general}=generationFixture(cards);void proposals;
    return {output:{...general,replacements:[]}}; }
  if (request.workflow === "annual_journey_repair") return { output: { replacements: request.ai_context_bundle.proposals.map((row, i) => ({
    proposal_id: row.proposal_id, change_reason: "Cambio docente", ...generationFixture(cards).proposals[i], title: `Plantas y juego ${i + 1}` })),
    everyday_opportunities: request.ai_context_bundle.everyday_opportunities, evidence_interpretations: request.ai_context_bundle.evidence_interpretations ?? [] } };
  return { output: generationFixture(cards) };
} });

test("aplicar una propuesta conserva los pendientes globales/ajenos y no interpreta el año", async () => {
  const calls=[], base=await generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),createProvider:provider(calls)});
  const id=base.proposed_experiences[0].proposal_id, other=base.proposed_experiences[1].proposal_id;
  const plan=appendJourneyIntent(appendJourneyIntent(appendJourneyIntent(base,"Más naturaleza en el año · NOMBRE_PRIVADO_123"),"Más movimiento",id),"Incluir familias · DNI_PRIVADO_456",other);
  calls.length=0;
  const result=await applyAnnualJourneyChanges(plan,{context:{year:2026,age:5},curriculum,proposalId:id,createProvider:provider(calls)});
  assert.deepEqual(result.pending_changes,plan.pending_changes.filter(c=>c.proposal_id!==id));
  assert.deepEqual(result.proposed_experiences.slice(1),plan.proposed_experiences.slice(1));
  assert.deepEqual(result.change_history.at(-1).changes,scopedAnnualChanges(plan,id));
  assert.equal(result.metrics.corrections,1);
  assert.equal(calls.length,2);assert.ok(calls.every(c=>c.request.workflow!=="annual_journey_intent"));
  assert.deepEqual(calls[0].request.ai_context_bundle.changes.map(c=>c.text),["Más movimiento"]);
  assert.deepEqual(calls[1].request.ai_context_bundle.plan.proposed_experiences.map(row=>row.proposal_id),[id]);
  assert.ok(calls.every(call=>!JSON.stringify(call.request).includes("NOMBRE_PRIVADO_123") && !JSON.stringify(call.request).includes("DNI_PRIVADO_456")),"Los pendientes ajenos nunca salen al proveedor");
  const noPending=await applyAnnualJourneyChanges(result,{context:{year:2026,age:5},curriculum,proposalId:id,createProvider:provider(calls)});
  assert.equal(noPending,result);assert.equal(calls.length,2);
  await assert.rejects(()=>applyAnnualJourneyChanges(plan,{proposalId:randomUUID()}),e=>e.reason==="invalid_scope");
});

test("aplicar un cambio global deja pendientes las indicaciones de propuestas", async () => {
  const calls=[],base=await generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),createProvider:provider(calls)});
  const plan=appendJourneyIntent(appendJourneyIntent(base,"Más naturaleza"),"Más movimiento",base.proposed_experiences[1].proposal_id);
  calls.length=0;
  const result=await applyAnnualJourneyChanges(plan,{context:{year:2026,age:5},curriculum,proposalId:null,createProvider:provider(calls)});
  assert.deepEqual(result.pending_changes,plan.pending_changes.filter(c=>c.proposal_id));
  assert.equal(calls.filter(c=>c.request.workflow==="annual_journey_intent").length,1);
  assert.deepEqual(calls[0].request.ai_context_bundle.changes.map(c=>c.text),["Más naturaleza"]);
});

test("el cambio de una propuesta no autoriza reparación de otra ni cambios cotidianos", async () => {
  const calls=[],base=await generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),createProvider:provider(calls)});
  const id=base.proposed_experiences[0].proposal_id,plan=appendJourneyIntent(base,"Más movimiento",id);
  await assert.rejects(()=>applyAnnualJourneyChanges(plan,{context:{year:2026,age:5},curriculum,proposalId:id,createProvider:provider(calls,curriculum,[{proposal_id:base.proposed_experiences[1].proposal_id,reason:"Cambiar otra propuesta"}])}),e=>e.reason==="semantic_review");
  const normal=provider([]);
  await assert.rejects(()=>applyAnnualJourneyChanges(plan,{context:{year:2026,age:5},curriculum,proposalId:id,createProvider:routing=>({generate:async request=>{const result=await normal(routing).generate(request);if(request.workflow==="annual_journey_repair")result.output.everyday_opportunities=[];return result;}})}),e=>e.reason==="invalid_scope");
  assert.deepEqual(annualCalendarCriteria({...base,organization_criteria:["Doce propuestas flexibles","Ventanas de marzo"]}),annualCalendarCriteria(base));
  assert.match(annualCalendarCriteria(base)[0],/15 tramos/);
});

test("regresión Astra: 172/172, quince propuestas, cero huecos/solapamientos y lunes–viernes", () => {
  const c = fixtureCalendar(), result = solveAnnualJourneyCalendar(c);
  assert.deepEqual(result.integrity, { eligible: 172, assigned: 172, gaps: 0, overlaps: 0 });
  assert.equal(result.projects.length, 15);
  for (const row of result.projects) { assert.equal(new Date(row.starts_on).getUTCDay(), 1); assert.equal(new Date(row.ends_on).getUTCDay(), 5); }
  for (const d of nationalSchoolHolidays2026()) assert.ok(!result.assignments.some((a) => a.date === d.exception_date));
});
test("feriados lunes/viernes interiores, gestión y excepción institucional nunca reciben asignación", () => {
  const c = fixtureCalendar();
  for (const day of ["2026-04-06", "2026-04-03", "2026-06-03"]) c.days.find((d) => d.date === day).is_instructional = false;
  const result = solveAnnualJourneyCalendar(c);
  assert.equal(result.integrity.eligible, 170); assert.equal(result.integrity.gaps, 0);
  assert.ok(!result.assignments.some((a) => ["2026-04-06", "2026-04-03", "2026-06-03", "2026-07-28"].includes(a.date)));
});
test("calendario imposible devuelve incidencia concreta y no salta fechas", () => {
  const c = fixtureCalendar(); c.days = c.days.filter((d) => d.date < "2026-07-01");
  assert.throws(() => solveAnnualJourneyCalendar(c), (e) => e.reason === "incompatible_constraints" && e.details.proposals === 15);
  const b = fixtureCalendar(); b.days.find((d) => d.date === "2026-03-16").is_instructional = false;
  assert.equal(solveAnnualJourneyCalendar(b).initial_stage.instructional_dates.length, 9);
});
test("snapshot conserva negación, otro, lengua minoritaria y contradicción sin generalizar", () => {
  const source = { students: [{ id: "one" }, { id: "two" }], names: [], fingerprint: "source", prior: null,
    observations: Array.from({ length: 8 }, (_, i) => ({ id: `ob${i}`, student_id: "one", observation_text: "Jugó y explicó su torre.", competency_v4_id: "MAT_CANTIDAD" })),
    interviews: [{ id: "family", student_id: "one", version: 1, details: { interests: "No le interesan los animales; quizá le gusta explorar.",
      other_interest_text: "Sombras", language_tags: ["other"], other_language_text: "Shipibo-konibo", other_community_text: "Tejidos" } },
    { id: "family2", student_id: "two", version: 1, details: { interests: "Disfruta los animales." } }] };
  const s = buildAnnualClassroomSnapshot(source, { id: "classroom", available_resources: [] }, curriculum);
  assert.match(s.facts.find((f) => f.kind === "family_report").support_text, /No le interesan.*Sombras.*Shipibo-konibo.*Tejidos/s);
  assert.equal(s.competency_information[0].distinct_children, 1); assert.equal(s.competency_information[1].information_status, "unknown");
  assert.ok(s.facts.every((f) => f.scope === "individual"));
});
test("generación completa usa dos llamadas y cobertura concreta incluyendo momentos recurrentes", async () => {
  const calls = [], plan = await generateAnnualJourney({ context: { year: 2026, age: 5 }, snapshot: snapshot(), curriculum,
    calendar: fixtureCalendar(), createProvider: provider(calls) });
  validateAnnualJourney(plan, curriculum, { confirmation: true });
  assert.equal(calls.length, 2); assert.equal(plan.proposed_experiences.length, 15);
  const broken = structuredClone(plan); broken.everyday_opportunities = [];
  assert.throws(() => validateAnnualJourney(broken, curriculum), (e) => e.reason === "coverage_missing");
  const nominal = structuredClone(plan); nominal.proposed_experiences[0].primary_competency_ids.push("COM_ORAL");
  assert.throws(() => validateAnnualJourney(nominal, curriculum), (e) => e.reason === "nominal_competency");
  assert.ok(!JSON.stringify(calls[1].request).includes("source_refs"));
});
test("varios mensajes no consultan IA; aplicación contextual agrupa cambios y preserva once propuestas", async () => {
  const calls = [], plan = await generateAnnualJourney({ context: { year: 2026, age: 5 }, snapshot: snapshot(), curriculum,
    calendar: fixtureCalendar(), createProvider: provider(calls) });
  const id = plan.proposed_experiences[0].proposal_id;
  let changed = appendJourneyIntent(plan, "Quiero incluir plantas", id);
  changed = appendJourneyIntent(changed, "También música", id);
  assert.equal(calls.length, 2); assert.equal(changed.pending_changes.length, 2);
  assert.throws(() => validateAnnualJourney(changed, curriculum, { confirmation: true }), (e) => e.reason === "pending_changes");
  const result = await applyAnnualJourneyChanges(changed, { context: { age: 5 }, curriculum, createProvider: provider(calls) });
  assert.equal(calls.length, 4); assert.equal(result.pending_changes.length, 0);
  assert.deepEqual(result.proposed_experiences.slice(1), plan.proposed_experiences.slice(1));
  assert.deepEqual(result.resolved_calendar, plan.resolved_calendar);
});
test("cambio global usa Luna para alcance mínimo y rechaza propuesta protegida", async () => {
  const calls = [], plan = await generateAnnualJourney({ context: { year: 2026, age: 5 }, snapshot: snapshot(), curriculum,
    calendar: fixtureCalendar(), createProvider: provider(calls) });
  const changed = appendJourneyIntent(plan, "Incluye plantas en el año");
  await applyAnnualJourneyChanges(changed, { context: { age: 5 }, curriculum, createProvider: provider(calls) });
  assert.equal(calls[2].routing.model, "gpt-6-luna"); assert.equal(calls[3].request.ai_context_bundle.proposals.length, 1);
  await assert.rejects(() => applyAnnualJourneyChanges(changed, { context: { age: 5 }, curriculum,
    protectedIds: [plan.proposed_experiences[0].proposal_id], createProvider: provider([]) }), (e) => e.reason === "protected_proposal");
});
test("salida incompleta y reparación fallida no se aceptan", async () => {
  await assert.rejects(() => generateAnnualJourney({ context: { year: 2026, age: 5 }, snapshot: snapshot(), curriculum,
    calendar: fixtureCalendar(), createProvider: () => ({ generate: async () => ({ output: { proposals: [] } }) }) }), (e) => e.reason === "incomplete");
  await assert.rejects(() => generateAnnualJourney({ context: { year: 2026, age: 5 }, snapshot: snapshot(), curriculum,
    calendar: fixtureCalendar(), createProvider: provider([], curriculum, [{ proposal_id: "", reason: "Faltan condiciones viables" }]) }), (e) => e.reason === "repair_failed");
});

test("avances, acompañamiento y ambigüedad conservan actuaciones individuales; un vacío o reporte familiar no se interpreta como desempeño", async () => {
  const observed = buildAnnualClassroomSnapshot({students:[{id:"one"},{id:"two"}],interviews:[],names:[],fingerprint:"states",
    observations:[{id:"favorable",student_id:"one",observation_text:"Comparó y explicó dos colecciones",source_type:"diagnostic_observation"},
      {id:"support",student_id:"two",observation_text:"Pidió acompañamiento para continuar",source_type:"guided_diagnostic_observation"},
      {id:"ambiguous",student_id:"one",observation_text:"Se acercó a mirar"}]},{available_resources:[]},curriculum);
  const plan = await generateAnnualJourney({context:{year:2026,age:5},snapshot:observed,curriculum,calendar:fixtureCalendar(),createProvider:provider([])});
  plan.evidence_interpretations=observed.facts.map((fact,i)=>({fact_keys:[fact.key],interpretation:"Hipótesis sobre esta actuación concreta",meaning:["advance","support_needed","ambiguous"][i],scope:"individual"}));
  validateAnnualJourney(plan,curriculum);
  assert.equal(observed.facts[1].origin,"guided_experience");
  assert.ok(observed.competency_information.every(c=>c.information_status==="unknown"));
  const empty=structuredClone(plan);empty.evidence_interpretations[0].fact_keys=[];
  assert.throws(()=>validateAnnualJourney(empty,curriculum));
  const group=structuredClone(plan);group.evidence_interpretations[0].scope="subgroup";
  assert.throws(()=>validateAnnualJourney(group,curriculum),e=>e.reason==="invalid_scope");
  const family=structuredClone(plan);family.classroom_snapshot.facts[0].kind="family_report";
  assert.throws(()=>validateAnnualJourney(family,curriculum),e=>e.reason==="invalid_interpretation");
});

test("integridad valida asignaciones reales; refrescar fuentes guarda intención sin IA ni modificar tarjetas",async()=>{
  const calls=[],plan=await generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),createProvider:provider(calls)});
  const corrupt=structuredClone(plan);corrupt.resolved_calendar.assignments.pop();
  assert.throws(()=>validateAnnualJourney(corrupt,curriculum),e=>e.reason==="invalid_calendar");
  const refreshed=refreshJourneySnapshot(plan,{...snapshot(),source_fingerprint:"updated"});
  assert.equal(calls.length,2);assert.deepEqual(refreshed.proposed_experiences,plan.proposed_experiences);
  assert.equal(refreshed.pending_changes.length,1);assert.equal(refreshed.pedagogical_review.status,"pending");
});

test("reparación semántica es localizada y acotada; fallo de la segunda revisión no publica",async()=>{
  let repairs=0,reviews=0;
  await assert.rejects(()=>generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),
    createProvider:()=>({generate:async(request)=>{const b=request.ai_context_bundle;
      if(request.workflow==="annual_plan")return{output:generationFixture()};
      if(request.workflow==="annual_journey_review"){reviews++;return{output:{issues:[{proposal_id:b.plan.proposed_experiences[0].proposal_id,reason:"La oportunidad sigue siendo incoherente"}]}};}
      repairs++; const row=b.plan.proposed_experiences[0];return{output:{replacements:[{proposal_id:row.proposal_id,change_reason:"Revisión",...generationFixture().proposals[0]}],everyday_opportunities:b.plan.everyday_opportunities,evidence_interpretations:[]}};
    }})}),e=>e.reason==="repair_failed");
  assert.equal(repairs,1);assert.equal(reviews,2);
});

test("una incidencia determinística de una fila admite solo reparación localizada antes de revisar",async()=>{
  const calls=[];
  const plan=await generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),
    createProvider:()=>({generate:async(request)=>{calls.push(request);const b=request.ai_context_bundle;
      if(request.workflow==="annual_plan"){const out=generationFixture();out.proposals[0].opportunities[0].competency_id="INVALID";return{output:out};}
      if(request.workflow==="annual_journey_review")return{output:{issues:[]}};
      return{output:{replacements:[{proposal_id:b.affected_proposal_ids[0],change_reason:"ID oficial",...generationFixture().proposals[0]}],everyday_opportunities:b.plan.everyday_opportunities,evidence_interpretations:[]}};
    }})});
  assert.equal(calls.length,3);assert.equal(calls[1].ai_context_bundle.affected_proposal_ids.length,1);validateAnnualJourney(plan,curriculum,{confirmation:true});
});

test("vertical en PostgreSQL: preparar → cambios → confirmar → Word idéntico; CAS, permisos, versiones y fallo", async () => {
  const db = new PGlite();
  try {
    const folder = new URL("../../local-db/migrations/", import.meta.url);
    for (const f of (await readdir(folder)).filter((f) => f.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(f, folder), "utf8"));
    const teacherId = randomUUID(), created = await createPilotClassroom(db, teacherId, { teacherName: "Docente QA", institutionName: "Jardín QA",
      section: "QA", age: 5, year: 2026, startsOn: "2026-03-02", endsOn: "2026-12-31" });
    await importStudentsForTeacher(db, teacherId, [{ firstName: "Niña", lastName: "Ficticia" }]);
    const version = (await db.query("select id from curriculum_versions limit 1")).rows[0].id;
    const context = { id: created.classroomId, school_year_id: created.schoolYearId, curriculum_version_id: version,
      year: 2026, age: 5, group_context: "Aula de prueba ficticia", available_resources: [], calendar: { initial_stage: defaultInitialStage() } };
    const calls = [];
    let failing = false, failNewReview = false;
    const route = async (path, body = {}, user = teacherId, method = path.endsWith("start") ? "GET" : "POST") => {
      let result;
      await handleAnnualJourneyRoutes({ request: { method }, response: {},
        url: new URL(`http://localhost/api/annual-journey/${path}`), db, teacherId: user, readJson: async () => body,
        send: (_r, status, data) => { result = { status, data }; }, annualPlanningContext: async () => context,
        annualDocumentContext: () => ({ teacher_name: "Docente QA", template_version: "annual-journey-v2" }),
        createProvider: (routing) => ({ generate: async (request) => {
          if (failing) throw Object.assign(new Error("Simulated provider failure"), { name: "OpenAIProviderError" });
          if(failNewReview && request.workflow==="annual_journey_review") {failNewReview=false;throw Object.assign(new Error("Simulated row review interruption"),{name:"OpenAIProviderError"});}
          if(request.output_schema.id==="annual-proposal-row-v3") {calls.push({routing,request});const row=generationFixture(request.ai_context_bundle.curriculum.competency_cards).proposals[0];return {output:{...row,title:"Exploramos nuestro mercado",source_fact_keys:[request.ai_context_bundle.classroom.facts.find(f=>f.key.startsWith("proposal_intent_")).key]}};}
          if(request.workflow==="annual_journey_conversation") {calls.push({routing,request});const ready=request.ai_context_bundle.teacher_intentions.length>0;return {output:{status:ready?"ready":"needs_clarification",message:ready?"Prepararemos una propuesta sobre el mercado.":"¿Qué propuesta quieres crear?",question:"",chips:[]}};}
          return provider(calls, request.ai_context_bundle.curriculum.competency_cards)(routing).generate(request);
        } }) });
      return result;
    };
    const start = await route("start"); assert.equal(start.status, 200, JSON.stringify(start.data));
    failing = true;
    const initialFailure = await route("generate", { teacherIdeas: "Quiero incluir un jardín", sourceFingerprint: start.data.snapshot.source_fingerprint });
    assert.equal(initialFailure.status,503);
    const preparation = (await db.query("select id,revision,proposal from annual_plans where id=$1",[initialFailure.data.draft_id])).rows[0];
    assert.equal(preparation.proposal.teacher_preferences,"Quiero incluir un jardín");
    failing = false;
    const generated = await route("generate", { teacherIdeas: "Quiero incluir un jardín", sourceFingerprint: start.data.snapshot.source_fingerprint, draftId:preparation.id,expectedRevision:Number(preparation.revision) });
    assert.equal(generated.status, 201, JSON.stringify(generated.data));
    let current = generated.data;
    assert.equal(current.proposal.resolved_calendar.integrity.assigned, 172);
    const target = current.proposal.proposed_experiences.at(-1).proposal_id;
    const add = await route(`${current.id}/intent`, { expectedRevision: current.revision, proposalId: target, text: "Quiero plantas" });
    assert.equal(add.status, 200, JSON.stringify(add.data));
    assert.equal(calls.length, 2);
    const stale = await route(`${current.id}/intent`, { expectedRevision: current.revision, text: "Música" });
    assert.equal(stale.status, 409);
    current = add.data;
    failing = true;
    const failed = await route(`${current.id}/apply`, { expectedRevision: current.revision }); assert.equal(failed.status, 503);
    assert.deepEqual((await db.query("select proposal from annual_plans where id=$1", [current.id])).rows[0].proposal, current.proposal);
    failing = false;
    const apply = await route(`${current.id}/apply`, { expectedRevision: current.revision }); assert.equal(apply.status, 200, JSON.stringify(apply.data));
    current = apply.data;
    const move = await route(`${current.id}/move`,{expectedRevision:current.revision,proposalId:current.proposal.proposed_experiences.at(-1).proposal_id,to:13});
    assert.equal(move.status,200,JSON.stringify(move.data));assert.deepEqual(move.data.proposal.resolved_calendar.integrity,current.proposal.resolved_calendar.integrity);
    assert.equal(calls.length,4);current=move.data;
    const forbidden = await route(`${current.id}/intent`, { expectedRevision: current.revision, text: "Música" }, randomUUID());
    assert.equal(forbidden.status, 404);
    const structuralCalls=calls.length,future=current.proposal.proposed_experiences.at(-1),slotId=future.slot_id;
    const removed=await route(`${current.id}/structure`,{expectedRevision:current.revision,action:{kind:"remove",proposalId:future.proposal_id}});assert.equal(removed.status,200,JSON.stringify(removed.data));current=removed.data;
    const emptyConfirm=await route(`${current.id}/confirm`,{expectedRevision:current.revision});assert.equal(emptyConfirm.status,422);assert.equal(emptyConfirm.data.reason,"empty_slots");
    const restored=await route(`${current.id}/structure`,{expectedRevision:current.revision,action:{kind:"place",proposalId:future.proposal_id,targetSlotId:slotId}});assert.equal(restored.status,200,JSON.stringify(restored.data));current=restored.data;
    assert.equal(calls.length,structuralCalls);
    const conversation=await route(`${current.id}/new-proposal/conversation`,{expectedRevision:current.revision});assert.equal(conversation.status,200,JSON.stringify(conversation.data));
    const answer=await route(`${current.id}/new-proposal/conversation`,{expectedRevision:current.revision,id:conversation.data.id,revision:conversation.data.revision,text:"Quiero crear un proyecto sobre el mercado"});assert.equal(answer.data.status,"ready");
    failNewReview=true;
    const interruptedProposal=await route(`${current.id}/new-proposal/generate`,{expectedRevision:current.revision,id:answer.data.id,revision:answer.data.revision});assert.equal(interruptedProposal.status,503);
    const rowCalls=calls.filter(c=>c.request.output_schema.id==="annual-proposal-row-v3").length;
    const createdProposal=await route(`${current.id}/new-proposal/generate`,{expectedRevision:current.revision,id:answer.data.id,revision:answer.data.revision});assert.equal(createdProposal.status,200,JSON.stringify(createdProposal.data));assert.ok(createdProposal.data.candidate);assert.equal(calls.length,structuralCalls+4);
    assert.equal(calls.filter(c=>c.request.output_schema.id==="annual-proposal-row-v3").length,rowCalls,"Retry reviews the stored row without regenerating it");
    const recovered=await route(`${current.id}/new-proposal/conversation?id=${answer.data.id}`,{},teacherId,"GET");
    assert.equal(recovered.status,200);assert.deepEqual(recovered.data.candidate,createdProposal.data.candidate);assert.equal(calls.length,structuralCalls+4,"Recuperar la candidata guardada no llama a IA");
    const foreignRecovery=await route(`${current.id}/new-proposal/conversation?id=${answer.data.id}`,{},randomUUID(),"GET");assert.equal(foreignRecovery.status,404);
    const illegal=await route(`${current.id}/new-proposal/approve`,{expectedRevision:current.revision,id:answer.data.id},randomUUID());assert.equal(illegal.status,404);
    const approved=await route(`${current.id}/new-proposal/approve`,{expectedRevision:current.revision,id:answer.data.id,revision:createdProposal.data.revision});assert.equal(approved.status,201,JSON.stringify(approved.data));current=approved.data;
    assert.equal(current.proposal.available_experiences.length,1);assert.equal(current.proposal.available_experiences[0].planned_start_date,undefined);assert.equal(current.proposal.proposed_experiences.length,15);assert.equal(calls.length,structuralCalls+4);
    const reusedApproval=await route(`${current.id}/new-proposal/approve`,{expectedRevision:current.revision,id:answer.data.id});assert.equal(reusedApproval.status,422);
    const confirm = await route(`${current.id}/confirm`, { expectedRevision: current.revision }); assert.equal(confirm.status, 200, JSON.stringify(confirm.data));
    const beforeCalls = calls.length, doc = await loadSavedDocument(db, teacherId, "annual_plan", current.id);
    assert.deepEqual(doc.content, current.proposal);
    const a = await renderSavedDocumentWord(doc), b = await renderSavedDocumentWord(doc);
    const xml = async (bytes) => (await JSZip.loadAsync(bytes)).file("word/document.xml").async("string");
    assert.equal(await xml(a), await xml(b)); assert.equal(calls.length, beforeCalls);
    assert.match(await xml(a), /Plantas y juego/);
    assert.deepEqual(annualJourneyDocumentSections(doc.content), annualJourneyDocumentSections(current.proposal));
    const active = (await db.query("select id,revision from annual_plans where status='active'")).rows[0];
    const copy = await route(`${active.id}/copy`, { expectedRevision: Number(active.revision) }); assert.equal(copy.status, 201, JSON.stringify(copy.data));
    assert.equal((await db.query("select count(*)::int as n from annual_plans where status='active'")).rows[0].n, 1);
    assert.equal((await db.query("select count(*)::int as n from annual_plans where status='draft'")).rows[0].n, 1);
    const past = copy.data.proposal.proposed_experiences[0].proposal_id;
    const movedPast = await route(`${copy.data.id}/move`,{expectedRevision:Number(copy.data.revision),proposalId:past,to:1});
    assert.equal(movedPast.status,422);
    const student=(await db.query("select id from students where classroom_id=$1",[context.id])).rows[0];
    await db.query("insert into ordinary_observations(id,classroom_id,student_id,created_by,client_request_id,request_fingerprint,raw_text,source_kind,context_snapshot,occurred_at) values($1,$2,$3,$4,$5,$6,$7,'spontaneous','{}'::jsonb,now())",[randomUUID(),context.id,student.id,teacherId,randomUUID(),"e".repeat(64),"Pidió acompañamiento para comparar"]);
    const after = await route("start");assert.equal(after.status,200,JSON.stringify(after.data));
    assert.equal(after.data.snapshot.facts.filter(f=>f.kind==='observed').length,1);
    assert.equal(after.data.snapshot.competency_information.filter(c=>c.recorded_performances>0).length,0);
    const refreshed=await route(`${copy.data.id}/refresh`,{expectedRevision:Number(copy.data.revision)});
    assert.equal(refreshed.status,200,JSON.stringify(refreshed.data));assert.equal(refreshed.data.proposal.pending_changes.length,1);
  } finally { await db.close(); }
});
