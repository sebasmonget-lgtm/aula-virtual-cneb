/** Mutually exclusive day counts. Late attendance is never counted twice. */
export function familyAttendanceChart(attendance) {
  if (!attendance) return null;
  const { total, present, late, absent, excused, pending } = attendance;
  if (![total, present, late, absent, excused, pending].every(value => Number.isInteger(value) && value >= 0) ||
      present + late + absent + excused + pending !== total) throw new TypeError('Resumen de asistencia incompleto.');
  const rows = [
    { key: 'present', label: 'Presente', count: present, color: '#14745c' },
    { key: 'late', label: 'Llegó tarde', count: late, color: '#a36009' },
    { key: 'absent', label: 'Faltó', count: absent, color: '#b43746' },
    ...(excused ? [{ key: 'excused', label: 'Falta justificada', count: excused, color: '#326e9e' }] : []),
    ...(pending ? [{ key: 'pending', label: 'Sin registro', count: pending, color: '#62758a' }] : []),
  ].map(row => ({ ...row, width: total ? row.count / total * 100 : 0 }));
  return { rows, total, attended: present + late, asOf: attendance.as_of,
    summary: !total ? 'Aún no hay días de clase en este período.' : pending === total ? 'Aún no hay asistencia registrada.' : `Asistió ${present + late} de ${total} días de clase.`,
    note: pending ? `${pending} ${pending === 1 ? 'día sin registrar' : 'días sin registrar'}. Las tardanzas se cuentan aparte.` : 'Las tardanzas se cuentan aparte.' };
}
