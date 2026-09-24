// Older local drafts used this instructional text as if it were a teacher's synthesis.
// Keep recognition narrow so genuine historical teacher writing is not hidden.
export function isDiagnosticScaffoldSummary(value) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  return text === "Información insuficiente para una síntesis diagnóstica. Conviene seguir observando." ||
    (text.startsWith("Se registraron ") && text.endsWith("Revisa estas actuaciones y redacta tu interpretación."));
}
