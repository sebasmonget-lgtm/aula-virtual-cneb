type ProjectRow = { id: string; revision: number; status: string; details: object };
export function combineProjectContext(note: string, extras?: Record<string, string>): string;
export function prepareSimpleProject<T extends ProjectRow>(input: {
  request: <R>(path: string, body?: unknown, method?: string) => Promise<R>;
  planId: string; proposalId: string;
  proposal: { purpose: string; rationale: string; primary_competency_ids: string[] };
  additionalContext?: string; experience?: T | null; feedback?: object;
  onCheckpoint?: (row: T) => void;
}): Promise<T>;
