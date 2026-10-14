import test from 'node:test';
import assert from 'node:assert/strict';
import {projectSequenceAccess} from './simple-project-flow.mjs';

test('una actividad futura con registros sigue disponible al abrir el proyecto confirmado',()=>{
 const activity={id:'observed-activity',date:'2026-10-20'};
 assert.deepEqual(projectSequenceAccess(activity,{editable:false,protectedIds:[activity.id],today:'2026-10-13'}),{canEdit:false,canOpen:true});
 assert.deepEqual(projectSequenceAccess(activity,{editable:true,protectedIds:[activity.id],today:'2026-10-13'}),{canEdit:false,canOpen:false});
});
test('el día actual se puede revisar; el pasado conserva su protección',()=>{
 const options={editable:true,protectedIds:[],today:'2026-10-13'};
 assert.equal(projectSequenceAccess({id:'today',date:options.today},options).canEdit,true);
 assert.equal(projectSequenceAccess({id:'past',date:'2026-10-12'},options).canEdit,false);
 assert.equal(projectSequenceAccess({id:'past',date:'2026-10-12'},{...options,editable:false}).canOpen,false);
});
