"use client";
import type {CSSProperties,ReactNode} from 'react';
import Image from 'next/image';
import {BookOpen,CalendarDays,CalendarRange,ClipboardCheck,Home,type LucideIcon} from 'lucide-react';
import {Sidebar,SidebarContent,SidebarFooter,SidebarGroup,SidebarGroupContent,SidebarHeader,SidebarInset,SidebarMenu,SidebarMenuButton,SidebarMenuItem,SidebarProvider} from '@/components/ui/sidebar';
export const AYNI_MAIN_NAV = [["Mi año","Mi año",CalendarDays],["Hoy","Hoy",Home],["Calendario","Calendario",CalendarRange],["Evaluar","Evaluar",ClipboardCheck],["Documentos","Documentos",BookOpen]] as const;
export type AyniNavigationItems = readonly (readonly [string,string,LucideIcon])[];
type FrameProfile = {section?:string;age_label?:string;school_year?:number;institution_name?:string};
const sentenceCase = (value:string)=>value.charAt(0).toLocaleUpperCase('es-PE')+value.slice(1);
/** Presentational shell extracted unchanged from the current Ayni workspace. Both contracts use it. */
export function TeacherWorkspaceFrame({preparing=false,documentsOnly=false,selectedNavigation,active,today,profile,metrics,items=AYNI_MAIN_NAV,mobileItems=items,navigatePrimary,navigateMobile=navigatePrimary,headerActions,children,overlays}:{
documentsOnly?:boolean;
preparing?:boolean;selectedNavigation:string;active:string;today:string;profile?:FrameProfile|null;metrics?:{students_total?:number}|null;
items?:AyniNavigationItems;mobileItems?:AyniNavigationItems;navigatePrimary:(destination:string)=>void;navigateMobile?:(destination:string)=>void;headerActions?:ReactNode;children:ReactNode;overlays?:ReactNode;
}) {return (
    <SidebarProvider data-ayni-preparing={preparing ? "true" : undefined} style={{ "--sidebar-width": "13.5rem" } as CSSProperties}>
      <a href="#ayni-main" onClick={(event) => { event.preventDefault(); document.getElementById("ayni-main")?.focus(); }} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-[#07576c] focus:shadow-lg">Saltar al contenido</a>
      {!preparing && <Sidebar collapsible="offcanvas" className="border-r border-[#e4eaf3] text-[#19345b]">
        <SidebarHeader className="px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <Image src="/favicon.svg" alt="" width={40} height={40} className="size-10 rounded-xl" />
            <div><p className="text-xl font-extrabold leading-tight tracking-tight">Ayni Aula</p><p className="text-xs text-[#63748d]">{documentsOnly?'Generador de documentos':'Tu aliada en Inicial'}</p></div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <nav aria-label="Navegación principal"><SidebarMenu className="gap-1.5">
                {items.map(([label, destination, Icon]) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton asChild isActive={selectedNavigation === destination} className={`h-11 rounded-xl px-3 text-[15px] transition-colors hover:bg-[#eaf6f9] focus-visible:ring-2 data-[active=true]:bg-[#087d96] data-[active=true]:font-semibold data-[active=true]:text-white`}>
                      <button type="button" aria-current={selectedNavigation === destination ? "page" : undefined} onClick={() => navigatePrimary(destination)}><Icon /><span>{label}</span></button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu></nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="rounded-xl border border-[var(--ayni-panel-border)] bg-white p-3">
            <p className="text-sm font-semibold">{profile?.section ?? "Aula"} · {profile?.age_label ?? "Edad por configurar"}</p>
            <p className="mt-1 text-xs text-[#63748d]">{profile?.school_year ?? "Año sin configurar"} · {metrics?.students_total ?? 0} estudiantes</p>
          </div>
        </SidebarFooter>
      </Sidebar>}

      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between bg-background px-4 md:border-b md:border-[#e7edf7] md:bg-white md:px-8">
          <div className="flex items-center gap-3">
            <Image src="/favicon.svg" alt="" width={44} height={44} className={"size-7 rounded-lg " + (preparing ? "" : "md:hidden")} />
            <div className={preparing ? "" : "hidden"}><p className="text-xs font-semibold leading-tight text-[#1c2e50]">Ayni Aula</p><p className="text-xs text-[#60718a]">{preparing ? "Tu aliada en Inicial" : active === "Documentos" || active === "Biblioteca" ? "Tus documentos, ideas y materiales" : active === "Calendario" ? "Tu año, proyectos y actividades" : active === "Aula" ? "Tus niños y su seguimiento" : active === "Evaluar" ? "Evidencias y decisiones" : active === "Planificar" ? "Diagnóstico, proyectos y actividades" : "Tu aliada en Inicial"}</p></div>
            {!preparing && <div className="hidden md:block"><p className="text-sm font-semibold md:text-base">{sentenceCase(today)}</p><p className="text-xs text-muted-foreground">{profile?.institution_name ?? "Institución por configurar"} · {profile?.section ?? "Aula"}</p></div>}
          </div>
          {!preparing && <div className="flex flex-wrap items-center justify-end gap-2">{documentsOnly&&<span className="text-xs font-semibold text-[#087d96]">Generador de documentos</span>}{headerActions}</div>}
        </header>

        <main id="ayni-main" tabIndex={-1} className={"mx-auto w-full max-w-[1450px] px-4 pt-4 md:px-7 md:pt-8 " + (preparing ? "pb-8" : "pb-28")}>
          {children}
        </main>

        {!preparing && <nav className={`fixed inset-x-0 bottom-0 z-30 grid ${mobileItems.length === 3 ? "grid-cols-3" : mobileItems.length === 4 ? "grid-cols-4" : "grid-cols-5"} border-t border-[#e1e9f2] bg-white/97 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(24,45,80,.05)] backdrop-blur md:hidden`} aria-label="Navegación rápida">
          {mobileItems.map(([label, destination, Icon]) => <button key={label} type="button" aria-current={selectedNavigation === destination ? "page" : undefined} onClick={() => { navigateMobile(destination); }} className={`group mx-0.5 flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] active:bg-[#d8f0f4] ${selectedNavigation === destination ? "text-[#087d96]" : "text-[#60718a]"}`}><span className={`grid h-7 w-11 place-items-center rounded-lg ${selectedNavigation === destination ? "bg-[#dff3f6]" : "group-hover:bg-[#edf6fa]"}`}><Icon className="size-5" /></span><span>{label}</span></button>)}
        </nav>}
      </SidebarInset>
      {overlays}
    </SidebarProvider>
  );
}
