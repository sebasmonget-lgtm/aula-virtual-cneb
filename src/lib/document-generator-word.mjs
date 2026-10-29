import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, ShadingType, Header, Footer, PageNumber,BorderStyle,HeightRule } from 'docx';
import { GENERATOR_FORMATS } from './document-generator-service.mjs';
import JSZip from 'jszip';
import {renderAyniInstrumentWord} from './ayni-instrument-word.mjs';
import {renderBlankFamilyReports} from './family-report-word.mjs';
import {renderGeneratorWorkshopTemplate} from './generator-workshop-word.mjs';

const NAVY = '173352', TEAL = '086C7C', LIGHT = 'EAF3FA';
const textRuns=(value,options={})=>String(value??'').split(/\r?\n/).map((text,index)=>new TextRun({text,...options,...(index?{break:1}:{})}));
const p = (text = '', options = {}) => new Paragraph({ spacing: { after: 100 }, children: textRuns(text,{size:20}), ...options });
const h = text => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } });
function cell(text, header = false, compact = false,keepNext=false) {
  return new TableCell({ margins: { top: compact?60:90, bottom: compact?60:90, left: 100, right: 100 },
    ...(header ? { shading: { type: ShadingType.CLEAR, fill: LIGHT } } : {}),
    children: [p(String(text ?? ''), { keepNext:header||keepNext,...(compact?{spacing:{after:0,line:220}}:{spacing:{after:45,line:270}}),children: textRuns(text,{bold:header,size:compact?18:20,color:NAVY}) })] });
}
function table(headers, rows, widths, compact = false, {rowHeight=0,keepWithNext=false,keepRowsTogether=false} = {}) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: widths,borders:Object.fromEntries(['top','bottom','left','right','insideHorizontal','insideVertical'].map(side=>[side,{style:BorderStyle.SINGLE,size:4,color:'D1E2EA'}])),
    rows: [new TableRow({ tableHeader: true, children: headers.map(v => cell(v, true, compact)) }),
      ...rows.map((row,index) => new TableRow({ cantSplit: true,...(rowHeight?{height:{value:rowHeight,rule:HeightRule.ATLEAST}}:{}), children: row.map(v => cell(v,false,compact,keepWithNext||(keepRowsTogether&&index<rows.length-1)||(index===0&&rows.length>1))) }))] });
}
function identification(c, student) {
  return [table(['Datos del documento', ''], [
    ['Institución educativa', c.institution], ['Docente', c.teacher],
    ['Aula y año', `${c.section} · ${c.year}`], ['Edad curricular', `${student?.age ?? c.ages.join(', ')} años`],
    ...(c.ugel ? [['UGEL', c.ugel]] : []), ...(c.district ? [['Distrito', c.district]] : []),
    ...(c.director ? [['Director o directora', c.director]] : []), ...(c.institutionCode ? [['Código de institución', c.institutionCode]] : []),
    ...(student ? [['Estudiante', student.name]] : []),
  ], [2600, 6800]), p()];
}
function cover(title, c, student, pageBreakBefore = false) {
  return [new Paragraph({ text: title, heading: HeadingLevel.TITLE, pageBreakBefore, spacing: { after: 240 } }), ...identification(c, student)];
}
const cardsFor = (c, age) => c.competencies.find(g => g.age === age)?.cards ?? [];
const birthDateForWord=value=>/^\d{4}-\d{2}-\d{2}$/.test(value??'')?value.split('-').reverse().join('/'):value??'';
const studentLabel=s=>`${s.name}\n${s.age} años`;

/** These are unfilled instruments, never evaluations or claims about a child. */
export async function renderGeneratorFormat(kind, context) {
  const format = GENERATOR_FORMATS.find(f => f.id === kind);
  if (!format) throw new TypeError('El formato solicitado no está disponible.');
  if(['family','conclusions'].includes(kind))return renderBlankFamilyReports(context,{conclusions:kind==='conclusions'});
  const c = context, children = [], period = `${['I','II','III','IV'][c.period - 1]} bimestre`;
  if (['family','conclusions'].includes(kind)) {
    c.students.forEach((s, index) => {
      children.push(...cover(format.title, c, s, index > 0), p(period),
        p('Completa los apartados a partir de las evidencias y decisiones de la profesora. Las casillas vacías no indican un nivel de aprendizaje.'),
        table(kind === 'family' ? [`Competencia\n${s.name} · ${s.age} años`, 'Lo que observamos', 'Cómo acompañaremos'] : [`Competencia\n${s.name} · ${s.age} años`, 'Avances y dificultades observados', 'Apoyos y próximos pasos'],
          cardsFor(c, s.age).map(card => [card.name, '', '']), [3600, 2900, 2900]),
        h('Acuerdos y comentarios'), table(['', 'Firma de la profesora'], [['', '']], [6800,2600]));
    });
  } else {
    const schoolExtras=[c.ugel,c.district,c.institutionCode?`Código ${c.institutionCode}`:'',c.director?`Director o directora: ${c.director}`:''].filter(Boolean).join(' · ');
    if(kind==='evaluation')children.push(new Paragraph({text:format.title,heading:HeadingLevel.TITLE,spacing:{after:100}}),p(`${c.institution} · ${c.teacher} · Aula ${c.section} · ${c.year}`),...(schoolExtras?[p(schoolExtras)]:[]));
    else if(kind==='attendance')children.push(new Paragraph({text:format.title,heading:HeadingLevel.TITLE,spacing:{after:160}}),
      p(c.institution),p(`${c.teacher} · Aula ${c.section} · ${c.year} · ${c.ages.join(', ')} años`),
      ...(schoolExtras?[p(schoolExtras)]:[]));
    else children.push(...cover(format.title, c));
    if (kind === 'roster') children.push(table(['N.º','Nombres y apellidos','Edad curricular','Nacimiento'], c.students.map((s,i) => [i+1,s.name,`${s.age} años`,birthDateForWord(s.birthDate)]), [500,5000,1800,2100]));
    if (kind === 'observations') children.push(p('Completa en Word o a mano lo que observes y su contexto. Puedes dejar filas sin completar.'),
      table(['Estudiante · edad','Fecha y actividad','Qué hizo o dijo · contexto','Apoyo o siguiente paso'], c.students.map(s => [studentLabel(s),'','','']), [2400,1600,3500,1900],false,{rowHeight:1000}));
    if (kind === 'diagnostic') {
      children.push(p('Instrumento para completar con información recogida por la profesora. El contexto conversado para planificar no acredita aprendizajes observados.'));
      // The planning chat remains intact in Ayni. It is not an observed diagnosis
      // and copying a transcript into this blank instrument adds no usable record.
      for (const age of c.ages) children.push(h(`Grupo de ${age} años`),
        table(['Alumnos del grupo','Fecha','Información recogida'],c.students.filter(s=>s.age===age).map(s=>[studentLabel(s),'','']),[3400,1400,4600],false,{rowHeight:760}),p(),
        table([`Competencia · ${age} años`,'Hallazgos por completar','Prioridad para planificar'], cardsFor(c,age).map(card => [card.name,'','']), [3600,3600,2200],false,{rowHeight:650}));
      children.push(h('Contexto del aula y acuerdos'), table(['Contexto por completar','Decisiones de la profesora'], [['','']], [4700,4700]));
    }
    if (kind === 'evaluation') {
      children.push(p(period), p('Completa la valoración después de revisar las evidencias. Una casilla vacía no equivale a C.'));
      children.push(p('Usa AD, A, B o C donde corresponda. Los códigos C1, C2… identifican competencias, no valoraciones.'));
      children.push(table(['N.º','Alumnos del bimestre','Edad curricular'],c.students.map((s,i)=>[String(i+1),s.name,`${s.age} años`]),[550,7050,1800]),p());
      for (const [ageIndex,age] of c.ages.entries()) {
        const cards=cardsFor(c,age),students=c.students.filter(s=>s.age===age);
        for(let offset=0;offset<cards.length;offset+=12){
          const block=cards.slice(offset,offset+12),codes=block.map((_,i)=>`C${offset+i+1}`),half=Math.ceil(block.length/2);
          const legend=Array.from({length:half},(_,i)=>[codes[i],block[i].name,codes[i+half]??'',block[i+half]?.name??'']);
          const small=students.length<=3;
          children.push(new Paragraph({text:`Grupo de ${age} años · competencias ${offset+1} a ${offset+block.length}`,heading:HeadingLevel.HEADING_2,pageBreakBefore:ageIndex>0&&offset===0,keepNext:true,spacing:{before:160,after:100}}),
            table(['Código','Competencia','Código','Competencia'],legend,[700,4000,700,4000],true,{keepWithNext:small}),p('',{keepNext:small,spacing:{after:20,line:40}}),
            table(['Estudiante · edad',...codes],students.map(s=>[studentLabel(s),...block.map(()=> '')]),[3200,...block.map(()=>Math.floor(6200/block.length))],false,{rowHeight:620,keepRowsTogether:small}),p());
        }
      }
    }
    if (kind === 'attendance') {
      const days = new Date(Date.UTC(c.year,c.month,0)).getUTCDate();
      children.push(p(new Intl.DateTimeFormat('es-PE',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(c.year,c.month-1,1))) + ` de ${c.year}`));
      for (const start of [1,17]) {
        const dates = Array.from({length:Math.min(16,days-start+1)},(_,i) => start+i);
        children.push(new Paragraph({text:`Días ${start} al ${dates.at(-1)}`,heading:HeadingLevel.HEADING_2,pageBreakBefore:start===17&&c.students.length>12,spacing:{before:160,after:100}}), table(['Estudiante · edad',...dates.map(String)], c.students.map(s => [studentLabel(s),...dates.map(() => '')]), [4000,...dates.map(() => Math.floor(5400/dates.length))],true,{rowHeight:450}));
      }
      children.push(p('Registra la asistencia según los días de clase de tu institución.'));
    }
  }
  return pack(format.title, c, children, ['attendance','evaluation'].includes(kind));
}

export async function renderGeneratorWorkshop(workshop, context) { return renderGeneratorWorkshopTemplate(workshop,context); }

async function pack(title, c, children, landscape = false) {
  const generated=await Packer.toBuffer(new Document({ creator: 'Ayni Aula', title, description: 'Formato editable para completar por la profesora',
    styles: { default: { document: { run: { font: 'Poppins', color: NAVY, size: 20 }, paragraph: { spacing: { line: 260 } } } },
      paragraphStyles: [{ id: 'Title', name: 'Title', basedOn: 'Normal', run: { bold: true, color: NAVY, size: 32 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', run: { bold: true, color: TEAL, size: 23 }, paragraph: { keepNext: true } }] },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: landscape ? 'landscape' : 'portrait' }, margin: { top: 850, bottom: 850, left: 900, right: 900 } } },
      headers: { default: new Header({ children: [p('Ayni Aula · Generador de documentos', { children: [new TextRun({text:'Ayni Aula · Generador de documentos',color:TEAL,size:18})] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun(`${c.section} · ${c.year}    `),new TextRun({children:[PageNumber.CURRENT]})] })] }) }, children }] }));
  const zip=await JSZip.loadAsync(generated),xml=await zip.file('word/document.xml').async('string');
  return renderAyniInstrumentWord({title,context:c,body:xml.slice(xml.indexOf('<w:body>')+8,xml.lastIndexOf('<w:sectPr')),styles:await zip.file('word/styles.xml').async('string'),landscape});
}
