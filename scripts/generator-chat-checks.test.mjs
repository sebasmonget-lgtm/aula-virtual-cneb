import test from 'node:test';
import assert from 'node:assert/strict';
import {generatorChatChecks} from './generator-chat-checks.mjs';

test('detecta el problema histórico y cuestionarios ocultos en sugerencias',()=>{
 const bad=generatorChatChecks({text:'La información diagnóstica sigue pendiente. ¿Qué observaste? ¿Qué niveles tienen?',suggestions:['¿Puedes enviar el diagnóstico?']});
 assert.equal(bad.noDiagnosisRequest,false);assert.equal(bad.atMostOneQuestion,false);assert.equal(bad.suggestionsAreAnswers,false);
});
test('permite aclarar que no necesita diagnóstico y comprueba la salida voluntaria',()=>{
 const good=generatorChatChecks({text:'No necesitas diagnóstico. Usaremos tu patio y cuentos para comenzar por la adaptación. Pulsa Crear Mi año para revisar la propuesta.',suggestions:[]},{closing:true});
 assert.ok(Object.values(good).every(Boolean));
 const continued=generatorChatChecks({text:'¿Qué materiales puedes conseguir?',suggestions:['No lo sé']},{closing:true});assert.equal(continued.respectsClosing,false);
});
