import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {hasConfirmedProjectSequence} from '../../src/lib/activity-version-service.mjs';
test('legacy active and archived activities protect their owned sequence without acceptance metadata',async()=>{
 const db=new PGlite();try{
  await db.exec('create table learning_experiences(id uuid primary key,classroom_id uuid);create table activities(experience_id uuid,status text);');
  const classroom=randomUUID(),foreign=randomUUID(),project=randomUUID(),draft=randomUUID();
  await db.query('insert into learning_experiences values($1,$2),($3,$2)',[project,classroom,draft]);
  await db.query("insert into activities values($1,'active'),($2,'draft')",[project,draft]);
  assert.equal(await hasConfirmedProjectSequence(db,classroom,project),true);
  assert.equal(await hasConfirmedProjectSequence(db,foreign,project),false);
  assert.equal(await hasConfirmedProjectSequence(db,classroom,draft),false);
  await db.query("update activities set status='archived' where experience_id=$1",[project]);
  assert.equal(await hasConfirmedProjectSequence(db,classroom,project),true);
  assert.equal(await hasConfirmedProjectSequence(db,classroom,null),false);
 }finally{await db.close();}
});
