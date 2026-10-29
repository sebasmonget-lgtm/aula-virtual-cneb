import { apiFetch } from './ayni-api-fetch';
import { localDatabaseApiUrl } from './local-database';

const prefix = '/api/multi-age';
export function multiAgeDownloadUrl(path: string) { return `${localDatabaseApiUrl}${prefix}${path}`; }

/** Receipts survive a lost response/reload, without storing children's text in browser storage. */
export async function multiAgeAppRequest<T>(path: string, input?: Record<string, unknown>): Promise<T> {
  let receiptKey: string | null = null;
  let body = input;
  if (input) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(path + JSON.stringify(input)));
    receiptKey = 'ayni:multi-age-request:' + Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('');
    let requestId = crypto.randomUUID();
    try { requestId = sessionStorage.getItem(receiptKey) ?? requestId; sessionStorage.setItem(receiptKey, requestId); } catch { /* Server still enforces idempotency in this attempt. */ }
    body = { ...input, clientRequestId: requestId };
  }
  const response = await apiFetch(multiAgeDownloadUrl(path), body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const value = await response.json();
  if (!response.ok) throw new Error(value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : 'No se pudo completar la operación.');
  // Retain the receipt until the next successful workspace read, including a lost refresh.
  if (!input && path === '/state') {
    try { for (let i = sessionStorage.length - 1; i >= 0; i--) { const key = sessionStorage.key(i); if (key?.startsWith('ayni:multi-age-request:')) sessionStorage.removeItem(key); } } catch { /* Optional browser storage. */ }
  }
  return value as T;
}

export function annualActivityBlueprint(proposal: import('./multi-age-app-types').AnnualProposal['proposals'][number], ages: number[], competencyId: string|string[], date: string): import('./multi-age-app-types').ActivityBlueprint {
  const ids=typeof competencyId==='string'?[competencyId]:competencyId;
  return {
    title: proposal.title, purpose: proposal.purpose, occursOn: date, participantAges: ages,
    commonSequence: { opening: proposal.common_invitation, development: proposal.one_teacher_organization, closure: 'Invitar a compartir lo que eligieron o descubrieron, sin obligar a intervenir. Registrar solo lo observado.' },
    criteriaFamilies: ids.map(id=>({ competency_id:id, variants: ages.filter(age=>proposal.opportunities.some(o=>o.age===age&&o.competency_id===id)).map(age => {
      const own = proposal.opportunities.find(o => o.age === age && o.competency_id === id);
      if (!own) throw new Error('La competencia requiere una oportunidad propia para cada edad.');
      return { curricular_age: age, criterion_text: own.child_action, expected_evidence: own.observation, observation_moments: ['development'], official_performance_refs: [...own.official_performance_refs] };
    }) })),
  };
}
