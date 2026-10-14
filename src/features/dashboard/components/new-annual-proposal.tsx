"use client";
import {useEffect,useRef} from "react";
import {AnnualProposalChangeDialog,type ChangeProposal,type ProjectChat,type ProposalPreviewState} from "./annual-proposal-change-dialog";
import {apiFetch,apiJson} from "@/src/lib/ayni-api-fetch";
import {localDatabaseApiUrl} from "@/src/lib/local-database";
import type {ReactNode} from "react";
type Session={id:string;revision:number;status:string;approved?:boolean;messages:{role:string;text:string}[];candidate:ChangeProposal|null;required_competency_ids?:string[]};
export function NewAnnualProposal({open,onOpenChange,planId,revision,onApproved,curriculumReference=[],reviewPeriodId,row,modeActions,library}:{reviewPeriodId?:string;open:boolean;onOpenChange:(open:boolean)=>void;planId:string;revision:number;onApproved:(id:string,candidate?:ChangeProposal)=>Promise<unknown>;curriculumReference?:{id:string;name:string}[];row?:ChangeProposal;modeActions?:(disabled:boolean)=>ReactNode;library?:ReactNode}){
 const saved=useRef<Session|null>(null),start=useRef<Promise<Session>|null>(null),approvedPlan=useRef<string|null>(null);
 useEffect(()=>{if(!open){saved.current=null;start.current=null;approvedPlan.current=null;}},[open]);
 async function api(operation:string,body?:unknown){const response=await apiFetch(`${localDatabaseApiUrl}/api/annual-journey/${planId}/new-proposal/${operation}`,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const result=await apiJson<Session&{error?:string}>(response);if(!response.ok)throw Error(result.error??'No pudimos recuperar tu idea.');if(Array.isArray(result.messages))saved.current=result;return result;}
 async function initialize(){if(saved.current)return saved.current;if(!start.current)start.current=(async()=>{const value=await api('conversation'+(reviewPeriodId?'?reviewPeriodId='+reviewPeriodId:'')).catch(()=>null);if(value&&!value.approved)return value;return api('conversation',{expectedRevision:revision,reviewPeriodId});})();return start.current;}
 const chat=(s:Session):ProjectChat=>({id:s.id,revision:s.revision,messages:s.messages,ready:s.status==='ready',chips:[],pendingTurn:s.status==='interrupted'?s.id:null,status:s.status});
 const preview=(s:Session):ProposalPreviewState=>({planId,revision,preview:s.candidate?{id:s.id,proposalId:s.candidate.proposal_id,request:'Tu nuevo proyecto',changes:['Nuevo proyecto'],proposal:{...s.candidate,period:row?.period??'',duration_weeks:row?.duration_weeks??0,planned_start_date:row?.planned_start_date,planned_end_date:row?.planned_end_date}}:null});
 if(!open)return null;
 return <AnnualProposalChangeDialog creating row={row??{proposal_id:'library',title:'Nueva propuesta',purpose:'Cuéntame qué quieres crear y qué harán los niños.',primary_competency_ids:[],period:'',duration_weeks:0,children_actions:[],materials:[]}} index={0} names={new Map(curriculumReference.map(c=>[c.id,c.name]))} hasConfirmedYear={false} onClose={()=>onOpenChange(false)} modeActions={modeActions} library={library}
 onChatRead={async()=>chat(await initialize())} onRead={async()=>preview(await initialize())}
 onSend={async(text,_chat,_turn,retry)=>{const s=await initialize();return chat(await api('conversation',{expectedRevision:revision,reviewPeriodId,id:s.id,revision:s.revision,...(!retry?{text}:{})}));}}
 onGenerate={async()=>{const s=await initialize();return preview(await api('generate',{expectedRevision:revision,reviewPeriodId,id:s.id,revision:s.revision,requiredCompetencyIds:s.required_competency_ids??[],experienceType:'project'}));}}
 onApply={async()=>{const s=await initialize(),candidate=s.candidate;if(!approvedPlan.current){try{approvedPlan.current=(await api('approve',{expectedRevision:revision,reviewPeriodId,id:s.id,revision:s.revision})).id;}catch(cause){const recovered=await api('conversation?id='+s.id).catch(()=>null);if(!recovered?.approved)throw cause;approvedPlan.current=planId;}}await onApproved(approvedPlan.current,candidate??undefined);}}
 onDiscard={async()=>{}}/>;
}
