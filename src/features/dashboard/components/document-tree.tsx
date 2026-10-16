"use client";

import {displayDocumentDate} from "@/src/lib/display-date";
import { useState } from "react";
import {Folder,FileText,ChevronRight,ArrowLeft} from "lucide-react";
import {useWorkspaceParam} from "@/src/lib/workspace-location";
import {Button} from "@/components/ui/button";
import {DOCUMENT_FOLDERS,documentFolderEntries,documentFolderKind,documentsInFolder} from '@/src/lib/document-folder-groups.mjs';

export type TreeDocument = { id:string;kind:string;title:string;status:string;version?:number;
  school_year:number;classroom:string;classroom_id?:string;parent_experience_id?:string;
  period_label?:string|null;date?:string };
export type ArtifactState = {id:string;source_kind:string;source_id:string;source_version:number;
  version:number;status:string};

const sectionName = (kind:string) => DOCUMENT_FOLDERS.find((folder:{id:string;title:string})=>folder.id===kind)?.title??'Documentos';

const folderPath=(value:string)=>/^\d{4}:[^~]{1,100}(~[a-z_]+)?(~[0-9a-f-]{36})?$/i.test(value)?value:undefined;

export function DocumentTree({documents,artifactStates,onOpen}:{documents:TreeDocument[];artifactStates:ArtifactState[];onOpen:(document:TreeDocument)=>void}){
 const [showDrafts,setShowDrafts]=useState(false);
 const [path,setPath]=useWorkspaceParam('Documentos','folder','',folderPath);const [group='',rawKind='',project='']=path.split('~');const kind=documentFolderKind(rawKind);
 const setGroup=(value:string)=>setPath(value),setKind=(value:string)=>setPath(group+(value?'~'+value:'')),setProject=(value:string)=>setPath(group+'~'+kind+(value?'~'+value:''));
 const visible=documents.filter(item=>showDrafts||item.status!=='draft');
 const groupKey=(item:TreeDocument)=>`${item.school_year}:${item.classroom_id??item.classroom}`;
 const groups=[...new Set(visible.map(groupKey))].sort().reverse();
 const items=visible.filter(item=>groupKey(item)===group),parent=items.find(item=>item.id===project&&item.kind==='experience');
 const date=displayDocumentDate;
 const folders=!group?groups.map(key=>({id:key,title:`${visible.find(item=>groupKey(item)===key)?.school_year} · Aula ${visible.find(item=>groupKey(item)===key)?.classroom}`,count:visible.filter(item=>groupKey(item)===key).length})):
 !kind?documentFolderEntries(items):
 kind==='experiences'&&!project?items.filter(item=>item.kind==='experience').map(item=>({id:item.id,title:item.title+` · V${item.version??1}${item.status==='archived'?' · Anterior':''}`,count:items.filter(child=>child.parent_experience_id===item.id).length+1})):[];
 const files:TreeDocument[]=project?items.filter(item=>item.id===project||item.parent_experience_id===project):kind==='experiences'?items.filter(item=>item.kind==='activity'&&!items.some(parent=>parent.id===item.parent_experience_id)):documentsInFolder(items,kind);
 function back(){if(project)setProject('');else if(kind)setKind('');else setGroup('');}
 return <section className="overflow-hidden rounded-2xl border border-[#d6e5ef] bg-white" aria-label="Carpetas de documentos"><div className="flex flex-wrap items-center gap-2 border-b bg-[#f3f8fc] px-4 py-3"><Button size="icon" variant="ghost" aria-label="Volver a la carpeta anterior" disabled={!group} onClick={back}><ArrowLeft className="size-5"/></Button><nav aria-label="Ubicación de documentos" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm text-[#07576c]"><button type="button" className="min-h-11 font-semibold" onClick={()=>setPath('')}>Documentos</button>{group&&<><ChevronRight className="size-4"/><button type="button" className="min-h-11" onClick={()=>setKind('')}>{items[0]?.school_year} · {items[0]?.classroom}</button></>}{kind&&<><ChevronRight className="size-4"/><button type="button" className="min-h-11" onClick={()=>setProject('')}>{sectionName(kind)}</button></>}{parent&&<><ChevronRight className="size-4"/><span className="break-words">{parent.title}</span></>}</nav><label className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showDrafts} onChange={event=>setShowDrafts(event.target.checked)}/>Mostrar borradores</label></div>
 {!!folders.length&&<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">{folders.map(folder=><button type="button" key={folder.id} className="flex min-h-36 min-w-0 flex-col items-center gap-2 rounded-xl border border-[#efe1b7] bg-[#fffaf0] p-3 text-center hover:border-[#86b9d0] hover:bg-[#edf7fa] focus-visible:outline-2 focus-visible:outline-[#087d96]" onClick={()=>{if(!group)setGroup(folder.id);else if(!kind)setKind(folder.id);else setProject(folder.id);}}><Folder className="size-14 fill-[#ffda70] text-[#af7a08]" strokeWidth={1.3}/><strong className="break-words text-sm text-[#172b52]">{folder.title}</strong><span className="text-xs text-[#526b87]">{folder.count} documentos</span></button>)}</div>}
 {!!files.length&&<ul className="divide-y">{files.sort((a,b)=>(a.date??'').localeCompare(b.date??'')).map(item=>{const artifact=artifactStates.find(state=>state.source_kind===item.kind&&state.source_id===item.id&&state.source_version===item.version);return <li key={`${item.kind}-${item.id}`}><button type="button" className="flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#edf7fa] focus-visible:outline-2 focus-visible:outline-[#087d96]" onClick={()=>onOpen(item)}><FileText className="size-9 shrink-0 text-[#087d96]"/><span className="min-w-0 flex-1"><strong className="block break-words text-sm text-[#172b52]">{item.title}</strong><span className="text-xs text-[#526b87]">{date(item.date)} · {item.status==='draft'?'Borrador':item.status==='archived'?'Versión anterior':'Confirmado'}{item.version?` · V${item.version}`:''}{artifact?.status==='confirmed'?' · Word listo':''}</span></span><span className="text-sm font-semibold text-[#07576c]">Abrir</span></button></li>;})}</ul>}
 {!folders.length&&!files.length&&<p className="p-5 text-sm text-[#526b87]">Esta carpeta aún no tiene documentos.</p>}
 </section>;
}
