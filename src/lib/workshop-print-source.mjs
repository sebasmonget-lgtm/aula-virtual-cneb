import {readFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const cache=new Map();
const decode=value=>value.replace(/&(?:amp|lt|gt|quot|apos);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"})[entity]);
/** Internal, authored SVG subset only; never accepts a URL or user-supplied XML. */
export function nativeWorkshopSource(svg){
 const rows=[];
 const artwork=svg.replace(/<text\b([^>]*)>([^<]*)<\/text>/g,(_tag,attributes,value)=>{
  const attr=name=>new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes)?.[1];
  const style=attr('style')??'',className=attr('class');
  const size=Number(attr('font-size')??/font-size:\s*(\d+)/.exec(style)?.[1]??(className==='title'?48:className==='small'?23:30));
  const content=decode(value);
  // Branding is already in the small footer, not in the teaching instructions.
  if(!content.startsWith('Ayni Aula · Recurso'))rows.push({text:content,x:Number(attr('x')),y:Number(attr('y')),size,bold:attr('font-weight')==='700'||/font-weight:\s*(bold|700)/.test(style)||className==='title',white:/fill:\s*white/.test(style)});
  return '';
 });
 if(!rows.length||rows.some(row=>![row.x,row.y,row.size].every(Number.isFinite)))throw new Error('El recurso no tiene texto imprimible válido.');
 return {artwork,rows,width:1240,height:1754};
}

export async function loadNativeWorkshopSource(id){
 if(!/^[a-z0-9-]+$/.test(id))throw new TypeError('Recurso no disponible.');
 if(!cache.has(id))cache.set(id,(async()=>{
  const source=nativeWorkshopSource(await readFile(path.join(process.cwd(),'assets/workshop-resources',id+'.svg'),'utf8'));
  return {...source,image:await sharp(Buffer.from(source.artwork)).png().toBuffer()};
 })().catch(error=>{cache.delete(id);throw error;}));
 return cache.get(id);
}
