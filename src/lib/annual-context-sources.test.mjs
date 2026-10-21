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

test('app-only turns stay out of planning while omitted pedagogical decisions are preserved',()=>{
  const texts=['Tenemos bloques y cajas.','Guarda el documento y continúa.','Quiero explorar las sombras.','Descarga el informe en Word.'];
  const items=[{text:'Tenemos bloques y cajas.',source_turn:0,support_text:texts[0]}];
  const result=completeContextSources(items,texts,[],[1,3]);
  assert.deepEqual(result.map(item=>item.source_turn),[0,2]);
  assert.equal(result[1].text,texts[2]);
  assert.equal(texts.length,4,'the original conversation is not rewritten');
});

test('a mixed turn preserves its pedagogical span and an explicit child project is not banned by its title',()=>{
  const texts=['Las familias podrán contar relatos sin compras. Ahora crea Mi año.','Quiero un proyecto llamado Mi año donde cada niño elija qué contar de sí.'];
  const items=[{text:'Las familias podrán contar relatos sin compras.',source_turn:0,support_text:'Las familias podrán contar relatos sin compras.'}];
  const result=completeContextSources(items,texts);
  assert.deepEqual(result.map(item=>item.text),[items[0].text,texts[1]]);
});

test('invalid or contradictory turn exclusions fail before discarding context',()=>{
  const texts=['Hay un patio pequeño.'];
  const items=[{text:texts[0],support_text:texts[0],source_turn:0}];
  for(const invalid of [[-1],[1],[0,0],['0'],null])assert.throws(()=>completeContextSources([],texts,[],invalid),/decisiones pedagógicas/);
  assert.throws(()=>completeContextSources(items,texts,[],[0]),/decisiones pedagógicas/);
  assert.deepEqual(completeContextSources([],texts,[],[0]),[]);
});
