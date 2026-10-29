/** Bounded lexical/structural QA. It does not replace a human reading of the dialogue. */
export function generatorChatChecks({text,suggestions=[]},{closing=false}={}){
 const plain=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const clauses=plain.split(/[.!?\n]+/).filter(s=>!/(?:no necesitas?|no necesito|no hace falta|no es necesario)/.test(s));
 const request=/(?:envia|comparte|completa|realiza|registra|necesito|necesitamos|falta|pendiente)[^.!?\n]{0,70}(?:diagnostic|evidencias individuales|niveles de logro)|(?:diagnostic|informacion diagnostica)[^.!?\n]{0,30}(?:pendiente|insuficiente)/;
 const questions=(text.match(/\?/g)??[]).length;
 return {
   noDiagnosisRequest:!clauses.some(s=>request.test(s)),
   atMostOneQuestion:questions<=1,
   suggestionsAreAnswers:suggestions.every(s=>!/[¿?]/.test(s)),
   concise:text.trim().split(/\s+/).length<=180,
   noClaimedGeneration:!/(?:ya he|ya esta|he)\s+(?:creado|generado|guardado|confirmado)/.test(plain),
   ...(closing?{respectsClosing:questions===0&&suggestions.length===0&&/crear mi ano/.test(plain)}:{})
 };
}
