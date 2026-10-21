/** Preserve omitted pedagogical turns; an explicitly classified app-only turn stays in the conversation. */
export function completeContextSources(items,texts,importedTurns=[],nonContextTurns=[]){
  if(!Array.isArray(nonContextTurns)||nonContextTurns.length>20||new Set(nonContextTurns).size!==nonContextTurns.length||
    nonContextTurns.some(turn=>!Number.isInteger(turn)||turn<0||turn>=texts.length||items.some(item=>item.source_turn===turn)))
    throw new TypeError('No pude distinguir las indicaciones de uso de tus decisiones pedagógicas. La conversación se conserva.');
  const result=[...items],covered=new Set([...importedTurns,...nonContextTurns,...items.map(item=>item.source_turn)]);
  texts.forEach((text,source_turn)=>{
    if(covered.has(source_turn)||!text.trim())return;
    for(let offset=0;offset<text.length;offset+=500){const support_text=text.slice(offset,offset+500);result.push({text:support_text,source_turn,support_text});}
  });
  if(result.length>20)throw new TypeError('Hay más de veinte ideas. Revisa y resume el contexto antes de preparar tu año.');
  return result;
}
