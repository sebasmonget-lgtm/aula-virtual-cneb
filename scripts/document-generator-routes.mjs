import {isDocumentGenerator} from '../src/lib/ayni-product-mode.mjs';
import {multiAgeClassroomConfiguration} from '../src/lib/multi-age-local-service.mjs';
import {assertMultiAgeLocalDb} from './multi-age-local-db.mjs';
import {createPilotClassroom} from '../src/lib/pilot-onboarding-service.mjs';
import { loadAyniProductMode, chooseAyniProductMode } from '../src/lib/ayni-product-mode.mjs';
import { loadDocumentGeneratorContext, generatorDocumentSelection, generatorWorkshops } from '../src/lib/document-generator-service.mjs';
import { renderGeneratorFormat, renderGeneratorWorkshop } from '../src/lib/document-generator-word.mjs';
import { renderWorkshopPrint } from '../src/lib/workshop-print.mjs';
import { httpStatusForError, publicErrorMessage } from '../src/lib/version-integrity.mjs';
import {downloadContentDisposition,generatorFormatDownloadName,generatorWorkshopDownloadName} from '../src/lib/document-download-name.mjs';

export async function handleDocumentGeneratorRoutes({ request, response, url, context, origin, send, sendAsset, readJson, assetsDir, logoStorage, assetsRelativeRoot,available=true }) {
  const modeRoute = url.pathname === '/api/product-mode';
  if (!modeRoute && !url.pathname.startsWith('/api/document-generator/')) return false;
  const { db, teacherId } = context;
  try {
    if (modeRoute) {
      if (request.method === 'GET') send(response,200,{...await loadAyniProductMode(db,teacherId),available},origin);
      else if (request.method === 'PUT') {const input=await readJson(request);if(input?.mode==='documents'&&!available)throw new TypeError('El generador no está disponible por el momento.');send(response,200,await chooseAyniProductMode(db,teacherId,input),origin);}
      else send(response,405,{error:'Método no disponible.'},origin);
      return true;
    }
    if(url.pathname==='/api/document-generator/setup'&&request.method==='POST'){
      assertMultiAgeLocalDb(db);
      if(!origin||!String(request.headers['content-type']??'').startsWith('application/json')||!await isDocumentGenerator(db,teacherId))throw new TypeError('Abre el generador para configurar tu aula.');
      const input=await readJson(request);
      if(!input||'teacherId' in input||'ownerId' in input||input.teacherConfirmed!==true||input.teachingMode!=='single_teacher_multi_age')throw new TypeError('Confirma la modalidad y los datos del aula.');
      const multiAge=multiAgeClassroomConfiguration(input,{allowSingleAge:true});
      const saved=await createPilotClassroom(db,teacherId,{...input,age:multiAge.ages[0]},{assetsDir,logoStorage,multiAge,assetsRelativeRoot});
      send(response,200,saved,origin);return true;
    }
    if (request.method !== 'GET') { send(response,405,{error:'Método no disponible.'},origin); return true; }
    const c = await loadDocumentGeneratorContext(db,teacherId), suffix = url.pathname.slice('/api/document-generator'.length);
    if (suffix === '/context') { send(response,200,c,origin); return true; }
    const age = Number(url.searchParams.get('age') ?? c.ages[0]);
    if (suffix === '/workshops') { send(response,200,{workshops:generatorWorkshops(c,age)},origin); return true; }
    const selection = generatorDocumentSelection(c,{studentId:url.searchParams.get('studentId'),period:url.searchParams.get('period')??'1',month:url.searchParams.get('month')??'3'});
    const format = /^\/formats\/([a-z]+)\.docx$/.exec(suffix), workshop = /^\/workshops\/([a-zA-Z0-9_-]+)\.(docx|pdf)$/.exec(suffix);
    let bytes, filename, mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (format) { bytes = await renderGeneratorFormat(format[1],selection); filename = generatorFormatDownloadName(format[1],selection,{individual:Boolean(url.searchParams.get('studentId'))}); }
    else if (workshop) {
      const w = generatorWorkshops(c,age).find(w => w.id === workshop[1]);
      if (!w) throw new TypeError('El taller no corresponde a la edad seleccionada.');
      if(url.searchParams.get('studentId')&&selection.students[0].age!==age)throw new TypeError('El taller no corresponde a la edad curricular del alumno.');
      const ageStudents=selection.students.filter(student=>student.age===age);
      if (workshop[2] === 'pdf') { bytes = await renderWorkshopPrint({context:{institution_name:c.institution,section:c.section,age,student_name:ageStudents.length===1?ageStudents[0].name:null},workshopId:w.id}); mime = 'application/pdf'; }
      else bytes = await renderGeneratorWorkshop(w,{...selection,ages:[age]});
      filename = generatorWorkshopDownloadName(w,c,age,workshop[2]);
    } else { send(response,404,{error:'Documento no disponible.'},origin); return true; }
    response.setHeader('content-disposition',downloadContentDisposition(filename));
    if(origin)response.setHeader('access-control-expose-headers','content-disposition');
    sendAsset(response,200,bytes,mime,origin,'private, no-store'); return true;
  } catch (error) { send(response,httpStatusForError(error),{error:publicErrorMessage(error)},origin); return true; }
}
