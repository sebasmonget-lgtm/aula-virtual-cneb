// Constrain newly generated Spanish prose before decoding. Stored sources and
// fixed enum values (names/titles supplied by the teacher) are never rewritten.
const spanishCharacter='[\\u0009\\u000A\\u000D\\u0020-\\u007E\\u00A0-\\u036F\\u1E00-\\u1EFF\\u2000-\\u206F\\u20A0-\\u20CF\\u2100-\\u27FF]';
export function documentSpanishProseSchema(schema){
 const result=structuredClone(schema);
 const seen=new WeakSet();
 const visit=value=>{
  if(!value||typeof value!=='object'||seen.has(value))return;
  seen.add(value);
  if((value.type==='string'||Array.isArray(value.type)&&value.type.includes('string'))&&value.maxLength&&!value.enum){
   const prefix='^'+spanishCharacter+'*';
   if(!value.pattern?.startsWith(prefix))value.pattern=prefix+(value.pattern??'$');
  }
  for(const [key,child]of Object.entries(value))if(key!=='enum'){
   if(Array.isArray(child))child.forEach(visit);else visit(child);
  }
 };
 visit(result);return result;
}
