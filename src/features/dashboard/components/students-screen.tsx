"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadStudentPedagogicalProfile, type LocalStudent, type StudentPedagogicalProfile } from "@/src/lib/local-database";

const statusLabels = {
  demonstrated: "Lo demostró",
  with_support: "Con apoyo",
  not_yet_demonstrated: "Aún no",
  insufficient_information: "No pude determinarlo",
} as const;

export function StudentsScreen({ students }: { students: LocalStudent[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentPedagogicalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const visibleStudents = useMemo(() => students.filter((student) => student.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [students, query]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    loadStudentPedagogicalProfile(selectedId).then((nextProfile) => {
      if (active) setProfile(nextProfile);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [selectedId]);

  if (selectedId) return <StudentProfile profile={profile} loading={loading} onBack={() => { setSelectedId(null); setProfile(null); }} />;
  return <section className="mx-auto max-w-4xl space-y-5"><div><p className="text-sm font-semibold text-[#087d96]">Aula activa</p><h1 className="mt-1 text-3xl font-extrabold">Niños</h1></div><label className="flex h-12 items-center gap-2 rounded-2xl border bg-white px-4 text-[#60718a]"><Search className="size-5" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar niño" className="min-w-0 flex-1 bg-transparent outline-none" /></label><div className="space-y-2">{visibleStudents.map((student) => <button key={student.id} type="button" onClick={() => { setProfile(null); setLoading(true); setSelectedId(student.id); }} className="flex w-full items-center justify-between rounded-2xl border bg-white px-5 py-4 text-left transition hover:border-[#8fd4dc] hover:bg-[#f3fcfc]"><span className="font-bold">{student.name}</span><span className="text-sm font-semibold text-[#087d96]">Ver perfil →</span></button>)}</div></section>;
}

function StudentProfile({ profile, loading, onBack }: { profile: StudentPedagogicalProfile | null; loading: boolean; onBack: () => void }) {
  const [tab, setTab] = useState<"Resumen" | "Competencias" | "Evidencias" | "Diagnóstico">("Resumen");
  if (loading || !profile) return <section className="mx-auto max-w-4xl"><p className="text-sm text-muted-foreground">Cargando perfil pedagógico…</p></section>;
  const { student, competencies, recent_relevant_observations: evidence, diagnosis } = profile;
  return <section className="mx-auto max-w-4xl space-y-5"><Button variant="ghost" className="-ml-3" onClick={onBack}><ArrowLeft /> Volver a Niños</Button><header className="rounded-3xl bg-[linear-gradient(135deg,#ffffff,#e9fbfb)] p-6"><p className="text-sm font-semibold text-[#087d96]">Perfil pedagógico</p><h1 className="mt-1 text-3xl font-extrabold">{student.name}</h1><p className="mt-2 text-sm text-[#526b87]">{student.section} · {student.age_years} años · {student.school_year}</p></header><div className="grid grid-cols-4 rounded-2xl border bg-white p-1">{(["Resumen", "Competencias", "Evidencias", "Diagnóstico"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`min-h-10 rounded-xl px-2 text-xs font-bold sm:text-sm ${tab === item ? "bg-[#dff4f5] text-[#087d96]" : "text-[#60718a]"}`}>{item}</button>)}</div>{tab === "Resumen" && <div className="grid gap-3 sm:grid-cols-2"><article className="rounded-2xl bg-[#eef9f2] p-5"><p className="text-sm font-bold">Evidencias</p><p className="mt-2 text-3xl font-extrabold">{evidence.length}</p><p className="mt-1 text-sm text-[#526b87]">registros recientes</p></article><article className="rounded-2xl bg-[#eef8fc] p-5"><p className="text-sm font-bold">Competencias con información</p><p className="mt-2 text-3xl font-extrabold">{competencies.length}</p><p className="mt-1 text-sm text-[#526b87]">sin porcentajes de dominio</p></article></div>}{tab === "Competencias" && <div className="space-y-3">{competencies.length ? competencies.map((competency) => <article key={competency.competency_key} className="rounded-2xl border bg-white p-5"><h2 className="font-extrabold">{competency.competency_text}</h2><p className="mt-2 text-sm text-[#526b87]">{competency.evidence_count} evidencias · Última observación: {competency.last_observed_at ? new Date(competency.last_observed_at).toLocaleDateString("es-PE") : "—"}</p><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{Object.entries(statusLabels).map(([status, label]) => <p key={status}><span className="font-semibold">{label}</span> {competency.observations[status as keyof typeof competency.observations]}</p>)}</div></article>) : <Empty message="Aún no hay evidencias con marca observacional para mostrar una trayectoria." />}</div>}{tab === "Evidencias" && <div className="space-y-2">{evidence.length ? evidence.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-4"><p className="font-bold">{item.activity_title}</p><p className="mt-1 text-sm text-[#526b87]">{item.criterion_text} · {item.observation_status ? statusLabels[item.observation_status] : "Registro anterior · sin marca observacional"}</p>{item.observation_text && <p className="mt-2 text-sm">{item.observation_text}</p>}<p className="mt-2 text-xs text-muted-foreground">{new Date(item.observed_at).toLocaleDateString("es-PE")}{item.media_available ? " · recurso adjunto disponible" : ""}</p></article>) : <Empty message="Aún no hay evidencias registradas." />}</div>}{tab === "Diagnóstico" && <div className="space-y-2">{diagnosis.length ? diagnosis.map((item) => <article key={`${item.competency_id}-${item.updated_at}`} className="rounded-2xl border bg-white p-4"><p className="font-semibold">{item.teacher_confirmed ? "Confirmado por la docente" : "Borrador de diagnóstico"}</p>{item.teacher_interpretation && <p className="mt-2 text-sm text-[#526b87]">{item.teacher_interpretation}</p>}</article>) : <Empty message="No hay registros de diagnóstico para este niño." />}</div>}</section>;
}

function Empty({ message }: { message: string }) { return <article className="rounded-2xl border border-dashed bg-white p-5 text-sm text-[#526b87]">{message}</article>; }
