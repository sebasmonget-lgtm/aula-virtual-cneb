const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const safe = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g,"-").slice(0,48) || "Aula";

export function artifactRelativePath(artifact) {
  if (!uuid.test(artifact.id) || !uuid.test(artifact.classroom_id) ||
    !Number.isInteger(Number(artifact.school_year)) || Number(artifact.school_year)<2000 || Number(artifact.school_year)>2100 ||
    !["annual_plan","experience"].includes(artifact.source_kind) ||
    !/^(?:plan|proyecto)-[0-9a-f]{8}-v\d+\.docx$/.test(artifact.filename))
    throw new Error("Identidad documental inválida.");
  const kind = artifact.source_kind === "annual_plan" ? "Plan-anual" : "Proyectos";
  return `${artifact.school_year}/Aula-${safe(artifact.classroom)}-${artifact.classroom_id.slice(0,8)}/${kind}/${artifact.id}/${artifact.filename}`;
}
