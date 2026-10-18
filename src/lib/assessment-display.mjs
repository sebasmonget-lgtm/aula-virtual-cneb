/** Presentation compatibility for historical markers. New prose keeps its supplied names. */
export function assessmentDisplayText(value, studentName) {
  return String(value ?? '').replace(/\[estudiante_actual\]|\bcurrent_student\b/g, () => studentName || 'el niño observado')
    .replace(/\[estudiante\]/g, 'un estudiante');
}
export function assessmentReanalysisWarning({level, reason, analysis}) {
  if (!level && !reason?.trim() && !analysis?.trim()) return '';
  return 'Ayni preparará un nuevo análisis. Se reemplazará el texto del análisis actual; su versión anterior se conservará en el historial. Tu valoración provisional y su sustento se conservarán como borrador, pero debes revisarlos y confirmarlos con las evidencias actuales. ¿Continuar?';
}
