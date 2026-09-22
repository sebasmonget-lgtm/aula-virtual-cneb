import {
  loadKnowledgeBaseV4,
  validateKnowledgeBaseAge,
  validateKnowledgeBaseWorkflow,
} from "./knowledge-base-v4.mjs";

const L2_COMPETENCY_ID = "CAST_L2_ORAL";
const RELIGION_COMPETENCY_ID = "PS_RELIGION";

function normalize(value = "") {
  return String(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function requestTokens(request) {
  return [...new Set(normalize(request).match(/[\p{L}\p{N}_-]{3,}/gu) ?? [])];
}

function isL2Unit(unit) {
  return unit.domain === "castellano_l2" || unit.competency_id === L2_COMPETENCY_ID || unit.area === "Castellano como Segunda Lengua";
}

function isReligionUnit(unit) {
  return unit.domain === "religion_context" || unit.competency_id === RELIGION_COMPETENCY_ID;
}

function hasExplicit2026Context(temporalContext) {
  return temporalContext?.year === 2026 || temporalContext?.include2026Overlay === true;
}

function sourceAuthority(unit, sourceRanks) {
  return Math.min(...unit.source_refs.map((sourceRef) => sourceRanks.get(sourceRef) ?? Number.MAX_SAFE_INTEGER));
}

function relevance(unit, tokens) {
  if (!tokens.length) return 0;
  const searchable = normalize([unit.content, unit.domain, unit.kind, ...(unit.tags ?? [])].join(" "));
  return tokens.reduce((score, token) => score + (searchable.includes(token) ? 1 : 0), 0);
}

function compareUnits(left, right) {
  for (const key of ["requiredDomain", "confirmedCompetency", "exactAge", "priority", "authority", "relevance"]) {
    if (left.rank[key] !== right.rank[key]) return right.rank[key] - left.rank[key];
  }
  return left.unit.id.localeCompare(right.unit.id);
}

function selectWithLimit(candidates, limit) {
  return candidates.slice(0, limit).map(({ unit }) => unit);
}

/**
 * Retrieves local, versioned knowledge units only. It intentionally does not
 * build an AI context or call any model.
 */
export async function retrieveKnowledgeV4(input, knowledgeBase) {
  knowledgeBase ??= await loadKnowledgeBaseV4();
  const age = validateKnowledgeBaseAge(input?.age);
  const workflow = input?.workflow;
  const workflowRequirements = validateKnowledgeBaseWorkflow(workflow, knowledgeBase.workflows);
  const confirmedCompetencyId = input?.confirmedCompetencyId ?? null;
  if (confirmedCompetencyId !== null && !knowledgeBase.competencyCards.some((card) => card.id === confirmedCompetencyId)) {
    throw new RangeError(`Competencia confirmada desconocida: ${confirmedCompetencyId}`);
  }

  const requiredDomains = new Set(workflowRequirements.required_domains);
  const allowedDomains = new Set([...requiredDomains, ...workflowRequirements.optional_domains]);
  const tokens = requestTokens(input?.teacherRequest);
  const sourceRanks = new Map(knowledgeBase.sourceRegistry.sources.map((source) => [source.id, source.authority_rank]));
  const include2026Overlay = hasExplicit2026Context(input?.temporalContext);
  if (include2026Overlay) allowedDomains.add("school_year_start");

  const ranked = knowledgeBase.knowledgeUnits
    .filter((unit) => allowedDomains.has(unit.domain))
    .filter((unit) => unit.age_scope.includes(age))
    .filter((unit) => include2026Overlay || unit.temporal_scope !== "2026")
    .filter((unit) => input?.castellanoL2Applicable === true || !isL2Unit(unit))
    .filter((unit) => input?.religionApplicable === true || !isReligionUnit(unit))
    .filter((unit) => confirmedCompetencyId === null || unit.competency_id === null || unit.competency_id === confirmedCompetencyId)
    .map((unit) => ({
      unit,
      rank: {
        requiredDomain: Number(requiredDomains.has(unit.domain)),
        confirmedCompetency: Number(confirmedCompetencyId !== null && unit.competency_id === confirmedCompetencyId),
        exactAge: Number(unit.age_scope.length === 1 && unit.age_scope[0] === age),
        priority: unit.retrieval_priority,
        authority: -sourceAuthority(unit, sourceRanks),
        relevance: relevance(unit, tokens),
      },
    }))
    .sort(compareUnits);

  const semanticCandidates = ranked.filter(({ unit }) => unit.layer === "semantic");
  const sourceClaimCandidates = ranked.filter(({ unit }) => unit.layer === "source_digest");
  const officialReferenceUnits = ranked.filter(({ unit }) => unit.layer === "official_reference").map(({ unit }) => unit);
  const semanticUnits = selectWithLimit(semanticCandidates, workflowRequirements.max_semantic_units);
  const sourceClaims = selectWithLimit(sourceClaimCandidates, workflowRequirements.max_source_claims);
  const units = [...semanticUnits, ...sourceClaims, ...officialReferenceUnits];

  return {
    workflow,
    age,
    semanticUnits,
    sourceClaims,
    officialReferenceUnits,
    units,
    provenance: {
      knowledge_base_version: knowledgeBase.version,
      knowledge_unit_ids: units.map((unit) => unit.id),
      source_claim_ids: sourceClaims.map((unit) => unit.id),
      source_refs: [...new Set(units.flatMap((unit) => unit.source_refs))].sort(),
      competency_ids: confirmedCompetencyId ? [confirmedCompetencyId] : [],
    },
  };
}
