const $ = (id) => document.getElementById(id);
const data = await (await fetch("/current-dev-proposal.json", { cache: "no-store" })).json();
const storageKey = "ayni-current-dev-human-review-" + data.version;
let state;
try { state = JSON.parse(localStorage.getItem(storageKey)); } catch { state = null; }
function compatibleDraft(value) {
  return value?.version === data.version && typeof value.reviewer === 'string' && data.cases.every((item) => {
    const label = value.labels?.[item.id];
    return label && ['pending', 'classify', 'abstain', 'privacy'].includes(label.decision) && typeof label.primary === 'string' &&
      typeof label.notes === 'string' && typeof label.reviewed === 'boolean' &&
      ['acceptable', 'secondary'].every((key) => Array.isArray(label[key]) && label[key].every((id) => data.competencies.some((competency) => competency.id === id)));
  });
}
if (!compatibleDraft(state)) state = { version: data.version, reviewer: "", index: 0,
  labels: Object.fromEntries(data.cases.map((item) => [item.id, { decision: "pending", primary: "", acceptable: [], secondary: [], notes: "", reviewed: false }])) };
let exported = null;
state.index = Math.max(0, Math.min(data.cases.length - 1, Number(state.index) || 0));
$('reviewer').value = state.reviewer;
for (const [index, item] of data.cases.entries()) $('case-number').add(new Option(item.id, String(index)));
$('primary').add(new Option("Elegir principal…", ""));
for (const item of data.competencies) $('primary').add(new Option(item.name, item.id));
for (const container of ['acceptable', 'secondary']) for (const item of data.competencies) {
  const label = document.createElement('label'), checkbox = document.createElement('input');
  checkbox.type = 'checkbox'; checkbox.value = item.id; checkbox.dataset.container = container;
  label.append(checkbox, document.createTextNode(' ' + item.name)); $(container).append(label);
  checkbox.addEventListener('change', capture);
}
function current() { return state.labels[data.cases[state.index].id]; }
function valid(label) {
  return ['abstain', 'privacy'].includes(label.decision) || (label.decision === 'classify' &&
    data.competencies.some((item) => item.id === label.primary) && !label.secondary.includes(label.primary) &&
    [...label.acceptable, ...label.secondary].every((id) => data.competencies.some((item) => item.id === id)));
}
function save() {
  state.reviewer = $('reviewer').value.trim(); localStorage.setItem(storageKey, JSON.stringify(state)); exported = null;
  const complete = data.cases.filter((item) => state.labels[item.id]?.reviewed && valid(state.labels[item.id])).length;
  $('progress').textContent = `${complete} / ${data.cases.length} casos revisados`;
  $('export-data').disabled = $('export-manifest').disabled = complete !== data.cases.length || !state.reviewer;
}
function capture() {
  const label = current(); label.decision = $('decision').value; label.primary = $('primary').value;
  for (const key of ['acceptable', 'secondary']) label[key] = [...$(key).querySelectorAll('input:checked')].map((input) => input.value);
  label.notes = $('notes').value; label.reviewed = false; $('message').textContent = '';
  save(); renderReviewState();
}
function renderReviewState() { $('case-review-state').textContent = current().reviewed ? 'Revisado por persona; pendiente de exportación conjunta.' : 'Este caso sigue pendiente de revisión.'; }
function render() {
  const item = data.cases[state.index], label = current();
  $('case-number').value = String(state.index); $('case-id').textContent = item.id;
  $('observation').textContent = item.observation; $('coverage').textContent = item.coverage_tags.join(', ');
  $('input-metadata').textContent = `Edad: ${item.age ?? 'no disponible'} · Tipo: ${item.type} · Registro ficticio, no evidencia de un menor real`;
  $('decision').value = label.decision; $('primary').value = label.primary; $('notes').value = label.notes;
  for (const key of ['acceptable', 'secondary']) for (const input of $(key).querySelectorAll('input')) input.checked = label[key].includes(input.value);
  $('previous').disabled = state.index === 0; $('next').disabled = state.index === data.cases.length - 1;
  $('message').textContent = ''; renderReviewState(); save();
}
for (const id of ['decision', 'primary', 'notes']) $(id).addEventListener(id === 'notes' ? 'input' : 'change', capture);
$('reviewer').addEventListener('input', save);
$('case-number').addEventListener('change', () => { state.index = Number($('case-number').value); render(); });
$('previous').addEventListener('click', () => { state.index--; render(); });
$('next').addEventListener('click', () => { state.index++; render(); });
$('mark').addEventListener('click', () => {
  if (!valid(current())) { $('message').textContent = 'Elige decisión y primaria si corresponde. La misma primaria no puede repetirse como secundaria.'; return; }
  current().reviewed = true; save(); renderReviewState();
});
function download(name, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type })), anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
$('draft').addEventListener('click', () => download('current_dev_review_draft.json', JSON.stringify(state, null, 2), 'application/json'));
$('import-draft').addEventListener('change', async () => {
  try {
    const incoming = JSON.parse(await $('import-draft').files[0].text());
    if (!compatibleDraft(incoming)) throw new Error();
    state = incoming; state.index = Math.max(0, Math.min(data.cases.length - 1, Number(state.index) || 0));
    $('reviewer').value = state.reviewer || ''; render();
  } catch { $('message').textContent = 'Borrador incompatible; no se modificó la revisión.'; }
});
async function exportBundle() {
  if (exported) return exported;
  if (!state.reviewer || !data.cases.every((item) => state.labels[item.id].reviewed && valid(state.labels[item.id]))) throw new Error('Revisión incompleta');
  const reviewedAt = new Date().toISOString();
  const records = data.cases.map((item) => {
    const label = state.labels[item.id], classify = label.decision === 'classify';
    return { ...item, expected: { primary: classify ? label.primary : null,
      acceptable_primary: classify ? [...new Set([label.primary, ...label.acceptable])] : [],
      acceptable_secondary: classify ? label.secondary : [], should_abstain: label.decision === 'abstain',
      should_privacy_block: label.decision === 'privacy', discussable: classify && label.acceptable.some((id) => id !== label.primary) },
      adjudication: { status: 'adjudicated', reviewed_by: state.reviewer, reviewed_at: reviewedAt, notes: label.notes } };
  });
  const jsonl = records.map((item) => JSON.stringify(item)).join('\n') + '\n';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jsonl));
  const sha = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  exported = { jsonl, manifest: { status: 'adjudicated', gold_source: 'human', reviewed_by: state.reviewer,
    reviewed_at: reviewedAt, dataset_sha256: sha, case_count: records.length, proposal_version: data.version } };
  return exported;
}
$('export-data').addEventListener('click', async () => download('current_dev_adjudicated.jsonl', (await exportBundle()).jsonl, 'application/x-ndjson'));
$('export-manifest').addEventListener('click', async () => download('current_dev_adjudication.json', JSON.stringify((await exportBundle()).manifest, null, 2), 'application/json'));
render();
