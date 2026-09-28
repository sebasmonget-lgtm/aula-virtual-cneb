import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const local = path.join(root, '.local/qa/end-to-end-audit-2026');
const child = spawn(process.execPath, ['scripts/run-framework.mjs', 'dev', '--host', '127.0.0.1', '--port', '5175'],
  { cwd: root, windowsHide: true, env: { ...process.env, VINEXT_NO_DEV_LOCK: '1',
    NEXT_PUBLIC_AYNI_API_URL: 'http://127.0.0.1:8790', NEXT_PUBLIC_LOCAL_DATABASE_URL: 'http://127.0.0.1:8790',
    WRANGLER_REGISTRY_PATH: path.join(local, 'wrangler-registry'),
    MINIFLARE_REGISTRY_PATH: path.join(local, 'miniflare-registry'), CLOUDFLARE_CF_FETCH_ENABLED: 'false' } });
child.stdout.pipe(createWriteStream(path.join(local, 'web-retry.out.log'), { flags: 'a' }));
child.stderr.pipe(createWriteStream(path.join(local, 'web-retry.err.log'), { flags: 'a' }));
await writeFile(path.join(root, 'docs/qa/end-to-end-audit-2026/environment-web.json'),
  JSON.stringify({ at: new Date().toISOString(), launcherPid: process.pid, webPid: child.pid, webPort: 5175 }, null, 2));
