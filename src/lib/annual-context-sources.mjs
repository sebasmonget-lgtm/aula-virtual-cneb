/** Preserve omitted teacher turns verbatim, without interpreting or restoring removed decisions. */
export function completeContextSources(items,texts,importedTurns=[]){
  const result=[...items],covered=new Set([...importedTurns,...items.map(item=>item.source_turn)]);
  texts.forEach((text,source_turn)=>{
    if(covered.has(source_turn)||!text.trim())return;
    for(let offset=0;offset<text.length;offset+=500){const support_text=text.slice(offset,offset+500);result.push({text:support_text,source_turn,support_text});}
  });
  if(result.length>20)throw new TypeError('Hay más de veinte ideas. Revisa y resume el contexto antes de preparar tu año.');
  return result;
}
