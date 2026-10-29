let state=null,busy=false;
const successfulRequests=new Set();
const root=document.querySelector('#workspace'),feedback=document.querySelector('#feedback');
function node(tag,text,props={}){const e=document.createElement(tag);if(text!==null)e.textContent=text;Object.assign(e,props);return e;}
function field(label,name,type='text',value=''){const l=node('label',label),e=node(type==='textarea'?'textarea':type==='select'?'select':'input',null,{name});if(!['textarea','select'].includes(type))e.type=type;if(value)e.value=value;l.append(e);return {label:l,input:e};}
function button(text,action){const b=node('button',text,{type:'button'});b.addEventListener('click',()=>act(action));return b;}
function section(title){const s=node('section');s.append(node('h2',title));root.append(s);return s;}
async function api(path,input){
  let key=null;
  if(input!==undefined){
    const payload={...input};delete payload.clientRequestId;
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(path+JSON.stringify(payload)));
    key='ayni-local-request:'+Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
    const id=sessionStorage.getItem(key)??input.clientRequestId??crypto.randomUUID();sessionStorage.setItem(key,id);input={...input,clientRequestId:id};
  }
  const r=await fetch(path,input===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}),v=await r.json();
  if(!r.ok)throw Error(v.error??'No pudimos completar el guardado.');if(key)successfulRequests.add(key);return v;
}
async function act(action){if(busy)return;busy=true;feedback.textContent='Guardando…';feedback.className='';document.querySelectorAll('button').forEach(b=>b.disabled=true);let saved=false;try{await action();saved=true;await refresh();for(const key of successfulRequests)sessionStorage.removeItem(key);successfulRequests.clear();feedback.textContent='Guardado. El aula de prueba está actualizada.';}catch(e){feedback.className='error';feedback.textContent=saved?'El registro quedó guardado. Recarga para actualizar la pantalla.':e.message;}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
async function refresh(){state=await api('/api/state');render();}
function selectStudent(label,name,students){const f=field(label,name,'select');f.input.append(node('option','Selecciona un niño',{value:''}));for(const s of students)f.input.append(node('option',`${s.first_name} ${s.last_name} · ${s.age} años`,{value:s.id}));return f;}
const request=()=>({clientRequestId:crypto.randomUUID(),teacherConfirmed:true});
function render(){
  root.replaceChildren();const w=state.workspace;
  if(!w){const s=section('Configurar el aula de prueba'),f=node('form');const name=field('Nombre del aula','section','text','Semillas');f.append(name.label,node('p','Edades atendidas: 3, 4 y 5 años. La profesora acompaña al aula sin auxiliar.'));
    f.append(button('Crear aula de 3, 4 y 5 años',()=>api('/api/classroom',{...request(),ages:[3,4,5],section:name.input.value,institutionName:'Jardín ficticio local',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'})));f.addEventListener('submit',e=>e.preventDefault());s.append(f);return;}
  const c=w.classroom,periodId=w.periods[0].id;const top=section(`Mi aula · ${c.section}`);top.append(node('p',`Grupos de ${c.ages.join(', ')} años. ${w.students.length} niños matriculados.`));
  const list=node('ul',null,{className:'roster'});for(const s of w.students)list.append(node('li',`${s.first_name} ${s.last_name} · ${s.age} años`));top.append(list);
  const form=node('form'),row=node('div',null,{className:'row'}),first=field('Nombre','firstName'),last=field('Apellido','lastName'),age=field('Grupo curricular','age','select');age.input.append(node('option','Selecciona edad',{value:''}));for(const a of c.ages)age.input.append(node('option',`${a} años`,{value:String(a)}));row.append(first.label,last.label,age.label);form.append(row,node('small','La fecha de nacimiento no es necesaria para esta prueba si confirmas el grupo curricular.'),button('Matricular niño',()=>api('/api/enroll',{...request(),classroomId:c.id,expectedRevision:c.curriculum_revision,firstName:first.input.value,lastName:last.input.value,age:Number(age.input.value)})));form.addEventListener('submit',e=>e.preventDefault());top.append(form);
  renderDiagnosticAndYear(c);
  renderDocumentLibrary();
  const activity=section('Actividad compartida y criterios por edad');
  if(!w.activities.length){const active=state.planning?.plans.find(p=>p.status==='active'&&p.current),b=structuredClone(state.blueprint);let annual=null;
    if(active){const slot=active.document_context.calendar.projects[0],proposal=active.proposal.proposals[0],id=proposal.opportunities.find(o=>c.ages.every(age=>proposal.opportunities.some(p=>p.competency_id===o.competency_id&&p.age===age)))?.competency_id;
      if(id){annual={annualPlanId:active.id,annualSlotId:slot.slot_id};b.occursOn=slot.instructional_dates[0];b.title=`${proposal.title} · primera actividad`;b.purpose=proposal.purpose;b.commonSequence={opening:proposal.common_invitation,development:proposal.one_teacher_organization,closure:'Cada niño puede compartir lo que eligió o descubrió mediante palabras, gestos o sus producciones. La profesora escucha y registra solo las actuaciones observadas.'};b.criteriaFamilies=[{competency_id:id,variants:proposal.opportunities.filter(o=>o.competency_id===id).map(o=>({curricular_age:o.age,criterion_text:o.child_action,expected_evidence:o.observation,observation_moments:['development'],official_performance_refs:o.official_performance_refs}))}];activity.append(node('p',`Vinculada a Mi año · ${proposal.title} · ${b.occursOn}. Revisa los criterios antes de confirmar.`));}}
    activity.append(node('h3',b.title),node('p',b.purpose),node('p','Propuesta de ejemplo para revisar. Al confirmar se guardan sus variantes por edad; no se llama a una IA.'));
    const fields=[];for(const [label,key] of [['Inicio','opening'],['Desarrollo','development'],['Cierre','closure']]){const f=field(label,key,'textarea',b.commonSequence[key]);fields.push([key,f.input]);activity.append(f.label);}
    const variants=[];for(const v of b.criteriaFamilies[0].variants){const f=field(`Criterio de ${v.curricular_age} años`,`criterion${v.curricular_age}`,'textarea',v.criterion_text);variants.push([v,f.input]);activity.append(f.label,node('small',`Referente: ${v.official_performance_refs.join(', ')}`));}
    activity.append(button('Confirmar actividad y sus tres criterios',()=>{for(const [key,input] of fields)b.commonSequence[key]=input.value;for(const [v,input] of variants)v.criterion_text=input.value;return api('/api/activity',{...request(),classroomId:c.id,expectedRevision:c.curriculum_revision,blueprint:b,...annual});}));return;}
  const a=w.activities[0];activity.append(node('h3',a.title));for(const [label,key] of [['Inicio','opening'],['Desarrollo','development'],['Cierre','closure']]){const detail=node('details'),sum=node('summary',label);detail.append(sum,node('p',a.details.common_sequence[key]));activity.append(detail);}
  for(const cr of w.criteria){const p=node('p');p.append(node('span',`${cr.curricular_age} años · `,{className:'age'}),document.createTextNode(cr.criterion_text));activity.append(p);}
  const observe=section('Observar a un niño'),child=selectStudent('Niño que observas','observeStudent',w.students),criterion=node('p','Selecciona al niño para ver su criterio.',{className:'review'}),note=field('Qué hizo o dijo','observation','textarea');let selected=null;
  child.input.addEventListener('change',()=>{const s=w.students.find(p=>p.id===child.input.value);selected=w.criteria.find(cr=>cr.curricular_age===s?.age);criterion.textContent=selected?`${s.age} años · ${selected.criterion_text}`:'Selecciona al niño para ver su criterio.';});observe.append(child.label,criterion,note.label,button('Guardar observación',()=>{if(!selected)throw Error('Selecciona al niño antes de guardar.');return api('/api/observe',{...request(),studentId:child.input.value,criterionId:selected.id,activityId:a.id,periodId,observedOn:a.occurs_on,rawText:note.input.value});}));
  const grades=section('Revisar y confirmar valoraciones'),grid=node('div',null,{className:'grade-list'});grades.append(node('p','Revisa la actuación y los referentes del niño. La valoración la eliges tú.'),grid);
  for(const s of w.students){const item=node('article'),pair=w.pairs.find(p=>p.studentId===s.id&&p.competencyId==='COM_ORAL');item.append(node('h3',`${s.first_name} · ${s.age} años`));grid.append(item);
    if(pair?.grade){item.append(node('p',`Valoración guardada: ${pair.grade.achievement_level}`));continue;}
    if(!pair){item.append(node('p','Sin observaciones registradas. No se asigna una valoración.'));continue;}
    let context=null;const review=node('div'),level=field('Valoración docente',`level${s.age}`,'select');level.input.append(node('option','Selecciona valoración',{value:''}));for(const value of ['AD','A','B','C'])level.input.append(node('option',value,{value}));
    const check=node('button','Revisar observaciones y referentes',{type:'button'});check.addEventListener('click',async()=>{check.disabled=true;try{context=await api(`/api/context?studentId=${s.id}&competencyId=COM_ORAL&periodId=${periodId}`);review.replaceChildren();for(const r of context.sourceRows)review.append(node('p',r.observation_text));const d=node('details');d.append(node('summary',`Referentes de ${s.age} años`));for(const p of context.assessmentContext.curriculum.age_performances)d.append(node('p',p.text));review.append(d);}catch(e){feedback.className='error';feedback.textContent=e.message;}finally{check.disabled=false;}});
    item.append(check,review,level.label,button('Confirmar valoración',()=>{if(!context)throw Error('Revisa primero las observaciones y referentes.');return api('/api/grade',{...request(),studentId:s.id,competencyId:'COM_ORAL',periodId,achievementLevel:level.input.value,sourceFingerprint:context.sourceFingerprint});}));
  }
  const texts=section('Conclusiones e informes a familias');
  if(!w.pairs.length||w.pairs.some(p=>!p.current)){texts.append(node('p','Primero completa las valoraciones pertinentes. Las conclusiones se revisan después de las notas.'));return;}
  for(const s of w.students){const pair=w.pairs.find(p=>p.studentId===s.id);if(!pair)continue;const article=node('article');article.append(node('h3',`${s.first_name} · ${s.age} años`));texts.append(article);
    if(!pair.conclusion){const f=field('Conclusión docente',`conclusion${s.age}`,'textarea');article.append(f.label,button('Confirmar conclusión',async()=>{const ctx=await api(`/api/context?studentId=${s.id}&competencyId=COM_ORAL&periodId=${periodId}`);return api('/api/conclusion',{...request(),studentId:s.id,competencyId:'COM_ORAL',periodId,assessmentId:pair.grade.id,sourceFingerprint:ctx.sourceFingerprint,conclusionText:f.input.value});}));}
    else article.append(node('p',pair.conclusion.details.conclusion_text));
    const report=w.reports.find(r=>r.student_id===s.id);if(report)article.append(node('a','Descargar informe Word',{href:`/api/reports/${report.id}.docx`,className:'download'}));
    else if(w.pairs.every(p=>p.conclusion))article.append(button('Confirmar informe con las conclusiones guardadas',()=>api('/api/family',{...request(),studentId:s.id,periodId})));
  }
}
function renderDiagnosticAndYear(c){
  const planning=state.planning;if(!planning){if(state.planningUnavailable)section('Mi año · revisar calendario').append(node('p',state.planningUnavailable));return;}
  const diagnosis=section('Diagnóstico · cada niño y su edad');diagnosis.id='diagnostico';
  diagnosis.append(node('p','Una experiencia puede ser compartida. Al elegir al niño se muestran las orientaciones y referentes de su edad. Los relatos familiares se conservan como contexto.'));
  for(const group of planning.diagnostic.groups)diagnosis.append(node('p',`${group.age} años: ${group.reviewed} de ${group.enrolled} revisiones vigentes; ${group.withObservations} con observaciones; ${group.withFamilyContext} con contexto familiar.`));
  for(const s of planning.diagnostic.students){
    const details=node('details'),summary=node('summary',`${s.first_name} ${s.last_name} · ${s.age} años · ${s.current?'Revisión vigente':'Pendiente de revisión'}`);details.append(summary);diagnosis.append(details);
    const experiences=field('Experiencia diagnóstica',`experience${s.id}`,'select'),aspects=field('Qué observar',`aspect${s.id}`,'select'),guide=node('p',null,{className:'review'});
    for(const e of s.catalog)experiences.input.append(node('option',e.title,{value:e.id}));
    function showAspect(){const exp=s.catalog.find(e=>e.id===experiences.input.value),aspect=exp?.aspects.find(a=>a.id===aspects.input.value);guide.textContent=exp?`${exp.teacher_instructions} ${exp.age_support??''} Referente de ${s.age} años: ${aspect?.age_reference??''}`:'';}
    function showExperience(){aspects.input.replaceChildren();const exp=s.catalog.find(e=>e.id===experiences.input.value);for(const aspect of exp?.aspects??[])aspects.input.append(node('option',aspect.prompt,{value:aspect.id}));showAspect();}
    experiences.input.addEventListener('change',showExperience);aspects.input.addEventListener('change',showAspect);showExperience();
    const observed=field('Qué hizo o dijo en esta experiencia',`diagnosticText${s.id}`,'textarea'),day=field('Fecha de la observación',`diagnosticDate${s.id}`,'date','2026-03-16');
    details.append(experiences.label,aspects.label,guide,observed.label,day.label,button('Guardar observación diagnóstica',()=>api('/api/diagnostic/observe',{...request(),studentId:s.id,expectedAssignmentId:s.assignmentId,experienceId:experiences.input.value,aspectId:aspects.input.value,observationStatus:'observed_without_judgment',observationText:observed.input.value,observedOn:day.input.value})));
    const family=field('Lo que cuenta la familia (opcional)',`familyContext${s.id}`,'textarea',s.family?.details.family_text??'');details.append(family.label,button('Confirmar contexto familiar',()=>api('/api/diagnostic/family',{...request(),studentId:s.id,expectedAssignmentId:s.assignmentId,familyText:family.input.value})));
    details.append(node('h3','Fuentes para revisar'));if(!s.observations.length)details.append(node('p','Todavía no hay observaciones de la profesora. Las competencias quedarán pendientes; no se infieren dificultades.'));
    const readings=[];for(const competency of [...new Set(s.observations.filter(o=>o.observation_status!=='insufficient_information').map(o=>o.competency_v4_id))]){
      const records=s.observations.filter(o=>o.competency_v4_id===competency&&o.observation_status!=='insufficient_information');for(const o of records)details.append(node('p',`Observación docente: ${o.observation_text}`));
      const label=s.catalog.flatMap(e=>e.aspects).find(a=>a.competency_id===competency)?.competency_name??competency;
      const reading=field(`Lectura docente · ${label} (opcional)`,`reading${s.id}${competency}`,'textarea',s.review?.details.findings.find(f=>f.competency_id===competency)?.teacher_reading??''),priority=field('Atención en la planificación',`priority${s.id}${competency}`,'select');for(const [value,text] of [['usual','Habitual'],['consider','Tener en cuenta'],['prioritize','Priorizar']])priority.input.append(node('option',text,{value}));priority.input.value=s.review?.details.findings.find(f=>f.competency_id===competency)?.planning_priority??'usual';details.append(reading.label,priority.label);readings.push({competency,records,reading:reading.input,priority:priority.input});
    }
    const ack=field('He revisado las fuentes; lo que no puedo sostener queda pendiente, sin asignar notas.',`pending${s.id}`,'checkbox');details.append(ack.label,button('Confirmar revisión diagnóstica',()=>api('/api/diagnostic/review',{...request(),studentId:s.id,sourceFingerprint:s.sourceFingerprint,pendingInformationAcknowledged:ack.input.checked,findings:readings.filter(r=>r.reading.value.trim()).map(r=>({competency_id:r.competency,observation_ids:r.records.map(o=>o.id),teacher_reading:r.reading.value,planning_priority:r.priority.value}))})));
    if(s.review)details.append(node('small',`${s.review.details.pending_competency_ids.length} competencias con información pendiente. El historial confirmado se conserva.`));
  }
  const annual=section('Mi año · un recorrido para las edades del aula');annual.id='mi-ano';annual.append(node('p',`15 posiciones compartidas, 2 semanas iniciales de acogida y diagnóstico. Cada posición conserva oportunidades por edad. ${planning.diagnostic.ready?'Revisiones diagnósticas vigentes.':'Revisa a cada niño antes de confirmar Mi año.'}`));
  const draft=planning.plans.find(p=>p.status==='draft'),active=planning.plans.find(p=>p.status==='active'),proposal=structuredClone(draft?.proposal??active?.proposal??planning.exampleProposal),editing=Boolean(draft||!active),title=field('Título de Mi año','annualTitle','text',proposal.title),organization=field('Cómo acompañaré a los grupos','annualOrganization','textarea',proposal.organization);
  title.input.disabled=!editing;organization.input.disabled=!editing;annual.append(title.label,organization.label);
  if(!draft&&!active)annual.append(node('p','Ejemplo editorial local para revisar y editar. No deriva de una generación IA ni afirma intereses o logros del grupo.'));
  if((draft??active)&&!(draft??active).current)annual.append(node('p','Las fuentes cambiaron. Conservamos la versión guardada; revisa y actualiza un borrador antes de confirmar o preparar otra actividad.',{className:'error'}));
  const rows=[];for(const [i,p] of proposal.proposals.entries()){
    const slot=planning.calendar.projects[i],detail=node('details');detail.append(node('summary',`${i+1}. ${p.title} · ${slot.starts_on} a ${slot.ends_on}`));annual.append(detail);
    const t=field('Título de la propuesta',`annualSlotTitle${i}`,'text',p.title),purpose=field('Propósito compartido',`annualSlotPurpose${i}`,'textarea',p.purpose),invitation=field('Invitación compartida',`annualInvitation${i}`,'textarea',p.common_invitation),org=field('Organización con una profesora',`annualSlotOrg${i}`,'textarea',p.one_teacher_organization);
    for(const f of [t,purpose,invitation,org]){f.input.disabled=!editing;detail.append(f.label);}const opportunities=[];
    for(const [j,o] of p.opportunities.entries()){
      const competency=planning.coverage.find(g=>g.age===o.age)?.competencies.find(c=>c.id===o.competency_id),action=field(`${o.age} años · ${competency?.name??o.competency_id}`,`annualAction${i}_${j}`,'textarea',o.child_action),mediation=field('Mediación',`annualMediation${i}_${j}`,'textarea',o.mediation),observation=field('Qué observar',`annualObserve${i}_${j}`,'textarea',o.observation);
      for(const f of [action,mediation,observation]){f.input.disabled=!editing;detail.append(f.label);}detail.append(node('small',o.official_performance_refs.length?`Referentes de ${o.age} años: ${o.official_performance_refs.join(', ')}`:'Sin desempeño específico publicado para esta edad; se conserva el referente de ciclo.'));opportunities.push({o,action:action.input,mediation:mediation.input,observation:observation.input});
    }
    rows.push({p,title:t.input,purpose:purpose.input,invitation:invitation.input,organization:org.input,opportunities});
  }
  const coverage=node('details');coverage.append(node('summary','Cobertura prevista y oportunidades cotidianas por edad'));for(const group of planning.coverage){coverage.append(node('h3',`${group.age} años`));for(const competency of group.competencies){const everyday=proposal.everyday_opportunities.find(o=>o.age===group.age&&o.competency_id===competency.id);coverage.append(node('p',`${competency.name}${competency.hasAgePerformance?'':' · referente de ciclo'}${everyday?`: ${everyday.child_action}`:''}`));}}annual.append(coverage);
  if(editing)annual.append(button(draft?'Actualizar borrador de Mi año':'Guardar borrador de Mi año',()=>{proposal.title=title.input.value;proposal.organization=organization.input.value;for(const r of rows){r.p.title=r.title.value;r.p.purpose=r.purpose.value;r.p.common_invitation=r.invitation.value;r.p.one_teacher_organization=r.organization.value;for(const v of r.opportunities){v.o.child_action=v.action.value;v.o.mediation=v.mediation.value;v.o.observation=v.observation.value;}}return api('/api/annual/draft',{clientRequestId:crypto.randomUUID(),classroomId:c.id,sourceFingerprint:planning.sourceFingerprint,proposal,...(draft?{planId:draft.id,expectedRevision:draft.revision}:{})});}));
  if(draft)annual.append(button('Confirmar Mi año para todos los grupos',()=>api('/api/annual/confirm',{...request(),classroomId:c.id,planId:draft.id,expectedRevision:draft.revision})));
  if(active){annual.append(node('p',`Mi año confirmado · versión ${active.version}. Los proyectos preparados conservan su vínculo y calendario.`));if(!draft)annual.append(button('Crear un nuevo borrador conservando esta versión',()=>api('/api/annual/draft',{clientRequestId:crypto.randomUUID(),classroomId:c.id,sourceFingerprint:planning.sourceFingerprint,proposal:active.proposal})));}
}
function renderDocumentLibrary(){
  const documents=state.documents??[];if(!documents.length)return;
  const library=section('Documentos multiedad e historial');library.append(node('p','Las descargas conservan los textos, grupos y fuentes de la versión confirmada. Una revisión nueva no reemplaza los documentos anteriores.'));
  for(const d of documents){const detail=node('details');detail.append(node('summary',`${d.title} · versión ${d.version} · ${d.status==='draft'?'Borrador':d.historical?'Histórico':'Confirmado'}`));
    detail.append(node('p',`${d.ages.join(', ')} años · ${d.schoolYear??'Año no consignado'}`));
    if(d.exportReady)detail.append(node('a','Descargar Word de esta versión',{href:`/api/documents/${d.kind}/${d.id}.docx`,className:'download'}));
    else detail.append(node('p',d.status==='draft'?'Confirma el borrador para descargarlo.':'Esta versión anterior conserva su contenido; la exportación multiedad requiere una revisión con sus datos de documento.'));
    library.append(detail);
  }
}
refresh().catch(e=>{feedback.className='error';feedback.textContent=e.message;root.textContent='Recarga esta página local para volver a intentar.';});
