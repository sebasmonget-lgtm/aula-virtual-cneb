import {readFile,access} from 'node:fs/promises';
import path from 'node:path';

// Check the generated server artifact, not merely the source configuration.
const trace=path.resolve('.next/server/app/api/[...path]/route.js.nft.json');
const {files}=JSON.parse(await readFile(trace,'utf8'));
const included=new Set(files.map(file=>path.resolve(path.dirname(trace),file)));
for(const file of ['public/ayni-thinking-v2.webp','public/ayni-profesora.webp',
 'assets/templates/proyecto-unidad-inicial-unificada-v1.docx',
 'assets/templates/actividad-aprendizaje-inicial-unificada-v1.docx']){
 const target=path.resolve(file);await access(target);
 if(!included.has(target))throw new Error('El paquete de la API no incluye el recurso Word: '+file);
}
console.log('Imágenes y plantillas Word presentes en el trace real de la API.');
