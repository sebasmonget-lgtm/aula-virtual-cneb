import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const local = path.join(root, "local-db", "migrations");
const remote = path.join(root, "supabase", "migrations");

async function apply(db, directory, skip = () => false) {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".sql") && !skip(name)).sort();
  for (const name of names) {
    const sql = (await readFile(path.join(directory, name), "utf8"))
      .replace(/create extension if not exists pgcrypto;/gi, "");
    try { await db.exec(sql); }
    catch (error) { throw new Error(`${name}: ${error.message}`); }
  }
  return names.length;
}

async function columns(db) {
  const rows = (await db.query(`select table_name,column_name from information_schema.columns
    where table_schema='public' and table_name not like 'local_schema_%'
    order by table_name,column_name`)).rows;
  const names = new Map();
  for (const row of rows) {
    if (!names.has(row.table_name)) names.set(row.table_name, new Set());
    names.get(row.table_name).add(row.column_name);
  }
  return names;
}

test("fresh Supabase migrations retain the service-facing local table and column contract", { timeout: 90000 }, async () => {
  const localDb = new PGlite();
  const stagingDb = new PGlite();
  try {
    await apply(localDb, local);
    await stagingDb.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      create function storage.foldername(p text) returns text[] language sql immutable as $$ select string_to_array(p,'/') $$;
    `);
    await apply(stagingDb, remote);
    const rawSecurity = (await stagingDb.query(`select c.relrowsecurity as rls,
      has_table_privilege('authenticated','public.ordinary_observations','INSERT') as teacher_insert,
      has_table_privilege('authenticated','public.ordinary_observations','SELECT') as teacher_select
      from pg_class c where c.oid='public.ordinary_observations'::regclass`)).rows[0];
    assert.deepEqual(rawSecurity, { rls: true, teacher_insert: false, teacher_select: true });
    const revisionsSecurity = (await stagingDb.query(`select c.relrowsecurity as rls,
      has_table_privilege('authenticated','public.ordinary_observation_revisions','UPDATE') as teacher_update
      from pg_class c where c.oid='public.ordinary_observation_revisions'::regclass`)).rows[0];
    assert.deepEqual(revisionsSecurity, { rls: true, teacher_update: false });
    const personalizationSecurity = (await stagingDb.query(`select c.relrowsecurity as rls,
      has_table_privilege('authenticated','public.annual_personalization_reviews','SELECT') as teacher_select,
      has_table_privilege('authenticated','public.annual_personalization_reviews','INSERT') as teacher_insert,
      has_table_privilege('authenticated','public.annual_personalization_reviews','UPDATE') as teacher_update
      from pg_class c where c.oid='public.annual_personalization_reviews'::regclass`)).rows[0];
    assert.deepEqual(personalizationSecurity, { rls: true, teacher_select: true,
      teacher_insert: false, teacher_update: false });
    assert.equal((await stagingDb.query("select public from storage.buckets where id='ayni-observation-media'")).rows[0]?.public, false);
    const localColumns = await columns(localDb);
    const stagingColumns = await columns(stagingDb);
    const differences = [];
    for (const [table, expected] of localColumns) {
      const actual = stagingColumns.get(table);
      if (!actual) { differences.push(`${table}: tabla ausente`); continue; }
      for (const column of expected) if (!actual.has(column)) differences.push(`${table}.${column}: columna ausente`);
    }
    assert.deepEqual(differences, []);
  } finally {
    await Promise.all([localDb.close(), stagingDb.close()]);
  }
});
