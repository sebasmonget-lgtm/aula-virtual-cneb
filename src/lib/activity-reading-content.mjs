/** Presentation only: retain every saved sentence; never summarize or generate pedagogy. */
export const savedText=value=>typeof value==='string'?value.trim():'';
export function readingSentences(value){
  if(Array.isArray(value))return value.filter(item=>typeof item==='string'&&item.trim()).map(item=>item.trim());
  const text=savedText(value);if(!text)return [];
  return [...new Intl.Segmenter('es-PE',{granularity:'sentence'}).segment(text)].map(item=>item.segment.trim()).filter(Boolean);
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
