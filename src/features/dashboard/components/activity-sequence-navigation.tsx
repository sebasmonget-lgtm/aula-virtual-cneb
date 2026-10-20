"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,ArrowRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {apiFetch} from "@/src/lib/ayni-api-fetch";
import {localDatabaseApiUrl} from "@/src/lib/local-database";
type Item={id:string;title:string};
/** Reading another guide never reschedules it or marks either activity complete. */
export function ActivitySequenceNavigation({activityId,onActivity,items}:{activityId:string;onActivity:(id:string)=>void;items?:Item[]}){
 const [loaded,setLoaded]=useState<{id:string;items:Item[]}|null>(null);
 useEffect(()=>{if(items)return;const controller=new AbortController();void apiFetch(`${localDatabaseApiUrl}/api/activities/${activityId}/companions`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();return response.json() as Promise<{activities:Item[]}>;}).then(value=>{if(!controller.signal.aborted)setLoaded({id:activityId,items:value.activities});}).catch(()=>{});return()=>controller.abort();},[activityId,items]);
 const sequence=items??(loaded?.id===activityId?loaded.items:[]),position=sequence.findIndex(item=>item.id===activityId);
 return <nav className="flex flex-wrap justify-between gap-3" aria-label="Actividades del proyecto"><Button variant="outline" disabled={position<=0} onClick={()=>onActivity(sequence[position-1].id)}><ArrowLeft size={18}/>Actividad anterior</Button><Button variant="outline" disabled={position<0||position>=sequence.length-1} onClick={()=>onActivity(sequence[position+1].id)}>Siguiente actividad<ArrowRight size={18}/></Button></nav>;
}
