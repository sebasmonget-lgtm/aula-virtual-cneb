import test from 'node:test';
import assert from 'node:assert/strict';
import {completeContextSources} from './annual-context-sources.mjs';
import {mergeAnnualContextDraft} from './annual-context-draft.mjs';

test('six teacher turns survive a partial extraction and late input after ready',()=>{
  const texts=['Tenemos bloques.','No tenemos agua corriente.','Quiero invitar a las familias.','Podemos usar cajas.','Hay un parque cercano.','Además quiero una biblioteca viajera.'];
  const items=texts.slice(0,4).map((text,source_turn)=>({text,source_turn,support_text:text}));
  const result=completeContextSources(items,texts);
  assert.deepEqual(result.map(item=>item.text),texts);
  assert.ok(result.every(item=>texts[item.source_turn].includes(item.support_text)));
  const draft={value:{contextItems:[],historicalProjects:[]},importedTurns:[]};
  assert.deepEqual(mergeAnnualContextDraft(draft,result).value.contextItems.map(item=>item.text),texts);
});
test('teacher removals are not restored and long omitted text stays verbatim',()=>{
  const text='Una idea '.repeat(90);
  const result=completeContextSources([],['Decisión que retiró la profesora',text],[0]);
  assert.equal(result.map(item=>item.text).join(''),text);
  assert.ok(result.every(item=>item.source_turn===1&&item.text.length<=500));
});
