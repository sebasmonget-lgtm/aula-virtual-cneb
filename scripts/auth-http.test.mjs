import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const teacherA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const teacherB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startAyni(port, dataDir, overrides) {
  const child = spawn(process.execPath, ["scripts/local-db-server.mjs"], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, AYNI_LOCAL_DB_PORT: String(port), AYNI_LOCAL_DATA_DIR: dataDir, ...overrides },
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += String(chunk); });
  child.stderr.on("data", (chunk) => { output += String(chunk); });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`Ayni exited early: ${output.slice(-1500)}`);
    try { if ((await fetch(`${base}/health`)).ok) return { child, base }; }
    catch { /* Startup is still applying local migrations. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  child.kill("SIGTERM");
  throw new Error(`Ayni did not start: ${output.slice(-1500)}`);
}

async function stopAyni(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill("SIGTERM");
    setTimeout(() => { if (child.exitCode === null) child.kill("SIGKILL"); }, 5000).unref();
  });
}

test("the HTTP boundary protects every route and local PGlite remains usable", { timeout: 90000 }, async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "ayni-auth-"));
  const dataDir = path.join(temp, "pgdata");
  const authServer = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/auth/v1/user") {
      const id = request.headers.authorization === "Bearer token-a" ? teacherA
        : request.headers.authorization === "Bearer token-b" ? teacherB : null;
      response.writeHead(id ? 200 : 401);
      response.end(JSON.stringify(id ? { id, role: "authenticated" } : { error: "invalid_token" }));
      return;
    }
    if (request.url === "/auth/v1/token?grant_type=password") {
      let raw = "";
      for await (const chunk of request) raw += chunk;
      const value = JSON.parse(raw);
      const valid = value.email === "a@example.test" && value.password === "correcta";
      response.writeHead(valid ? 200 : 401);
      response.end(JSON.stringify(valid ? { access_token: "token-a", expires_in: 3600 } : { error: "invalid_grant" }));
      return;
    }
    response.writeHead(204); response.end();
  });
  await new Promise((resolve) => authServer.listen(0, "127.0.0.1", resolve));
  const authPort = authServer.address().port;
  let running;
  try {
    const port = await freePort();
    running = await startAyni(port, dataDir, {
      AYNI_AUTH_MODE: "supabase",
      AYNI_DB_MODE: "local", NODE_ENV: "test", AYNI_TEST_AUTH_PGLITE: "1",
      AYNI_SUPABASE_URL: `http://127.0.0.1:${authPort}`,
      AYNI_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
      AYNI_AUTH_COOKIE_SECURE: "0",
      AYNI_ALLOWED_ORIGIN: "http://localhost:5173",
      AYNI_LOCAL_TEACHER_ID: "ignored-in-auth-mode",
    });
    const call = async (pathname, token, init = {}) => fetch(`${running.base}${pathname}`, {
      ...init, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
    const privateRoutes = [
      "/api/pilot/setup", "/api/profile", "/api/diagnostics",
      "/api/diagnostics/students/11111111-1111-4111-8111-111111111111/family-interview",
      "/api/diagnostics/students/11111111-1111-4111-8111-111111111111/family-interview/attachment",
      "/api/diagnostics/spontaneous-observations", "/api/ai/annual-plan/context",
      "/api/annual-plans/current", "/api/learning-experiences", "/api/activities",
      "/api/activity-criteria", "/api/evidences", "/api/assessments",
      "/api/period-evaluations/years", "/api/family-reports",
      "/api/period-evaluations/coverage", "/api/documents",
      "/api/library/resources", "/api/library/resources/taller-04-grafico-plastico-colores-que-cambian/download",
      "/api/documents/family_report/11111111-1111-4111-8111-111111111111/download",
    ];
    for (const route of privateRoutes) assert.equal((await call(route)).status, 401, route);
    assert.equal((await call("/api/pilot/setup")).status, 401);
    assert.equal((await call("/api/pilot/setup", "invalid")).status, 401);
    assert.equal((await call("/api/pilot/setup", "expired")).status, 401);
    assert.equal((await call("/api/documents/family_report/11111111-1111-4111-8111-111111111111/download")).status, 401);
    const login = await call("/api/auth/login", null, {
      method: "POST", headers: { origin: "http://localhost:5173", "content-type": "application/json" },
      body: JSON.stringify({ email: "a@example.test", password: "correcta" }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert(cookie?.startsWith("ayni_session="));
    assert.equal((await call("/api/auth/session", null, { headers: { cookie } })).status, 200);
    assert.equal((await call("/api/pilot/setup", null, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{}" })).status, 403);
    for (const [token, label] of [["token-a", "A"], ["token-b", "B"]]) {
      const setup = await call("/api/pilot/setup", token, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ teacherName: `Docente ${label}`, institutionName: `Jardín ${label}`,
          section: label, age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-31",
          castellanoL2Applicable: false, religionApplicable: false }),
      });
      assert.equal(setup.status, 201, `setup ${label}: ${await setup.text()}`);
    }
    const contextA = await (await call("/api/ai/annual-plan/context", "token-a")).json();
    const contextB = await (await call("/api/ai/annual-plan/context", "token-b")).json();
    assert(contextA.id && contextB.id && contextA.id !== contextB.id);
    const library = await (await call("/api/library/resources", "token-a")).json();
    assert.equal(library.resources.length, 7);
    assert(library.resources.every((resource) => !("download" in resource)));
    const workshopWord = await call("/api/library/resources/taller-04-grafico-plastico-colores-que-cambian/download", "token-a");
    assert.equal(workshopWord.status, 200);
    assert.equal(Buffer.from(await workshopWord.arrayBuffer()).subarray(0, 2).toString(), "PK");
    assert.equal((await call("/api/library/resources/unknown/download", "token-a")).status, 404);
    assert.equal((await call("/api/library/resources/taller-04-grafico-plastico-colores-que-cambian/save-local", "token-a", { method: "POST" })).status, 404);
    assert.equal((await call("/api/library/resources/taller-04-grafico-plastico-colores-que-cambian/save-local", null, { method: "POST" })).status, 401);
    assert.equal((await call(`/api/ai/annual-plan/context?classroomId=${contextA.id}`, "token-a")).status, 200);
    assert.equal((await call(`/api/ai/annual-plan/context?classroomId=${contextB.id}`, "token-a")).status, 403);
    const imported = await call("/api/students/import", "token-b", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ students: [{ firstName: "Alumna", lastName: "Ficticia" }] }),
    });
    assert.equal(imported.status, 201);
    const studentB = (await imported.json()).dashboard.students[0].id;
    const studentCard = (await (await call("/api/dashboard", "token-b")).json()).students[0];
    assert.equal(studentCard.full_name, "Alumna Ficticia");
    assert.equal(studentCard.evidence_count, 0);
    assert.equal((await call(`/api/students/${studentB}`, "token-a")).status, 404);
    assert.equal((await call(`/api/students/${studentB}`, "token-b")).status, 200);
    assert.equal((await call("/api/diagnostics/spontaneous-observations", "token-a", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId: studentB, teacherId: teacherA, contextLabel: "Juego", observationText: "Nota ficticia" }),
    })).status, 404);
    assert.equal((await call(`/api/documents/family_report/${studentB}/download`, "token-a")).status, 404);
    assert.equal((await call("/api/documents", "expired")).status, 401);
    await stopAyni(running.child);
    running = null;
    const seeded = await PGlite.create(dataDir);
    const diagnosticId = "99999999-9999-4999-8999-999999999999";
    try {
      await seeded.query(`insert into diagnostic_group_reviews
        (id,classroom_id,version,status,details,source_snapshot,created_by,teacher_confirmed_at)
        values ($1,$2,1,'confirmed',$3::jsonb,'{}'::jsonb,$4,now())`,
      [diagnosticId, contextA.id, JSON.stringify({ strengths: "El grupo participa en juegos compartidos.",
        needs: "Ofrecer más oportunidades para comparar cantidades.",
        planning_priorities: "Organizar juegos de conteo y conversación." }), teacherA]);
    } finally { await seeded.close(); }
    running = await startAyni(await freePort(), dataDir, {
      AYNI_AUTH_MODE: "supabase", AYNI_DB_MODE: "local", NODE_ENV: "test", AYNI_TEST_AUTH_PGLITE: "1",
      AYNI_SUPABASE_URL: `http://127.0.0.1:${authPort}`,
      AYNI_SUPABASE_PUBLISHABLE_KEY: "public-test-key", AYNI_ALLOWED_ORIGIN: "http://localhost:5173",
      AYNI_AUTH_COOKIE_SECURE: "0",
    });
    const ownDownload = await fetch(`${running.base}/api/documents/diagnostic_summary/${diagnosticId}/download`, {
      headers: { authorization: "Bearer token-a" },
    });
    assert.equal(ownDownload.status, 200);
    assert.match(ownDownload.headers.get("content-type") ?? "", /wordprocessingml\.document/);
    assert.equal(Buffer.from(await ownDownload.arrayBuffer()).subarray(0, 2).toString(), "PK");
    assert.equal((await fetch(`${running.base}/api/documents/diagnostic_summary/${diagnosticId}/download`, {
      headers: { authorization: "Bearer token-b" },
    })).status, 404);
    assert.equal((await fetch(`${running.base}/api/documents/diagnostic_summary/${diagnosticId}/download`)).status, 401);
    assert.equal((await fetch(`${running.base}/api/documents/diagnostic_summary/${diagnosticId}/save-local`, {
      method: "POST", headers: { authorization: "Bearer token-a" },
    })).status, 404);
    await stopAyni(running.child);
    running = null;
    const local = await startAyni(await freePort(), dataDir, { AYNI_AUTH_MODE: "local", AYNI_LOCAL_TEACHER_ID: teacherA });
    running = local;
    assert.equal((await fetch(`${local.base}/api/pilot/setup`)).status, 200);
  } finally {
    if (running) await stopAyni(running.child);
    await new Promise((resolve) => authServer.close(resolve));
    const resolved = path.resolve(temp);
    if (resolved.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(resolved).startsWith("ayni-auth-")) {
      await rm(resolved, { recursive: true, force: true });
    }
  }
});
