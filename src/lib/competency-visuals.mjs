// Presentation only: stable competency IDs, never attainment or an assessment level.
export const competencyVisuals = {
  PS_IDENTIDAD: { foreground:'#9a4c0b', background:'#fff1dc' },
  PS_CONVIVE: { foreground:'#b42360', background:'#fff0f6' },
  PS_RELIGION: { foreground:'#8b4675', background:'#faedf6' },
  PSICO_MOTRICIDAD: { foreground:'#24713d', background:'#eaf7e9' },
  COM_ORAL: { foreground:'#075da8', background:'#e8f4ff' },
  COM_LECTURA: { foreground:'#4054a8', background:'#eef0ff' },
  COM_ESCRITURA: { foreground:'#954219', background:'#fff0e6' },
  COM_ARTE: { foreground:'#7731b8', background:'#f4edff' },
  CAST_L2_ORAL: { foreground:'#2b6588', background:'#eaf5fb' },
  MAT_CANTIDAD: { foreground:'#886002', background:'#fff7d8' },
  MAT_FORMA: { foreground:'#006b68', background:'#e3f7f4' },
  CYT_INDAGA: { foreground:'#396519', background:'#f0f7df' },
  TRANS_TIC: { foreground:'#3d5773', background:'#edf3fa' },
  TRANS_AUTONOMO: { foreground:'#a33334', background:'#fff0ed' },
};
export function competencyVisual(id) {
  const palette=competencyVisuals[id];
  return palette?{...palette,image:`/competencies/compact/${id.toLowerCase()}.svg`}:null;
}
