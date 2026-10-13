import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {changeStudentEnrollment,inactiveStudents} from './student-enrollment.mjs';

test('retirement and recovery work with the real cloud enum and preserve ownership/history',async()=>{
  const db=await PGlite.create();
  const teacher='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const classroom='cccccccc-cccc-4ccc-8ccc-cccccccccccc',student='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  try{
    await db.exec(`create type classroom_status as enum('draft','active','archived');
      create table classrooms(id uuid primary key,teacher_id uuid,status classroom_status);
      create table students(id uuid primary key,classroom_id uuid,first_name text,last_name text,preferred_name text,status classroom_status,history jsonb);`);
    await db.query(`insert into classrooms values($1,$2,'active')`,[classroom,teacher]);
    await db.query(`insert into students values($1,$2,'Ana','Ficticia',null,'active',$3::jsonb)`,[student,classroom,JSON.stringify({note:'Original ficticio',photo:'private/fixture'})]);
    await assert.rejects(changeStudentEnrollment(db,other,student,{status:'inactive',expectedStatus:'active'}));
    await changeStudentEnrollment(db,teacher,student,{status:'inactive',expectedStatus:'active'});
    assert.equal((await db.query('select status from students where id=$1',[student])).rows[0].status,'archived');
    assert.equal((await inactiveStudents(db,teacher))[0].id,student);
    assert.deepEqual(await inactiveStudents(db,other),[]);
    await assert.rejects(changeStudentEnrollment(db,teacher,student,{status:'inactive',expectedStatus:'active'}));
    await changeStudentEnrollment(db,teacher,student,{status:'active',expectedStatus:'inactive'});
    assert.deepEqual((await db.query('select history from students where id=$1',[student])).rows[0].history,{note:'Original ficticio',photo:'private/fixture'});
    assert.deepEqual(await inactiveStudents(db,teacher),[]);
  }finally{await db.close();}
});

test('recovery still accepts historical inactive rows in the local text schema',async()=>{
  const db=await PGlite.create();
  const teacher='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',classroom='cccccccc-cccc-4ccc-8ccc-cccccccccccc',student='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  try{
    await db.exec(`create table classrooms(id uuid primary key,teacher_id uuid,status text);create table students(id uuid primary key,classroom_id uuid,first_name text,last_name text,preferred_name text,status text);`);
    await db.query(`insert into classrooms values($1,$2,'active')`,[classroom,teacher]);
    await db.query(`insert into students values($1,$2,'Ana','Ficticia',null,'inactive')`,[student,classroom]);
    assert.equal((await inactiveStudents(db,teacher)).length,1);
    await changeStudentEnrollment(db,teacher,student,{status:'active',expectedStatus:'inactive'});
    assert.equal((await db.query('select status from students where id=$1',[student])).rows[0].status,'active');
  }finally{await db.close();}
});
