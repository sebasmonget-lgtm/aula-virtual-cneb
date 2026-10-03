"use client";
import Image from "next/image";

export function JourneySteps({ active, onStep }: { active: number; onStep?: (step: number) => void }) {
  const steps = [[1,"Familias"],[2,"Observar"],[3,"Revisar"],[4,"Conversar"],[5,"Preparando"],[6,"Mi año"]] as const;
  return <nav aria-label="Recorrido inicial" className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-2xl bg-white p-3 sm:grid-cols-3 sm:p-5 xl:grid-cols-6">{steps.map(([n,label])=><button key={n} type="button" disabled={!onStep || n>3} onClick={()=>onStep?.(n)} aria-current={n===active?"step":undefined} className="flex min-w-0 items-center gap-2 text-left disabled:opacity-100"><span className={`grid size-8 shrink-0 place-items-center rounded-full border text-lg font-bold sm:size-10 ${n===active?"border-[#087d96] bg-[#087d96] text-white":"border-[#b9d5df] text-[#526b87]"}`}>{n}</span><span className={`text-sm font-bold ${n===active?"text-[#087d96]":"text-[#172b52]"}`}>{label}</span></button>)}</nav>;
}
export function AyniMascot({ size = "small", pose="original" }: {size?:"small"|"medium"|"large";pose?:"original"|"interview"|"thinking"}) {
  return <Image src={pose==="original"?"/ayni-profesora.webp":`/ayni-${pose}-v2.webp`} width={640} height={424} alt="" className={size==="large"?"mx-auto h-auto w-64 sm:w-80":size==="medium"?"h-auto w-24 shrink-0 sm:w-36":"h-auto w-16 shrink-0 sm:w-28"} />;
}
