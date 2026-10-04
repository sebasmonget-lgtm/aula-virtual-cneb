// Persist a teacher's intent before provider IO so a disconnected client can resume it.
export function appendConversationTurn(payload,text,safe,{proposal=false}={}) {
  if(!text)return payload;
  return {...payload,messages:[...payload.messages,{role:"teacher",text:text.trim()}],
    safe_texts:[...payload.safe_texts,safe],
    ...(!proposal?{teacher_texts:[...payload.teacher_texts,text.trim()]}:{}),
    pending_turn:true,
    ...(proposal?{candidate:null,draft:null,candidate_sources:[],review:null,created_fact:null,required_competency_ids:undefined}:{})};
}
export function conversationStatus(payload,now=Date.now()) {
  if(payload.lease_until&&Date.parse(payload.lease_until)>now)return "responding";
  return payload.pending_turn?"interrupted":payload.answer?.status??"interrupted";
}
