import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const dataset = JSON.parse(await readFile(new URL("./six-qa-students.dataset.json", import.meta.url), "utf8"));
const base = process.env.AYNI_QA_API_URL ?? "http://127.0.0.1:8788";
const get = async (route) => {
  const response = await fetch(new URL(route, base));
  assert.equal(response.status, 200, `${route} returned HTTP ${response.status}`);
  return response.json();
};
const dashboard = await get("/api/dashboard");
assert.equal(dashboard.profile.age_years, 5);
assert.equal(dashboard.students.length, 6);
const students = new Map(dashboard.students.map((row) => [row.id, row]));
const statuses = await get("/api/diagnostics/family-interview-status");
assert.equal(statuses.students.filter((row) => row.status === "confirmed").length, 6);
const observations = (await get("/api/ordinary-observations")).observations;
assert.equal(observations.length, 24);
const queue = (await get("/api/ordinary-observations/queue")).observations;
assert.equal(queue.length, 24);
assert.ok(queue.every((row) => row.attribution_state == null));
const limaDay = (timestamp) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima",
  year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(timestamp));
const detail = [];
for (const item of dataset.students) {
  const name = `${item.firstName} ${item.lastName}`;
  const student = [...students.values()].find((row) => row.full_name === name);
  assert.ok(student, `Missing student ${name}`);
  const interview = (await get(`/api/diagnostics/students/${student.id}/family-interview`)).confirmed;
  assert.equal(interview?.status, "confirmed", `Missing confirmed interview: ${name}`);
  for (const [field, value] of Object.entries(item.interview)) {
    if (Array.isArray(value)) assert.deepEqual([...interview.details[field]].sort(), [...value].sort());
    else assert.equal(interview.details[field], value, `${name} ${field}`);
  }
  const notes = observations.filter((row) => row.student_id === student.id);
  assert.equal(notes.length, 4, `${name} observation count`);
  for (let index = 0; index < 4; index++) {
    const match = notes.find((row) => row.raw_text === item.observations[index]);
    assert.ok(match, `${name} O${index + 1} RAW not exact`);
    assert.equal(limaDay(match.occurred_at), dataset.observation_dates[index]);
    assert.ok(match.context_snapshot?.evaluation_period_id, `${name} O${index + 1} lacks period`);
    detail.push({ student: name, observation: `O${index + 1}`, date: dataset.observation_dates[index],
      period_id: match.context_snapshot.evaluation_period_id });
  }
}
const result = { dataset_id: dataset.dataset_id, classroom_id: dashboard.classroom_id,
  age_years: dashboard.profile.age_years, students: 6, confirmed_interviews: 6,
  raw_observations: 24, pending_attribution: 24, observation_dates: dataset.observation_dates,
  detail };
await writeFile(new URL("../../.local/qa-six-students/http-verification.json", import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ students: result.students, interviews: result.confirmed_interviews,
  observations: result.raw_observations, pending_attribution: result.pending_attribution }));
