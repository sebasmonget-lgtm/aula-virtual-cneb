/** Mutually exclusive day counts. Late attendance is never counted twice. */
export function familyAttendanceChart(attendance) {
  if (!attendance) return null;
  const { total, present, late, absent, excused, pending } = attendance;
  if (![total, present, late, absent, excused, pending].every(value => Number.isInteger(value) && value >= 0) ||
      present + late + absent + excused + pending !== total) throw new TypeError('Resumen de asistencia incompleto.');
  const recorded=total-pending;
  const rows = [
    { key: 'present', label: 'Asistencia', count: present, color: '#21835C' },
    { key: 'late', label: 'Tardanzas', count: late, color: '#C18B08' },
    { key: 'absent', label: 'Faltas', count: absent+excused, color: '#C9434F' },
  ].map(row => ({ ...row, width: recorded ? row.count / recorded * 100 : 0 }));
  // Equal day counts must show equal percentages. Do not redistribute rounding.
  const tenths=rows.map(row=>Math.round(row.width*10));
  const format=new Intl.NumberFormat('es-PE',{maximumFractionDigits:1});
  const resultRows=rows.map((row,i)=>({...row,percentage:tenths[i]/10,percentageLabel:recorded?`${format.format(tenths[i]/10)} %`:'—'}));
  return { rows:resultRows, total, recorded, pending, excused, attended: present + late, asOf: attendance.as_of,
    summary: !total ? 'Aún no hay días de clase en este período.' : pending === total ? 'Aún no hay asistencia registrada.' : `Asistió ${present + late} de ${total} días de clase.`,
    note: [pending?`${pending} ${pending===1?'día sin registrar':'días sin registrar'}. Porcentajes sobre ${recorded} días registrados.`:'Las tardanzas se muestran por separado.',excused?`${excused} ${excused===1?'falta justificada incluida':'faltas justificadas incluidas'}.`:'',recorded&&Math.abs(tenths.reduce((sum,n)=>sum+n,0)-1000)>0?'Porcentajes redondeados.':''].filter(Boolean).join(' ') };
}

export function familyAttendanceDonutSvg(chart){
  const radius=72,circumference=2*Math.PI*radius;let offset=0;
  const circles=chart.rows.filter(row=>row.count).map(row=>{const length=row.width/100*circumference;const circle=`<circle cx="100" cy="100" r="${radius}" fill="none" stroke="${row.color}" stroke-width="28" stroke-dasharray="${length} ${circumference}" stroke-dashoffset="${-offset}"/>`;offset+=length;return circle;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 200 200"><circle cx="100" cy="100" r="72" fill="none" stroke="#E7EDF3" stroke-width="28"/><g transform="rotate(-90 100 100)">${circles}</g><text x="100" y="101" text-anchor="middle" font-family="Poppins,Arial,sans-serif" font-size="32" font-weight="700" fill="#173352">${chart.recorded}</text><text x="100" y="123" text-anchor="middle" font-family="Poppins,Arial,sans-serif" font-size="10" fill="#456078">${chart.pending?'días registrados':'días de clase'}</text></svg>`;
}
