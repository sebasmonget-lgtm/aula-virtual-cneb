"use client";
import { AyniMascot } from "./initial-journey-ui";
export function AyniChatMessage({role,text}:{role:string;text:string}) {
  return <div className={`flex min-w-0 items-start gap-2 ${role==="teacher"?"justify-end":""}`}>
    {role==="assistant"&&<span className="w-12 shrink-0 sm:w-20"><AyniMascot/></span>}
    <p className={`min-w-0 max-w-xl whitespace-pre-wrap break-words rounded-2xl p-4 leading-relaxed ${role==="teacher"?"border border-[#d6e5ef] bg-white":"bg-[#deeff4]"}`}>{text}</p>
  </div>;
}
export function AyniTyping({label="Ayni está escribiendo…"}:{label?:string}) {
  return <div role="status" className="flex items-center gap-3 py-3 text-sm text-[#075d70]"><span className="w-12 shrink-0 sm:w-20"><AyniMascot pose="thinking"/></span><span>{label}<span aria-hidden="true" className="ml-2 inline-flex gap-1">{[0,1,2].map(n=><span key={n} className="size-2 rounded-full bg-[#087d96] motion-safe:animate-bounce" style={{animationDelay:`${n*160}ms`}}/>)}</span></span></div>;
}
