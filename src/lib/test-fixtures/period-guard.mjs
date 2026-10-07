/** Only reduced test schemas; production has these tables and private RLS. */
export async function periodGuardFixture(db,classroomId) {
  await db.exec(`create table if not exists classrooms(id uuid primary key,school_year_id uuid);
    create table if not exists evaluation_periods(id uuid primary key,school_year_id uuid,starts_on date,ends_on date);
    create table if not exists period_closures(id uuid primary key,classroom_id uuid,evaluation_period_id uuid,current_version_id uuid);
    create table if not exists period_closure_workflows(id uuid primary key,classroom_id uuid,evaluation_period_id uuid,step_state jsonb);`);
  if(!(await db.query("select id from classrooms where id=$1",[classroomId])).rows.length)
    await db.query("insert into classrooms(id,school_year_id) values($1,gen_random_uuid())",[classroomId]);
}
