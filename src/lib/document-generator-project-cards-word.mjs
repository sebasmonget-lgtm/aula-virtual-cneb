import {guideParagraph, keepShortTableTogether} from './teacher-guide-word-layout.mjs';

const spacer = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="80" w:lineRule="exact"/></w:pPr></w:p>';
const ageFills = {3:'F0F8F3',4:'FFF8ED',5:'F6F2FB'};

function paragraph(text, {bold=false,size=22,keepNext=false,before=0,after=100}={}) {
  return guideParagraph(text,{bold,size,keepNext}).replace(/<w:spacing\b[^>]*\/>/,`<w:spacing w:before="${before}" w:after="${after}" w:line="276" w:lineRule="auto"/>`);
}
function text(value, options={}) {
  return (Array.isArray(value)?value:[value]).filter(v=>typeof v==='string').flatMap(v=>v.split(/\n+/)).filter(Boolean).map(line=>paragraph(line.trim(),options)).join('');
}
function heading(label, fill='EAF3FA') {
  return paragraph(label,{bold:true,size:24,keepNext:true,before:180,after:110}).replace('<w:pPr>',`<w:pPr><w:shd w:val="clear" w:fill="${fill}"/><w:ind w:left="120" w:right="80"/>`);
}
function table(headers, rows, widths, {size=20,labelColumn=false,rowFills=null,boldColumn=null}={}) {
  const row=(values,index,header=false)=>`<w:tr><w:trPr><w:cantSplit/>${header?'<w:tblHeader/>':''}</w:trPr>${values.map((value,col)=>`<w:tc><w:tcPr><w:tcW w:w="${widths[col]}" w:type="dxa"/><w:shd w:val="clear" w:fill="${header?'E4EEF6':rowFills?.[index]??(labelColumn&&col===0?'EAF3FA':'FFFFFF')}"/><w:vAlign w:val="top"/></w:tcPr>${text(value,{bold:header||(labelColumn&&col===0)||boldColumn===col,size,keepNext:header,after:40})||'<w:p/>'}</w:tc>`).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="10000" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(side=>`<w:${side} w:val="single" w:sz="4" w:color="CBD9E5"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:left w:w="150" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:right w:w="150" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(width=>`<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${headers?row(headers,0,true):''}${rows.map((values,index)=>row(values,index)).join('')}</w:tbl>${spacer}`;
}

function curriculumSpacing(xml) {
  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g,p=>{
    if(!/<w:t(?:\s|>)/.test(p))return p;
    const title=/<w:shd\b/.test(p),spacing=`<w:spacing w:before="${title?140:0}" w:after="65" w:line="270" w:lineRule="auto"/>`;
    return p.replace(/<w:spacing\b[^>]*\/>/g,spacing);
  }).replace(/<w:(top|bottom) w:w="75" w:type="dxa"\/>/g,'<w:$1 w:w="110" w:type="dxa"/>');
}

/** Project-only presentation: no rewriting or summarizing of the saved content. */
export function projectCardsWordBody(d,{criteria,references,activityRoute,materials}) {
  const c=d.content,p=c.documentPlanning,annual=c.annualContext??{},first=p?.learningJourney[0];
  const question=p?.version===4?p.sequence.sharedChallenge:annual.invitation;
  const introduction=heading('Situación significativa')+text(c.meaningfulSituation??annual.rationale??'')
    +(question?keepShortTableTogether(table(null,[['Pregunta para explorar',question]],[2200,7800],{labelColumn:true,size:22})):'')
    +heading('Propósito del proyecto','E8F5EE')+text(c.purpose)
    +(first?heading('Planificación con los niños','FFF1DF')+keepShortTableTogether(table(null,[['Qué proponemos',first.proposal],['Qué podrán decidir',first.childDecision]],[2200,7800],{labelColumn:true,size:22})):'' );
  const route=[3,4].includes(p?.version)?table(['Día y fecha','Actividad',c.includeCapacityReferences?'Propuesta del día':'Qué harán los niños'],p.dailyRoute.map(day=>[`${day.position} ·\n${day.occursOn.split('-').reverse().join('/')}`,day.title,day.mainAction]),[1800,2600,5600],{boldColumn:1})
    :activityRoute?.length?table(['Día y actividad','Qué haremos','Qué necesitamos'],activityRoute.map(a=>[`${a.position} · ${a.date.split('-').reverse().join('/')}\n${a.title}`,a.purpose,a.materials?.join(' · ')||'Por prever según la actividad.']),[2500,5000,2500])
    :p?table(['Momento','Qué se propone','Qué podrán decidir'],p.learningJourney.slice(1).map(s=>[s.phase,s.proposal,s.childDecision]),[2200,4200,3600])
    :table(null,Object.entries({opening:'Inicio',development:'Desarrollo',closure:'Cierre'}).map(([key,label])=>[label,c.commonSequence[key]]),[2200,7800],{labelColumn:true});
  const approaches=p?heading('Enfoques en la práctica','E8F5EE')+table(['Enfoque','Actitud que acompañaremos','Qué hará la profesora'],p.transversalApproaches.map(a=>[a.name,a.attitude,a.teacherAction]),[2000,4000,4000]):'';
  const conditions=heading('Condiciones para realizarlo')+keepShortTableTogether(table(null,[['Materiales',materials??''],['Organización',c.commonSequence.opening||annual.organization]],[2200,7800],{labelColumn:true,size:22}));
  const supports=p?keepShortTableTogether(heading('Acompañamiento por edad','E8F5EE')+table(null,p.ageSupports.map(s=>[`${s.age} años: ${s.mediation} ${s.support}`]),[10000],{size:22,rowFills:p.ageSupports.map(s=>ageFills[s.age])})):'';
  const closing=c.documentPresentationVersion===8&&p?.commonSequence.closure
    ?heading('Cómo revisaremos el proyecto al finalizar','E8F5EE')+text(p.commonSequence.closure):'';
  return (introduction+heading('Ruta breve de actividades')+route+closing
    +heading('Competencias y qué observar','F0EBF9')+paragraph('Instrumento previsto: registro de observación. Anota lo que los niños hagan o digan en relación con cada criterio.',{keepNext:c.documentPresentationVersion===8})+curriculumSpacing(criteria)
    +approaches+conditions+supports+references)
    .replaceAll('<w:p/>',spacer)
    .replace(/<w:pPr>/g,'<w:pPr><w:jc w:val="left"/><w:suppressAutoHyphens/>')
    .replace(/<w:rPr>/g,'<w:rPr><w:rFonts w:ascii="Poppins" w:hAnsi="Poppins" w:eastAsia="Poppins" w:cs="Poppins"/>');
}
