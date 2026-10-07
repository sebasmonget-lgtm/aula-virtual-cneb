// QA transport fixture, not a production provider. Never connects to an external API.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { generationFixture } from "../../src/lib/test-fixtures/annual-journey.mjs";
if (process.env.NODE_ENV !== "test" || process.env.AYNI_QA_FIXTURE_PROVIDER !== "1")
  throw new Error("El proveedor fixture requiere un proceso QA explícito.");
let calls = 0;
const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/counts") {
    response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify({ calls, paidCalls: 0 })); return;
  }
  if (request.method !== "POST" || request.url !== "/v1/responses") { response.writeHead(404); response.end(); return; }
  try {
    let raw = "";
    for await (const chunk of request) { raw += chunk; if (raw.length > 2_000_000) throw new Error("QA payload too large"); }
    const payload = JSON.parse(raw), context = JSON.parse(payload.input[0].content[0].text);
    const schema = payload.text.format.name.replaceAll("_", "-"), decisions = context.confirmed_decisions;
    const criterion = (id) => ({ competency_id: id, criterion: "Explica una idea relacionada con el propósito de la propuesta.",
      expected_evidence: ["Explicación registrada por la docente durante la actividad."] });
    let output;
    if (schema === "annual-planning-conversation-v2") {
      const texts=context.teacher_decisions??[];
      output={status:texts.length?"ready":"needs_clarification",message:texts.length?"Ya tengo suficiente información para preparar tu año.":"Vamos a aprovechar los recursos de tu aula.",question:texts.length?"":"¿Qué espacios o materiales tenemos? Por ejemplo: patio, huerto o bloques.",chips:texts.length?[]:["Tenemos bloques y un patio"],context_items:texts.map((text,index)=>({text,source_turn:index,support_text:text}))};
    }
    else if (schema.startsWith("annual-journey-slots")) {output=generationFixture(context.curriculum.competency_cards);output.proposals=output.proposals.slice(0,context.calendar.length);}
    else if (schema === "annual-journey-review-v2") output={issues:[]};
    else if (schema === "annual-preplan-v1") output = {
      proposals: context.initial_slots.map((slot, index) => {
        const card = context.curriculum.competency_cards[index % context.curriculum.competency_cards.length];
        return { experience_type: "project", title: `QA ficticia: propuesta ${String(index + 1).padStart(2, "0")}`,
          period: slot.period, month: slot.month, duration_weeks: slot.duration_weeks,
          rationale: "Fixture local para comprobar el recorrido; no es una recomendación pedagógica.",
          purpose: `Explorar y comunicar ideas en la propuesta ${index + 1} mediante juegos del aula.`,
          primary_competency_ids: [card.id] };
      }),
    };
    else if (schema === "annual-formal-v1") output = {
      organization_criteria: ["Partir del juego", "Escuchar a los niños", "Ofrecer materiales", "Revisar registros"],
      transversal_approaches: ["Respeto y participación"], teaching_strategies: ["Juego y conversación"],
      assessment_followup: ["Registrar hechos individuales sin asignar niveles automáticamente"],
      family_collaboration: ["Compartir preguntas de exploración con las familias"],
      inclusive_supports: ["Ofrecer distintas maneras de participar"],
      project_details: context.confirmed_preplan.proposed_experiences.map((row, index) => ({
        index: index + 1, context_or_trigger: row.rationale,
        final_product: `Posible muestra de ideas de la propuesta ${index + 1}`,
        materials: ["Materiales disponibles en el aula"], what_to_observe: ["Ideas y acciones expresadas durante el juego"],
      })),
    };
    else if (schema === "project-preview-v1") output = {
      context_summary: context.annual_proposal.rationale, context_points: ["Fixture de flujo, no recomendación pedagógica real."],
      additional_context_example: "Podemos adaptar los materiales disponibles.",
      purpose_options: [context.annual_proposal.purpose, "Explorar y compartir ideas sobre la propuesta."] };
    else if (schema === "project-dependents-v1") output = {
      guiding_questions: ["¿Qué queremos conocer?", "¿Cómo podemos compartir nuestras ideas?"],
      journey: [{ title: "Explorar", description: "Recuperar ideas y explorar materiales." },
        { title: "Compartir", description: "Comunicar lo que se descubrió." }],
      general_criteria: decisions.competency_ids.map(criterion) };
    else if (schema === "project-master-v1") output = {
      foundation: "Fixture para comprobar persistencia y versiones; no evaluación de calidad curricular.",
      closing_description: "Compartimos nuestras ideas.", closing_rationale: "Recuperar el recorrido realizado.", resources: ["Materiales del aula"],
      activities: context.instructional_dates.map((date, index) => {
        const id = decisions.competency_ids[index % decisions.competency_ids.length];
        return { date, title: `Exploramos y compartimos ${index + 1}`, purpose: decisions.purpose,
          competency_ids: [id], criterion_competency_id: id, pedagogical_intention: "Explorar y comunicar una idea.",
          criterion_text: criterion(id).criterion, expected_evidence: criterion(id).expected_evidence[0],
          acceptable_evidence_variations: ["Explicación con apoyo de materiales"], observation_focus: ["La idea que comunica"],
          materials: ["Materiales del aula"], mediation_notes: "Escuchar y preguntar sin anticipar una respuesta.",
          continuity_from_previous: "Recuperar ideas previas.", continuity_to_next: "Compartir nuevos hallazgos.",
          flexibility_notes: "Adaptar los materiales disponibles.", role_in_project: index === context.instructional_dates.length - 1 ? "Cierre" : "Exploración",
          expected_progression: "De explorar a compartir ideas.", estimated_minutes: 35 };
      }) };
    else if (schema === "project-formal-v1") output = {
      situation: "Situación ficticia de juego para verificar el documento.",
      foundation: "Fixture local de QA; no valida la pertinencia curricular.",
      methodology: "Juego, exploración y conversación con mediación docente.",
      assessment_followup: "Registrar hechos individuales y revisarlos antes de valorar.",
      family_collaboration: "Compartir preguntas de exploración con las familias.",
      diversity_support: "Ofrecer diversas maneras de participar.",
      closing: "Recuperar las ideas expresadas durante el proyecto.",
    };
    else if (schema === "activity-v1") {
      const inherited = context.context?.workflow_inputs?.learning_experience_context?.inherited_route_item;
      if (!inherited) throw new Error("El fixture de actividad exige un blueprint heredado.");
      output = { title: inherited.title, purpose: inherited.specific_purpose,
        meaningful_situation: "Exploramos los materiales del aula relacionados con la propuesta.",
        teacher_preparation: "Organizar los materiales en un espacio accesible.",
        child_actions: "Los niños exploran, comparan y comparten una idea en parejas.",
        mediation: "Escuchar las ideas y preguntar qué descubrieron, sin anticipar una respuesta.",
        evidence_opportunities: "Registrar la explicación individual durante la exploración.",
        closure_or_continuity: "Compartir lo observado y recuperar una pregunta para el siguiente día.",
        competency_status: "confirmed", competency_id: inherited.competency_id };
    } else throw new Error(`Esquema no permitido en QA: ${schema}`);
    calls++;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ id: `resp_qa_${randomUUID()}`, status: "completed", model: payload.model,
      output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(output) }] }],
      usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } }));
    console.log(JSON.stringify({ fixture: schema, calls, paidCalls: 0 }));
  } catch (error) { response.writeHead(422, { "content-type": "application/json" }); response.end(JSON.stringify({ error: { message: error.message } })); }
});
server.listen(Number(process.env.AYNI_QA_FIXTURE_PORT ?? 8790), "127.0.0.1", () => console.log("QA-only fixture provider ready"));
process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
