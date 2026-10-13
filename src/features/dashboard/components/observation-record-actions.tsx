"use client";
import { MoreVertical, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export function ObservationRecordActions({name,disabled,onEdit,onDelete}:{name:string;disabled:boolean;onEdit:()=>void;onDelete:()=>void}){
 const [open,setOpen]=useState(false),trigger=useRef<HTMLButtonElement>(null),content=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const doc=trigger.current?.ownerDocument;if(!doc)return;const outside=(event:MouseEvent)=>{const node=event.target as Node;if(!trigger.current?.contains(node)&&!content.current?.contains(node))setOpen(false);};doc.addEventListener('click',outside,true);return()=>doc.removeEventListener('click',outside,true);},[open]);
 return <><Button variant="outline" disabled={disabled} onClick={onEdit}><Pencil size={16} aria-hidden="true"/>Editar</Button><DropdownMenu modal={false} open={open} onOpenChange={setOpen}><DropdownMenuTrigger asChild><Button ref={trigger} variant="ghost" size="icon" disabled={disabled} aria-label={`Más acciones de la observación de ${name}`} className="size-11"><MoreVertical size={18}/></Button></DropdownMenuTrigger><DropdownMenuContent ref={content} align="end"><DropdownMenuItem className="min-h-11 text-red-700 focus:text-red-700" onSelect={onDelete}>Eliminar observación</DropdownMenuItem></DropdownMenuContent></DropdownMenu></>;
}
