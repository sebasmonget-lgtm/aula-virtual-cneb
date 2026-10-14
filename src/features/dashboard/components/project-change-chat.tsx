"use client";
import {AnnualProposalChangeDialog,type ChangeProposal,type ProjectChat,type ProposalPreviewState} from "./annual-proposal-change-dialog";
import {apiFetch,apiJson} from "@/src/lib/ayni-api-fetch";
import {localDatabaseApiUrl} from "@/src/lib/local-database";
import {annualTeacherProposalView} from "@/src/lib/annual-teacher-display.mjs";
import type {PreparationJob} from "./preparation-progress";
type Plan={id:string;revision:number;status:string;supersedes_plan_id?:string;proposal:{proposed_experiences:ChangeProposal[]};display_subjects?:Record<string,string>};
async function api<T>(path:string,body?:unknown):Promise<T>{const response=await apiFetch(localDatabaseApiUrl+path,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const value=await apiJson<T&{error?:string}>(response);if(!response.ok)throw new Error(value.error??"No pudimos recuperar el cambio.");return value;}
export function ProjectChangeChat({planId,row,index,names,hasConfirmedYear,onClose,onApplied,futureProjectId,onPrepared}:{planId:string;row:ChangeProposal;index:number;names:Map<string,string>;hasConfirmedYear:boolean;onClose:()=>void;onApplied:(planId:string)=>Promise<void>;futureProjectId?:string;onPrepared?:(job:PreparationJob)=>void}){
  async function plans(){return api<{draft:Plan|null;active:Plan|null;archived:Plan[]}>('/api/annual-plans/current');}
  async function current(){const value=await plans();const selected=[value.draft,value.active,...value.archived].find(plan=>plan?.id===planId);if(!selected)throw new Error('Mi año cambió. Vuelve a abrir el proyecto.');return {value,selected};}
  async function draft(){const {value,selected}=await current();if(selected.status==='draft')return selected;
    if(value.draft){if(!value.draft.proposal.proposed_experiences.some(proposal=>proposal.proposal_id===row.proposal_id))throw new Error('La revisión actual no contiene este proyecto. Revisa Mi año.');return value.draft;}
    return api<Plan>(`/api/annual-journey/${selected.id}/copy`,{expectedRevision:selected.revision});}
  const view=(state:ProposalPreviewState,subjects?:Record<string,string>)=>state.preview?{...state,preview:{...state.preview,proposal:annualTeacherProposalView(state.preview.proposal,subjects)}}:state;
  return <AnnualProposalChangeDialog row={row} index={index} names={names} hasConfirmedYear={hasConfirmedYear} onClose={onClose}
    futureOnly={!!futureProjectId}
    onChatRead={()=>api<ProjectChat>(`/api/annual-journey/${planId}/proposal-chat?proposalId=${row.proposal_id}${futureProjectId?'&projectId='+futureProjectId:''}`)}
    onSend={(text,chat,turnId,retry,acceptPotentialRepeat)=>api<ProjectChat>(`/api/annual-journey/${planId}/proposal-chat`,{proposalId:row.proposal_id,text,turnId,conversationId:chat.id,expectedConversationRevision:chat.revision,retry,acceptPotentialRepeat,projectId:futureProjectId})}
    onRead={async()=>{if(futureProjectId)return api<ProposalPreviewState|null>(`/api/preparation/projects/future-preview?projectId=${futureProjectId}`);const {value,selected}=await current();const target=value.draft?.proposal.proposed_experiences.some(proposal=>proposal.proposal_id===row.proposal_id)?value.draft:selected;if(target.status!=='draft')return null;return view(await api<ProposalPreviewState>(`/api/annual-journey/${target.id}/proposal-preview?proposalId=${row.proposal_id}`),target.display_subjects);}}
    onGenerate={async chat=>{if(futureProjectId)return api<ProposalPreviewState>('/api/preparation/projects/future-preview',{projectId:futureProjectId,conversationId:chat.id,conversationRevision:chat.revision});const target=await draft();let result:ProposalPreviewState;
      try{result=await api<ProposalPreviewState>(`/api/annual-journey/${target.id}/proposal-preview`,{expectedRevision:Number(target.revision),proposalId:row.proposal_id,conversationId:chat.id,conversationRevision:chat.revision});}
      catch(cause){const recovered=await api<ProposalPreviewState>(`/api/annual-journey/${target.id}/proposal-preview?proposalId=${row.proposal_id}`).catch(()=>null);if(!recovered?.preview||recovered.preview.conversationId!==chat.id||recovered.preview.conversationRevision!==chat.revision)throw cause;result=recovered;}
      return view(result,target.display_subjects);}}
    onApply={async state=>{if(futureProjectId){onPrepared?.(await api<PreparationJob>('/api/preparation/projects/future-complete',{projectId:state.planId,expectedRevision:state.revision,accepted:true}));return;}await api(`/api/annual-journey/${state.planId}/proposal-preview/accept`,{expectedRevision:state.revision,previewId:state.preview!.id});await onApplied(state.planId);}}
    onDiscard={async state=>{if(futureProjectId)return;const latest=await api<ProposalPreviewState>(`/api/annual-journey/${state.planId}/proposal-preview?proposalId=${row.proposal_id}`);if(latest.preview?.id===state.preview?.id)await api(`/api/annual-journey/${state.planId}/proposal-preview/discard`,{expectedRevision:latest.revision,previewId:latest.preview!.id});}}/>;
}
