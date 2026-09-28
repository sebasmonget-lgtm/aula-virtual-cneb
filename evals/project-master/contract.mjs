import { stableUuid, sha256 } from "./cases.mjs";
import { PROJECT_PREVIEW_SCHEMA, PROJECT_DEPENDENTS_SCHEMA, PROJECT_MASTER_SCHEMA,
  validateProjectDependents, validateProjectMaster } from "../../src/lib/project-flow-service.mjs";
import { validateProjectMasterV3 } from "../../src/lib/planning-contract-v3.mjs";

const nested = (schema) => {
  const { id: ignored, ...body } = schema;
  void ignored;
  return body;
};

/** One Sol/medium call, same generated content dimensions as the three-step arm. IDs are assigned by code. */
export const INTEGRAL_PROJECT_SCHEMA = {
  id: "project_master_integral_f2_v1", type: "object", additionalProperties: false,
  required: ["preview", "dependents", "master"], properties: {
    preview: nested(PROJECT_PREVIEW_SCHEMA), dependents: nested(PROJECT_DEPENDENTS_SCHEMA),
    master: nested(PROJECT_MASTER_SCHEMA),
  },
};

/** Both arms go through this identical deterministic projection and semantic gate. */
export function normalizeProjectOutput(caseRow, generated, { kbVersion, calendarHash, inputHash }) {
  const decisions = caseRow.teacher_decisions;
  const dependents = validateProjectDependents(generated?.dependents, decisions.competency_ids);
  const master = validateProjectMaster(generated?.master, decisions, dependents, caseRow.dates);
  if (!generated?.preview || typeof generated.preview.context_summary !== "string" ||
      generated.preview.context_summary.trim().length === 0 ||
      !Array.isArray(generated.preview.purpose_options) || generated.preview.purpose_options.length < 2)
    throw new Error("Preview missing from Project Master comparison.");
  const criteria = dependents.general_criteria.map((item) => ({
    criterion_id: stableUuid(`${caseRow.id}:criterion:${item.competency_id}`),
    competency_id: item.competency_id, text: item.criterion,
  }));
  const criterionByCompetency = new Map(criteria.map((item) => [item.competency_id, item.criterion_id]));
  const output = {
    contract_version: "project-master-v3", id: stableUuid(`${caseRow.id}:project`), version: 1,
    source: { ...caseRow.source }, calendar_fingerprint: calendarHash,
    kb_version: kbVersion, source_fingerprint: inputHash,
    starting_point: { proposal: caseRow.annual_proposal, teacher_context: decisions.additional_context,
      preview: generated.preview.context_summary },
    purpose: decisions.purpose, competency_ids: [...decisions.competency_ids],
    guiding_questions: [...dependents.guiding_questions], criteria,
    expected_evidence: dependents.general_criteria.flatMap((item) => item.expected_evidence.map((description) => ({
      evidence_id: stableUuid(`${caseRow.id}:evidence:${item.competency_id}:${description}`),
      criterion_id: criterionByCompetency.get(item.competency_id), description,
    }))),
    progression: [...dependents.journey],
    mediation: master.activities.map((row) => ({ date: row.date, guidance: row.mediation_notes })),
    resources: master.resources, foundation: master.foundation,
    closing: { description: master.closing_description, rationale: master.closing_rationale },
    teacher_overrides: [],
    activity_map: [...master.activities].sort((a, b) => a.date.localeCompare(b.date)).map((row, index) => ({
      blueprint_id: stableUuid(`${caseRow.id}:blueprint:${row.date}`), position: index + 1,
      date: row.date, title: row.title, purpose: row.purpose,
      competency_id: row.criterion_competency_id, competency_ids: [...row.competency_ids],
      criterion_refs: [criterionByCompetency.get(row.criterion_competency_id)],
      criterion_text: row.criterion_text, expected_evidence: [row.expected_evidence],
      resource_refs: [...row.materials], mediation: row.mediation_notes,
      progression: row.expected_progression, role: row.role_in_project,
    })),
  };
  validateProjectMasterV3(output, { instructionalDates: caseRow.dates,
    allowedCompetencyIds: decisions.competency_ids });
  for (const row of output.activity_map) {
    if (!row.criterion_refs.every((ref) => output.criteria.some((criterion) =>
      criterion.criterion_id === ref && row.competency_ids.includes(criterion.competency_id))))
      throw new Error("Criterion reference not aligned with activity competencies.");
  }
  return { output, output_hash: sha256(output) };
}
