import test from 'node:test';
import assert from 'node:assert/strict';
import {documentFolderKind,documentsInFolder,documentFolderEntries} from './document-folder-groups.mjs';
test('four canonical folders count each document once, including project activities and standalone workshops',()=>{
  const items=[{id:'plan',kind:'annual_plan'},{id:'project',kind:'experience'},
    {id:'activity',kind:'activity',parent_experience_id:'project'},{id:'workshop',kind:'activity'},
    {id:'family',kind:'family_report'},{id:'closure',kind:'period_closure'}];
  assert.deepEqual(documentFolderEntries(items).map(item=>item.count),[0,1,3,2]);
  assert.equal(documentFolderEntries(items).reduce((sum,item)=>sum+item.count,0),items.length);
  assert.deepEqual(documentsInFolder(items,'experiences').map(item=>item.id),['project','activity','workshop']);
  for(const [old,current] of [['annual_plan','annual'],['activity','experiences'],['experience','experiences'],['family_report','evaluation'],['period_closure','evaluation']])assert.equal(documentFolderKind(old),current);
});
