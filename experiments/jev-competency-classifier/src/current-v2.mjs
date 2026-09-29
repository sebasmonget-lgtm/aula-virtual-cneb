import { createJevOpenRouterDecision } from "../../../src/lib/jev-openrouter-decision.mjs";
import { buildClassifierOptions } from "../../../src/lib/openai-competency-classifier.mjs";
import { applicableCompetencyCards } from "../../../src/lib/competency-applicability.mjs";
import { assertNoBenchmarkLabels } from "./luna-inference-boundary.mjs";
import { trackedFetch } from "./luna-benchmark-adapters.mjs";

export function observationFragments(observation) {
  return observation.split(/(?<=[.!?;])\s+|\n+/u).map((part) => part.trim()).filter(Boolean).slice(0, 24);
}

export function v2Requests({ input, kb, prompt }) {
  assertNoBenchmarkLabels(input);
  const applicable = input.age == null ? kb.competencyCards.filter((card) => Object.values(card.runtime_selectable_by_age).some(Boolean) &&
    (card.id !== "CAST_L2_ORAL" || input.applicability.castellano_as_second_language) &&
    (card.id !== "PS_RELIGION" || input.applicability.religion_applicable)) : applicableCompetencyCards(kb.competencyCards, input.age, {
    castellanoL2Applicable: input.applicability.castellano_as_second_language, religionApplicable: input.applicability.religion_applicable });
  const options = buildClassifierOptions(kb.competencyCards, input.age, applicable.map((card) => card.id));
  const rules = [...prompt.decision_rules, ...Object.values(prompt.disambiguation)].join("\n");
  const criteria = Object.fromEntries(options.map((option) => [option.id,
    `${option.name}. ${option.applies_when.join("; ")}. ${prompt.disambiguation[option.id] ?? ""} No usar: ${option.avoid_when.join("; ")}.`]));
  criteria.NO_CLASIFICABLE = "Información insuficiente o exclusivamente estado circunstancial, presencia o acción cotidiana sin evidencia observable suficiente. No completar hechos ausentes.";
  const fragments = observationFragments(input.observable_text ?? input.observation);
  const evidenceCriteria = Object.fromEntries(fragments.map((fragment, i) => [`E${i + 1}`, fragment]));
  evidenceCriteria.NONE = "No hay fragmento observable que sustente una competencia.";
  const sufficiency = { type: "noul", instructions: prompt.evidence_sufficiency?.instructions ?? "¿Hay una conducta, acción, expresión o producción observable suficiente, más allá de un estado circunstancial, sin inventar hechos?",
    criteria: { true: prompt.evidence_sufficiency?.true ?? "Hay una acción central concreta y un referente observable que sustenta alguna competencia.",
      false: prompt.evidence_sufficiency?.false ?? "Solo hay estado circunstancial, presencia, valoración vaga o información insuficiente." } };
  const questions = Object.fromEntries(options.map((option) => [option.id, { type: "noul",
    instructions: `¿Hay evidencia observable propia de «${option.name}»? Si no es la acción central, exige OTRA conducta independiente. Una acción instrumental, hablar como medio o una simple mención no justifican una secundaria. ${prompt.disambiguation[option.id] ?? ""}`,
    criteria: { true: `${option.applies_when.join("; ")}; conducta específica e independiente descrita, sin inferir intención.`,
      false: `No hay conducta propia suficiente, es solo medio/contexto/tema o un estado circunstancial. ${option.avoid_when.join("; ")}` } }]));
  const common = { state: `Edad: ${input.age ?? null}. Observación: ${input.observation}`, kbVersion: kb.version, candidateIds: options.map((option) => option.id) };
  return { options, fragments,
    primary: assertNoBenchmarkLabels({ ...common, workflow: "current_v2_primary", questions: {
      competency: { type: "choice", instructions: rules + "\nSelecciona una sola competencia principal o NO_CLASIFICABLE.", criteria },
      evidence_sufficient: sufficiency,
      evidence_fragment: { type: "choice", instructions: prompt.evidence_instruction, criteria: evidenceCriteria },
    } }),
    additional: assertNoBenchmarkLabels({ ...common, workflow: "current_v2_additional", questions: { ...questions, evidence_sufficient: sufficiency } }) };
}

// Literal grounding only. No gold, curricular keywords or inferred replacement words.
export function groundEvidence(fragment, original) {
  if (!fragment) return { evidence: "", grounded: false };
  if (original.includes(fragment)) return { evidence: fragment, grounded: true };
  const ignored = new Set(["el", "la", "los", "las", "un", "una", "de", "del", "y", "a", "en", "con", "se", "su", "que", "persona", "estudiante"]);
  const normalize = (word) => word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const wanted = [...fragment.matchAll(/\p{L}+/gu)].map((m) => normalize(m[0])).filter((word) => !ignored.has(word));
  if (wanted.length < 2) return { evidence: "", grounded: false };
  const source = [...original.matchAll(/\p{L}+/gu)];
  let cursor = 0, first = null, last = null;
  for (const word of wanted) {
    while (cursor < source.length && normalize(source[cursor][0]) !== word) cursor++;
    if (cursor === source.length) return { evidence: "", grounded: false };
    first ??= source[cursor].index; last = source[cursor].index + source[cursor][0].length; cursor++;
  }
  const start = Math.max(original.lastIndexOf(".", first - 1), original.lastIndexOf(";", first - 1), original.lastIndexOf("\n", first - 1)) + 1;
  const evidence = original.slice(start, last).trim();
  return evidence.length <= 700 ? { evidence, grounded: true } : { evidence: "", grounded: false };
}

export function createCurrentV2({ kb, prompt, pricing, apiKey, model = "typesafe/jev-1.13", fetchImpl = fetch }) {
  return async (input) => {
    const calls = [], started = performance.now();
    const plan = v2Requests({ input, kb, prompt });
    const client = createJevOpenRouterDecision({ apiKey, model, fetchImpl: trackedFetch(fetchImpl, calls, pricing), telemetry: () => {} });
    try {
      const [primaryResult, additionalResult] = await Promise.allSettled([client.decide(plan.primary), client.decide(plan.additional)]);
      if (primaryResult.status === "rejected") throw primaryResult.reason;
      const answers = primaryResult.value.answers;
      const answer = answers.competency;
      const primary = answer.choice !== "NO_CLASIFICABLE" && answer.confidence >= 0.5 && answers.evidence_sufficient.noul >= 0.7 ? answer.choice : null;
      const secondary = primary && additionalResult.status === "fulfilled" && additionalResult.value.answers.evidence_sufficient.noul >= 0.7 ?
        plan.options.map((option) => option.id).filter((id) => id !== primary && additionalResult.value.answers[id].noul >= 0.8)
          .sort((a, b) => additionalResult.value.answers[b].noul - additionalResult.value.answers[a].noul || a.localeCompare(b)).slice(0, 3) : [];
      const fragmentId = answers.evidence_fragment.choice;
      const evidence = fragmentId === "NONE" ? "" : plan.fragments[Number(fragmentId.slice(1)) - 1];
      const explanation = { status: primary ? "suggested" : "abstain", primary, secondary,
        evidence,
        reason: primary ? `Acción central: ${plan.options.find((option) => option.id === primary).name}; confianza ${answer.confidence.toFixed(2)}, suficiencia ${answers.evidence_sufficient.noul.toFixed(2)}.` :
          `Abstención: elección ${answer.choice}, confianza ${answer.confidence.toFixed(2)} (mínimo 0.50), suficiencia ${answers.evidence_sufficient.noul.toFixed(2)} (mínimo 0.70).` };
      return { status: primary ? "review" : "unclassified", primary, additional: secondary,
        ranked: Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]).map(([id]) => id), explanation,
        evidence_selected_id: fragmentId, calls, latency_ms: Math.round(performance.now() - started),
        raw_result: { primary: primaryResult.value, additional: additionalResult.status === "fulfilled" ? additionalResult.value : null } };
    } catch (error) { return { status: "classification_failed", primary: null, additional: [], ranked: [], calls,
      error_code: error.code ?? "invalid_response", latency_ms: Math.round(performance.now() - started) }; }
  };
}
