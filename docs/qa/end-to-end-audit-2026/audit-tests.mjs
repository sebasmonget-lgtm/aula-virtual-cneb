// Diagnóstico de pruebas existentes. No llama IA ni toca la base del recorrido QA.
import { execFileSync, spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const runLabel = process.argv[2] ?? '';
if (runLabel && !/^[a-z0-9-]+$/.test(runLabel)) throw new Error('Etiqueta de validación inválida');
const output = path.resolve(`docs/qa/end-to-end-audit-2026/evidencias/tests${runLabel ? `-${runLabel}` : ''}`);
await mkdir(output, { recursive: true });
const environment = { ...process.env };
for (const key of Object.keys(environment)) if (/API_KEY|TOKEN|DATABASE_URL|SUPABASE|AYNI_/i.test(key)) delete environment[key];
const discovered = execFileSync('rg', ['--files', 'src', 'scripts'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(file => /\.test\.mjs$/.test(file));
const requested = process.argv.slice(3).map(file => file.replaceAll('\\', '/'));
if (requested.some(file => !discovered.some(found => found.replaceAll('\\', '/') === file))) throw new Error('Prueba desconocida');
const files = requested.length ? requested : discovered;
const commands = [
  { name: 'typecheck', args: ['node_modules/typescript/bin/tsc', '--noEmit'] },
  { name: 'unit-tests', args: ['--test', '--test-concurrency=2', ...files] },
  { name: 'lint', args: ['node_modules/eslint/bin/eslint.js', '.', '--ignore-pattern', 'dist', '--ignore-pattern', '.next'] },
  { name: 'build', args: ['scripts/run-framework.mjs', 'build'] },
];
const results = [];
for (const command of commands) {
  const startedAt = new Date().toISOString();
  console.log(`START ${command.name}`);
  let log = '';
  const child = spawn(process.execPath, command.args, { env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => { log += chunk.toString(); });
  child.stderr.on('data', chunk => { log += chunk.toString(); });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  await writeFile(path.join(output, `${command.name}.log`), log);
  const counters = command.name === 'unit-tests' ? Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].map(name => [name, Number(log.match(new RegExp(`(?:#|ℹ) ${name} (\\d+)`))?.[1] ?? 0)])) : null;
  const result = { name: command.name, command: ['node', ...command.args], startedAt, endedAt: new Date().toISOString(), exitCode: code, counters };
  results.push(result);
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ name: command.name, exitCode: code, counters }));
}
console.log(JSON.stringify({ complete: true, testFiles: files.length }));
