import test from 'node:test';
import assert from 'node:assert/strict';
import {activityReadingStages,readingSentences} from './activity-reading-content.mjs';
test('una acción numerada ocupa un solo paso y conserva sus preguntas y continuaciones',()=>{
 const steps=['Coloca las cajas. Los niños eligen dónde ponerlas.','Pregunta: «¿Cómo lo probamos?». Recoge sus propuestas.','Prueben los pedidos.'];
 assert.deepEqual(readingSentences(steps.map((s,i)=>`${i+1}. ${s}`).join('\n')),steps);
 assert.deepEqual(readingSentences(steps.map((s,i)=>`${i+1}) ${s}`).join('\n')),steps);
 assert.deepEqual(readingSentences('Usa 1.5 litros como referencia. Luego compara.'),['Usa 1.5 litros como referencia.','Luego compara.']);
});
test('a quoted question retains its lowercase continuation in the same instruction',()=>{
  const action='Acompañar la prueba; preguntar «¿Qué piensas que podría pasar?» y escuchar sin confirmar una respuesta.';
  assert.deepEqual(readingSentences(action),[action]);
  assert.deepEqual(readingSentences(action+' Luego recoger sus ideas.'),[action,'Luego recoger sus ideas.']);
});
test('formatting retains full saved content and respects explicit activity stages',()=>{
  const value='Invita a elegir. Inicio: Miran imágenes. Pueden esperar. Desarrollo: Pregunta: «¿Qué podría pasar?». Escuchan la lectura. Cierre: Comparten una pista.';
  const result=activityReadingStages(value);
  assert.equal(result.introduction,'Invita a elegir.');
  assert.deepEqual(result.stages.map(item=>item.label),['Inicio','Desarrollo','Cierre']);
  assert.equal(result.stages.map(item=>`${item.label}: ${item.text}`).join(' '),value.slice(result.introduction.length).trim());
  for(const item of result.stages)assert.equal(readingSentences(item.text).join(' '),item.text);
  for(const legacy of ['Exploran, juegan y comparten.','Inicio: Exploran. Cierre: Comparten.','Cierre: final. Inicio: otro. Desarrollo: juego.']){
    assert.deepEqual(activityReadingStages(legacy),{introduction:'',stages:[{label:'Durante la actividad',text:legacy}]});
  }
  assert.deepEqual(readingSentences(['Agua','Papel']),['Agua','Papel']);
  assert.deepEqual(activityReadingStages(null).stages,[]);
  const plain=activityReadingStages('Exploran materiales.',{opening:'Un objeto invita a explorar.',closure:'Comparten sus ideas.'});
  assert.equal(plain.groupedContext,true);assert.deepEqual(plain.stages.map(item=>item.text),['Un objeto invita a explorar.','Exploran materiales.','Comparten sus ideas.']);
});
