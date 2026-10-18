import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadKnowledgeBaseV4 } from './knowledge-base-v4.mjs';
import { validateDiagnosticCatalog } from './diagnostic-catalog-v4.mjs';
import { buildDiagnosticExperienceCatalog } from './diagnostic-experiences-v4.mjs';
import { cardIsApplicable } from './ai-context-builder-v4.mjs';
import { guidedObservationLookFor } from './diagnostic-ui-flow.mjs';

const document = JSON.parse(await readFile(new URL('../../knowledge/diagnostic-experiences/catalog.json', import.meta.url), 'utf8'));
const kb = await loadKnowledgeBaseV4();

test('all applicable editorial moments use authored guidance and the age-specific curricular reference', () => {
  for (const age of [3, 4, 5]) {
    for (const experience of buildDiagnosticExperienceCatalog(kb, { age, castellanoL2Applicable: true, religionApplicable: true })) {
      const source = document.experiences.find(row => row.id === experience.id);
      assert.equal(experience.age_support, source.age_support[age]);
      for (const aspect of experience.aspects) {
        const original = source.aspects.find(row => row.id === aspect.id);
        const card = kb.competencyCards.find(row => row.id === aspect.competency_id);
        const index = original.patternIndexByAge?.[age] ?? original.patternIndex;
        assert.equal(aspect.age_reference, card.ages[age].observable_patterns[index]);
        const block = experience.pedagogical_blocks.find(row => row.id === aspect.id);
        assert.equal(block.instruction, original.teacher_steps.join('\n'));
        assert.equal(block.observations[0].criterion, original.prompt);
        assert.equal(guidedObservationLookFor(aspect), original.look_for);
        assert.equal(new Set([original.prompt, original.look_for, ...original.examples]).size, original.examples.length + 2);
      }
    }
  }
});

test('el conjunto diagnóstico ofrece oportunidades para todas las competencias aplicables, sin exigirlas en cada actividad',()=>{
  for(const age of [3,4,5])for(const castellanoL2Applicable of [false,true])for(const religionApplicable of [false,true]){
    const options={age,castellanoL2Applicable,religionApplicable};
    const experiences=buildDiagnosticExperienceCatalog(kb,options),covered=new Set(experiences.flatMap(row=>row.competencies.map(card=>card.id)));
    const expected=kb.competencyCards.filter(card=>card.runtime_selectable_by_age?.[String(age)]&&cardIsApplicable(card,options)).map(card=>card.id);
    assert.deepEqual([...covered].sort(),expected.sort(),`cobertura edad ${age}, L2 ${castellanoL2Applicable}, religión ${religionApplicable}`);
    assert.ok(experiences.every(row=>row.competencies.length<covered.size));
  }
});

test('TIC diagnóstica solo a los cinco años, con condición explícita de recursos y cuidado; autonomía no depende de pantallas',()=>{
  const experiences=buildDiagnosticExperienceCatalog(kb,{age:5}),digital=experiences.find(row=>row.id==='create_a_digital_message');
  assert.equal(digital.required_resource,'digital_creation');assert.match(digital.teacher_instructions,/Solo si dispones/);
  assert.match(digital.teacher_instructions,/sin conexión/);assert.match(digital.teacher_instructions,/no se usan cuentas, internet ni imágenes de personas/);
  assert.ok(experiences.some(row=>row.id==='plan_try_review'));
  for(const age of [3,4])assert.equal(buildDiagnosticExperienceCatalog(kb,{age}).some(row=>row.competencies.some(card=>card.id.startsWith('TRANS_'))),false);
});

test('stories place reading and oral sharing before optional writing, with no writing criterion for age three', () => {
  const story = age => buildDiagnosticExperienceCatalog(kb, { age }).find(row => row.id === 'stories_and_marks');
  assert.deepEqual(story(3).aspects.map(row => row.id), ['reading', 'retelling']);
  assert.deepEqual(story(5).aspects.map(row => row.id), ['reading', 'retelling', 'write_message', 'read_own_message']);
  assert.match(story(3).teacher_instructions, /sin atribuirla a escritura/);
  for (const age of [4, 5]) {
    const writing = story(age).aspects.find(row => row.id === 'write_message');
    assert.match(writing.prompt, /mensaje.*para alguien/);
    assert.match(writing.look_for, /por sí solo no acredita escritura/);
    assert.doesNotMatch(writing.examples.join(' '), /Dibuja un personaje/);
  }
});

test('the catalogue rejects broken age overrides and malformed authored instructions', () => {
  const invalidReference = structuredClone(document);
  invalidReference.experiences[0].aspects[0].patternIndexByAge = { 3: 999 };
  assert.throws(() => validateDiagnosticCatalog(invalidReference, kb.competencyCards), /Referente ausente/);
  const invalidGuidance = structuredClone(document);
  invalidGuidance.experiences[0].aspects[0].teacher_steps = ['Una misma instrucción', 'Una misma instrucción'];
  assert.throws(() => validateDiagnosticCatalog(invalidGuidance, kb.competencyCards), /Guía editorial/);
});

test('legacy criteria without editorial cues keep a neutral fallback rather than manufactured examples', () => {
  const old = { id: 'reading', prompt: 'Criterio guardado', examples: ['Señala una imagen.', 'Cuenta algo.'] };
  const saved = structuredClone(old);
  assert.doesNotMatch(guidedObservationLookFor(old), /Señala una imagen|Cuenta algo/);
  assert.deepEqual(old, saved);
});
