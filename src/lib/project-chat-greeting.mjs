/** Local presentation: opening a conversation never requires a model call. */
export function projectChatGreeting(name, creating = false) {
  const first = typeof name === 'string' ? name.trim().split(/\s+/u)[0] : '';
  const hello = first ? `Hola, ${first}.` : 'Hola.';
  return `${hello} ${creating ? 'Vamos a crear otro proyecto para este tramo. ¿Qué te gustaría crear y qué quisieras que hagan los niños?\n\nHabilitaré «Crear el nuevo proyecto» cuando tenga la información necesaria.' : '¿Qué te gustaría ajustar en este proyecto? Cuéntame tu idea y la prepararemos juntas.'}`;
}
export function initialProjectChat(name, creating = false) {
  return {id:null,revision:0,messages:[{role:'assistant',text:projectChatGreeting(name,creating)}],ready:false,chips:[],pendingTurn:null,status:'new'};
}
export function presentProjectChat(chat, name, creating = false) {
  return {...chat,messages:chat.messages.length ? chat.messages.map((message,index)=>index===0&&message.role==='assistant'?{...message,text:projectChatGreeting(name,creating)}:message) : initialProjectChat(name,creating).messages};
}
