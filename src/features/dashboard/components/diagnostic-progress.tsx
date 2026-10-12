export function DiagnosticProgress({ label, count, total, loading = false, error = "" }: { label: string; count: number; total: number; loading?: boolean; error?: string }) {
  const percent = total ? Math.round(count / total * 100) : 0;
  return <div className="space-y-2">
    <p className="flex flex-wrap justify-between gap-2 text-sm font-semibold text-[#294b64]"><span>{label}</span>{!loading && !error && <span className="tabular-nums">{count} de {total} · {percent} %</span>}</p>
    {error ? <p role="alert" className="text-sm text-[#88591d]">{error}</p> : loading ? <p role="status" className="text-sm text-[#526b87]">Consultando el progreso guardado…</p> : <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${count} de ${total}`} className="h-2 overflow-hidden rounded-full bg-[#dce9f2]"><div className="h-full rounded-full bg-[#087d96]" style={{width:`${percent}%`}}/></div>}
  </div>;
}
