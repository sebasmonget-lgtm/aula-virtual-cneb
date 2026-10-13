import test from "node:test";
import assert from "node:assert/strict";
import { mergeAnnualContextDraft, validateAnnualContextDraft, currentAnnualConversation } from "./annual-context-draft.mjs";

test('a delayed chat read cannot roll back the revision saved by context editing',()=>{
 const saved={id:'current',revision:9,status:'ready'};
 assert.equal(currentAnnualConversation(saved,{id:'current',revision:7,status:'ready'}),saved);
 assert.equal(currentAnnualConversation(saved,{...saved}),saved);
 assert.equal(currentAnnualConversation(saved,{id:'current',revision:10,status:'responding'}).revision,10);
 assert.equal(currentAnnualConversation(saved,{id:'new',revision:1,status:'ready'}).id,'new');
});

test("new chat decisions survive manual edits and removed decisions stay removed", () => {
  const first = mergeAnnualContextDraft({ value: { contextItems: [], historicalProjects: [] }, importedTurns: [] },
    [{ text: "Tenemos patio", source_turn: 0 }, { text: "Visita", source_turn: 0 }]);
  first.value.contextItems = [{ text: "Patio pequeño, sin huerto", source_turn: 0 }, { text: "Solo materiales del aula" }];
  first.value.historicalProjects = [{ title: "Familia", competency_ids: [] }];
  const next = mergeAnnualContextDraft(first, [{ text: "Hay un patio", source_turn: 0 }, { text: "Visita", source_turn: 0 },
    { text: "Cierre con familias", source_turn: 1 }]);
  assert.deepEqual(next.value.contextItems.map(item => item.text), ["Patio pequeño, sin huerto", "Solo materiales del aula", "Cierre con familias"]);
  assert.deepEqual(next.value.historicalProjects, first.value.historicalProjects);
  assert.deepEqual(mergeAnnualContextDraft(next, [{ text: "Otro cierre", source_turn: 1 }]), next);
});

test("unfinished private drafts are recoverable; foreign curriculum and oversized drafts fail", () => {
  const draft = { value: { contextItems: [{ text: "" }], historicalProjects: [{ title: "", competency_ids: [] }] }, importedTurns: [] };
  assert.equal(validateAnnualContextDraft(draft, [{ id: "COM_ORAL" }], 0).value.contextItems[0].text, "");
  assert.throws(() => validateAnnualContextDraft({ ...draft, importedTurns: [0] }, [], 0));
  assert.throws(() => validateAnnualContextDraft({ ...draft, value: { ...draft.value, historicalProjects: [{ title: "Familia", competency_ids: ["AJENA"] }] } }, [], 0));
  assert.throws(() => validateAnnualContextDraft({ ...draft, value: { ...draft.value, contextItems: Array.from({ length: 5 }, () => ({ text: "a".repeat(500) })) } }, [], 0));
});
