import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const local = path.join(root, '.local/qa/end-to-end-audit-2026');
const child = spawn(process.execPath, ['--env-file-if-exists=experiments/jev-competency-classifier/.env.local',
  '--env-file-if-exists=.env.local', 'scripts/local-db-server.mjs'], { cwd: root, windowsHide: true,
  env: { ...process.env, AYNI_AUTH_MODE: 'local', AYNI_DB_MODE: 'local',
    AYNI_LOCAL_TEACHER_ID: 'd97b5d03-b64d-405e-9de5-ae6e407bf126',
    AYNI_LOCAL_DATA_DIR: path.join(local, 'pgdata'), AYNI_LOCAL_DB_PORT: '8790', AYNI_API_HOST: '127.0.0.1',
    AYNI_ALLOWED_ORIGIN: 'http://localhost:5175', AYNI_ALLOW_LOCAL_EXPORT: '1' } });
child.stdout.pipe(createWriteStream(path.join(local, 'api-retry.out.log'), { flags: 'a' }));
child.stderr.pipe(createWriteStream(path.join(local, 'api-retry.err.log'), { flags: 'a' }));
await writeFile(path.join(root, 'docs/qa/end-to-end-audit-2026/environment-api.json'),
  JSON.stringify({ at: new Date().toISOString(), launcherPid: process.pid, apiPid: child.pid, apiPort: 8790 }, null, 2));
