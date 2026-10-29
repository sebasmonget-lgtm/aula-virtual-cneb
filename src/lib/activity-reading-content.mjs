/** Presentation only: retain every saved sentence; never summarize or generate pedagogy. */
export const savedText=value=>typeof value==='string'?value.trim():'';
export function readingSentences(value){
  if(Array.isArray(value))return value.filter(item=>typeof item==='string'&&item.trim()).map(item=>item.trim());
  const text=savedText(value);if(!text)return [];
  // The guide supplies its own visible step numbers. Keep each authored numbered
  // action whole, including questions, instead of segmenting "1." as a sentence.
  const numbered=[...text.matchAll(/(?:^|\n)\s*\d+[.)]\s+/g)];
  if(numbered.length&&numbered[0].index===0)return numbered.map((match,index)=>text.slice(match.index+match[0].length,numbered[index+1]?.index??text.length).trim()).filter(Boolean);
  const sentences=[];
  for(const item of new Intl.Segmenter('es-PE',{granularity:'sentence'}).segment(text)){
    const part=item.segment.trim();if(!part)continue;
    // A quoted question inside an instruction is not the end of that action:
    // «¿Qué pasará?» y escuchar… must remain one practical instruction.
    if(sentences.length&&/^\p{Ll}/u.test(part))sentences[sentences.length-1]+=' '+part;
    else sentences.push(part);
  }
  return sentences;
}
export function activityReadingStages(value,{opening,closure}={}){
  const text=savedText(value),matches=[...text.matchAll(/(?:^|\s)(Inicio|Desarrollo|Cierre)\s*:\s*/giu)];
  // The established V3 sequence is situation → child actions → closure. Reuse its saved fields.
  if(text&&!matches.length&&savedText(opening)&&savedText(closure))return {introduction:'',groupedContext:true,
    stages:[{label:'Inicio',text:savedText(opening)},{label:'Desarrollo',text},{label:'Cierre',text:savedText(closure)}]};
  if(matches.length!==3||matches.map(match=>match[1].toLowerCase()).join(',')!=='inicio,desarrollo,cierre')
    return {introduction:'',stages:text?[{label:'Durante la actividad',text}]:[]};
  return {introduction:text.slice(0,matches[0].index).trim(),stages:matches.map((match,index)=>({
    label:['Inicio','Desarrollo','Cierre'][index],text:text.slice(match.index+match[0].length,matches[index+1]?.index??text.length).trim(),
  }))};
}
