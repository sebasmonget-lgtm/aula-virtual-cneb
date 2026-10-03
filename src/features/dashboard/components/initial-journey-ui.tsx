"use client";
import Image from "next/image";

export function JourneySteps({ active, onStep }: { active: number; onStep?: (step: number) => void }) {
  const later = active > 3;
  const steps = later ? [[4,"Conversar","Con Ayni"],[5,"Preparando","Mi año"],[6,"Mi año","Plan anual"]] : [[1,"Familias","Conocemos a las familias"],[2,"Observar","Qué hemos visto"],[3,"Mi año","Plan anual"]];
  return <nav aria-label="Recorrido inicial" className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-3 sm:px-8 sm:py-5">{steps.map(([n,label,sub],i)=><div key={n} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4"><button type="button" disabled={!onStep} onClick={()=>onStep?.(Number(n))} aria-current={Number(n)===active?"step":undefined} className="flex min-w-0 items-center gap-2 text-left disabled:opacity-100 sm:gap-3"><span className={`grid size-8 sm:size-10 shrink-0 place-items-center rounded-full border text-lg font-bold sm:size-12 ${Number(n)===active?"border-[#087d96] bg-[#087d96] text-white":"border-[#b9d5df] text-[#526b87]"}`}>{n}</span><span className="min-w-0"><span className={`block text-sm font-bold sm:text-base ${Number(n)===active?"text-[#087d96]":"text-[#172b52]"}`}>{label}</span><span className="hidden text-xs text-[#526b87] sm:block">{sub}</span></span></button>{i<2&&<span aria-hidden="true" className="mx-2 hidden h-px flex-1 bg-[#c9dce9] md:block" />}</div>)}</nav>;
}
export function AyniMascot({ size = "small" }: {size?:"small"|"large"}) {
  return <Image src="/ayni-profesora.webp" width={640} height={424} alt="" className={size==="large"?"mx-auto h-auto w-64 sm:w-80":"h-auto w-16 shrink-0 sm:w-28"} />;
}
