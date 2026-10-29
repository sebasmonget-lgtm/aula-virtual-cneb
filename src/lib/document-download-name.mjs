const pad=value=>String(value).padStart(2,'0');
const positive=value=>Number.isInteger(value)&&value>0;
const part=value=>String(value??'').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().replace(/^[. ]+|[. ]+$/g,'');
const short=(value,length=85)=>{const text=part(value);return text.length<=length?text:text.slice(0,length).replace(/\s+\S*$/,'').trim();};
const revision=value=>positive(value)&&value>1?`v${pad(value)}`:'';
const classroom=section=>section?`Aula ${short(section,32)}`:'';
const period=value=>positive(value)?`B${pad(value)}`:'';

/** Human-readable leaf names, safe on Windows and capped for long download paths. */
export function normalizedDownloadName(parts,extension='docx'){
  if(!['docx','pdf','xlsx','zip'].includes(extension))throw new TypeError('Formato de descarga no admitido.');
  let stem=parts.map(value=>part(value)).filter(Boolean).join(' - ').slice(0,180).replace(/[. ]+$/g,'')||'Documento Ayni';
  if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem))stem=`Ayni - ${stem}`;
  return `${stem}.${extension}`;
}

export function downloadContentDisposition(filename){
  const safe=normalizedDownloadName([filename.replace(/\.[^.]+$/,'')],filename.split('.').at(-1));
  const ascii=safe.normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\x20-\x7e]/g,'').replace(/[%"\\]/g,'_');
  const encoded=encodeURIComponent(safe).replace(/[!'()*]/g,char=>`%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Blob downloads must honor the server's UTF-8 name instead of overriding it. */
export function downloadNameFromDisposition(header,fallback='Documento Ayni.docx'){
  let name;
  const encoded=header?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  try{if(encoded)name=decodeURIComponent(encoded.trim());}catch{/* Try the ASCII fallback. */}
  name??=header?.match(/filename\s*=\s*"([^";]+)"/i)?.[1];
  return name&&name.length<=220&&!/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/.test(name)&&!/^\.+$/.test(name)?name:fallback;
}

function projectCode(project){
  const index=project?.content?.annualContext?.index??project?.source_proposal_index;
  return Number.isInteger(index)&&index>=0?`P${pad(index+1)}${revision(project.version)?`-${revision(project.version)}`:''}`:'Proyecto';
}

export function savedDocumentDownloadName(document,{project=null}={}){
  const identity=document.identity??{},c=document.content??{},year=identity.school_year??document.school_year,
    section=identity.section??document.classroom,version=revision(Number(document.version)),title=short(c.title??document.title);
  const tail=[year,classroom(section)];
  if(document.kind==='project'||document.kind==='experience')return normalizedDownloadName([projectCode(document),title,...tail]);
  if(document.kind==='activity'){
    const item=document.experience_details?.activity_route?.find(item=>item.id===c.route_item_id);
    const number=c.position??item?.number;
    const workshop=Boolean(c.workshop_catalog);
    return normalizedDownloadName([workshop?'Taller':projectCode(project),workshop?'':positive(number)?`A${pad(number)}`:'Actividad',title,...tail,version]);
  }
  if(document.kind==='workshop')return normalizedDownloadName(['Taller',title,identity.ages?.length?`${identity.ages.join('-')} años`:'',c.occursOn,...tail,version]);
  if(document.kind==='annual_plan')return normalizedDownloadName(['Plan anual',...tail,version]);
  const labels={diagnostic_student_review:'Diagnóstico individual',diagnostic_group_review:'Diagnóstico del aula',diagnostic_summary:'Diagnóstico del aula',family_report:'Informe a la familia',period_closure:'Cierre de bimestre'};
  return normalizedDownloadName([labels[document.kind]??title,identity.student_name??(document.kind==='family_report'?document.title:''),document.period_label,...tail,version]);
}

const formatLabels={roster:'Nómina del aula',diagnostic:'Diagnóstico del aula',observations:'Registro de observaciones',evaluation:'Registro de evaluación',conclusions:'Conclusiones descriptivas',family:'Informe a la familia',attendance:'Registro de asistencia'};
export function generatorFormatDownloadName(kind,context,{individual=false}={}){
  const dated=kind==='attendance'?`${context.year}-${pad(context.month)}`:context.year;
  return normalizedDownloadName([formatLabels[kind]??'Formato',...(['observations','evaluation','conclusions','family'].includes(kind)?[period(context.period)]:[]),
    dated,classroom(context.section),individual?short(context.students[0]?.name,50):'']);
}

export function generatorWorkshopDownloadName(workshop,context,age,extension='docx'){
  return normalizedDownloadName(['Taller',short(workshop.title),extension==='pdf'?'Materiales':'Guía',`${age} años`,context.year,classroom(context.section)],extension);
}
