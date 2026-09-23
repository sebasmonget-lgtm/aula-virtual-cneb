import test from "node:test";
import assert from "node:assert/strict";
import { recommendedStudentGuidance, studentCompetencyGuidance } from "./student-guidance.mjs";

const competency = (key, evidenceCount, extra = {}) => ({ competency_key: key, competency_v4_id: key, evidence_count: evidenceCount, teacher_confirmed_assessment: null, teacher_confirmed_conclusion: null, ...extra });

test("los registros legacy nunca ofrecen continuar en un workflow v4", () => {
  const legacy = competency("legacy:1", 8, { competency_v4_id: null });
  assert.deepEqual(studentCompetencyGuidance(legacy), { state: "legacy", label: "Registro anterior", action: null });
  assert.equal(recommendedStudentGuidance([legacy]), null);
});

test("la recomendación distingue información escasa, análisis y conclusión confirmados", () => {
  const limited = competency("a", 1);
  const ready = competency("b", 3);
  const assessed = competency("c", 3, { teacher_confirmed_assessment: { id: "assessment-1" } });
  const concluded = competency("d", 3, { teacher_confirmed_assessment: { id: "assessment-2" }, teacher_confirmed_conclusion: { id: "conclusion-1" } });
  assert.equal(studentCompetencyGuidance(limited).action, "evidence");
  assert.equal(studentCompetencyGuidance(ready).action, "assessment");
  assert.equal(studentCompetencyGuidance(assessed).action, "conclusion");
  assert.equal(studentCompetencyGuidance(concluded).action, "family_report");
  assert.equal(recommendedStudentGuidance([ready, limited, concluded, assessed]).competency.competency_key, "d");
});

test("igual contexto da la misma recomendación y sin evidencias no propone análisis", () => {
  const entries = [competency("b", 0), competency("c", 2), competency("a", 2)];
  assert.equal(studentCompetencyGuidance(entries[0]).action, null);
  assert.equal(recommendedStudentGuidance(entries).competency.competency_key, "a");
  assert.deepEqual(recommendedStudentGuidance(entries), recommendedStudentGuidance([...entries].reverse()));
});
