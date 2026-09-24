const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** A stand-alone paper sheet, without IDs, metadata or private attachment paths. */
export function buildFamilyInterviewPrintHtml(name, details, groups, context = {}) {
  const fields = groups.map((group) => `<div class="group">${group.title ? `<h2>${escape(group.title)}</h2>` : ""}${(group.questions ?? [group]).map((question) =>
    `<section><strong>${escape(question.label)}</strong>${question.hint ? `<small>${escape(question.hint)}</small>` : ""}<p>${escape(details[question.key]) || "&nbsp;"}</p></section>`).join("")}</div>`).join("");
  const place = [context.institution && `Institución: ${escape(context.institution)}`,
    context.classroom && `Aula: ${escape(context.classroom)}`].filter(Boolean).join(" · ");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Entrevista familiar · ${escape(name)}</title><style>body{font:14px Arial,sans-serif;margin:22mm;color:#172b52}h1{font-size:22px;margin-bottom:8px}h2{font-size:16px;margin:24px 0 12px}.meta{line-height:1.9;margin-bottom:16px}section{margin:12px 0;break-inside:avoid}small{display:block;color:#536477;margin-top:4px}p{min-height:60px;border-bottom:1px solid #aaa;white-space:pre-wrap;padding:8px 0;margin:4px 0 0}@media print{body{margin:14mm}}</style></head><body><h1>Entrevista familiar diagnóstica</h1><div class="meta">${place ? `${place}<br>` : ""}Niño o niña: ${escape(name)}<br>Fecha: __________________ · Docente: __________________</div><p>Comparte solo lo que consideres útil. Puedes dejar preguntas sin responder.</p>${fields}<script>window.onload=()=>window.print()<\/script></body></html>`;
}
