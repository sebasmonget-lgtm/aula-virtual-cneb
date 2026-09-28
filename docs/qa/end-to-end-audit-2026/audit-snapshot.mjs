// Solo lecturas de reconciliación después de acciones realizadas en pantalla.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const label = process.argv[2] || 'checkpoint';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Etiqueta inválida');
const root = process.cwd();
const output = path.join(root, 'docs/qa/end-to-end-audit-2026/evidencias');
await mkdir(output, { recursive: true });
const response = await fetch('http://127.0.0.1:8790/api/export');
if (!response.ok) throw new Error(`QA export: ${response.status}`);
const data = await response.json();
const teacher = 'd97b5d03-b64d-405e-9de5-ae6e407bf126';
const classroomIds = data.tables.classrooms.filter(row => row.teacher_id === teacher).map(row => row.id);
const students = data.tables.students.filter(row => classroomIds.includes(row.classroom_id));
const studentIds = students.map(row => row.id);
const counts = { profiles: data.tables.profiles.filter(row => row.user_id === teacher).length,
  classrooms: classroomIds.length, students: students.length,
  interviews: data.tables.student_family_interviews.filter(row => studentIds.includes(row.student_id)).length,
  guided: data.tables.diagnostic_experience_observations.filter(row => studentIds.includes(row.student_id)).length,
  spontaneous: data.tables.diagnostic_spontaneous_observations.filter(row => studentIds.includes(row.student_id)).length,
  usage: data.tables.ai_usage_events.filter(row => row.teacher_id === teacher).length };
// Esta API pertenece a un directorio de datos nuevo; no contiene el aula real de la usuaria.
await writeFile(path.join(output, `${label}-qa-snapshot.json`), JSON.stringify(data, null, 2));
console.log(JSON.stringify({ label, at: data.exportedAt, counts }));
const baselineFile = path.join(output, 'user-dashboard-stable-fingerprint.json');
try {
  const current = await fetch('http://127.0.0.1:8788/api/dashboard');
  if (current.ok) {
    const dashboard = await current.json();
    // `today.now` cambia cada minuto aunque no cambie ningún dato. No es evidencia de escritura.
    const stable = { students: dashboard.students, metrics: dashboard.metrics,
      profile: dashboard.profile, activity: dashboard.activity };
    const fingerprint = createHash('sha256').update(JSON.stringify(stable)).digest('hex');
    let baseline;
    try { baseline = JSON.parse(await readFile(baselineFile, 'utf8')); } catch { /* primera lectura */ }
    if (!baseline) await writeFile(baselineFile, JSON.stringify({ at: new Date().toISOString(), fingerprint }, null, 2));
    console.log(JSON.stringify({ originalDashboardFingerprint: fingerprint, unchangedFromFirstRead: !baseline || baseline.fingerprint === fingerprint }));
  }
} catch { console.log('Original dashboard fingerprint unavailable; no writes attempted.'); }
