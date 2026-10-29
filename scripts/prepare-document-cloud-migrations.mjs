import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

// Only prepares SQL. Connecting to a target and applying it remains an explicit
// deployment operation. Immutable hashes make a repeat safe and detect edits.
const directory='supabase/migrations';
const files=(await readdir(directory)).filter(name=>/^(?:20261022\d{4}|20261023\d{4}|202610280001|202610290001)_(?:multi_age_.+|document_generator_cloud)\.sql$/u.test(name)).sort();
if(files.length!==19)throw new Error('Revisa el conjunto explícito de migraciones de esta publicación.');
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9)??'.local/document-cloud-migrations.sql';
if(!path.resolve(output).startsWith(path.resolve('.local')+path.sep))throw new Error('El plan SQL se guarda dentro de .local.');
let sql=`begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create table if not exists public.ayni_cloud_release_migrations(version text primary key,sha256 text not null,applied_at timestamptz not null default now());
alter table public.ayni_cloud_release_migrations enable row level security;
revoke all on public.ayni_cloud_release_migrations from public,anon,authenticated;
`;
for(const name of files){
 const original=(await readFile(path.join(directory,name),'utf8')).replaceAll('\r\n','\n'),hash=createHash('sha256').update(original).digest('hex');
 const body=original.replace(/^\s*(?:begin|commit)\s*;/gimu,'');
 sql+=`\ndo $release_${hash.slice(0,10)}$ begin
 if exists(select 1 from public.ayni_cloud_release_migrations where version='${name}' and sha256<>'${hash}') then raise exception 'Una migración aplicada cambió; crea una nueva.';
 elsif not exists(select 1 from public.ayni_cloud_release_migrations where version='${name}') then
 execute $body_${hash.slice(0,10)}$${body}$body_${hash.slice(0,10)}$;
 insert into public.ayni_cloud_release_migrations(version,sha256) values('${name}','${hash}');
 end if;
end $release_${hash.slice(0,10)}$;\n`;
}
sql+=process.argv.includes('--dry-run')?"rollback;\nselect true as dry_run_rolled_back;\n":"commit;\nselect count(*)::int as migrations_recorded from public.ayni_cloud_release_migrations;\n";
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,sql);
console.log(JSON.stringify({prepared:files.length,dryRun:process.argv.includes('--dry-run'),output}));
