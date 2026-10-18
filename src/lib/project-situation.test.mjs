import test from 'node:test';
import assert from 'node:assert/strict';
import {projectSituation} from './project-situation.mjs';
import {confirmedProjectFoundation} from './direct-ai-context-contracts.mjs';
import {generateProjectFormal} from './project-flow-service.mjs';

test('situación canónica llega al contexto diario y prevalece en el lector',()=>{
  const details={project_master:{meaningful_situation:'Situación confirmada'},formal_content:{situation:'Versión formal anterior'},decisions:{context_summary:'Contexto inicial'}};
  assert.equal(projectSituation(details),'Situación confirmada');
  assert.equal(confirmedProjectFoundation({details}).project_master.meaningful_situation,'Situación confirmada');
});

test('proyectos históricos muestran solo su contexto guardado, sin completarlo ni reescribirlo',async()=>{
  const legacy={decisions:{context_summary:'La profesora propone explorar las semillas.'},project_master:{foundation:'Explorar y conversar.'}};
  const before=structuredClone(legacy);
  assert.equal(projectSituation(legacy),legacy.decisions.context_summary);
  assert.equal(projectSituation({formal_content:{situation:'Texto formal conservado'},starting_point:'Punto inicial'}),'Texto formal conservado');
  assert.equal(projectSituation({}),'');
  const formal=await generateProjectFormal({context:{modern:true,confirmed_project_master:legacy},createProvider:()=>{throw Error('No debe generar ni facturar');}});
  assert.equal(formal.output.situation,legacy.decisions.context_summary);
  assert.equal(formal.metadata.provider_calls,0);
  assert.deepEqual(legacy,before);
});
