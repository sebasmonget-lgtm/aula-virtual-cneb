import test from 'node:test';
import assert from 'node:assert/strict';
import {activityMaterials} from './activity-materials.mjs';
import {isMaterialPlaceholder} from './annual-proposal-intent.mjs';
test('resuelve materiales incompletos exclusivamente desde recursos literales del proyecto, sin alterar los datos',()=>{
 const saved=['Papel','Soporte de registro de la docente, por definir.'];
 const project={activity_route:[{id:'a',materials:['Tarjetas de animales','Papelógrafo']}],project_master:{resources:['Plumones']}};
 assert.deepEqual(activityMaterials(saved,{route_item_id:'a'},project),{materials:['Papel','Tarjetas de animales','Papelógrafo'],source:'activity'});
 assert.deepEqual(activityMaterials(saved,{},project),{materials:['Papel','Plumones'],source:'project'});
 assert.deepEqual(activityMaterials(saved),{materials:['Papel'],source:'incomplete'});
 assert.equal(saved[1],'Soporte de registro de la docente, por definir.');
 assert.deepEqual(activityMaterials([],{},project),{materials:[],source:'activity'});
 for(const text of ['supports','undefined','Cuento por seleccionar','Recurso por definir','TBD'])assert.equal(isMaterialPlaceholder(text),true);
 assert.equal(isMaterialPlaceholder('Papel y lápices'),false);
});
