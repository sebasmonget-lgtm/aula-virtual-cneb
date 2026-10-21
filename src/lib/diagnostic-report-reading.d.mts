export type DiagnosticReportReading={competency_id:string;summary:string;next_step:string;scope:'individual'|'subgroup'|'information_gap';source_record_ids:string[]};
export function diagnosticCompetencyReading(snapshot:unknown,competencyId:string):DiagnosticReportReading|null;
export function diagnosticReportReadings(document:unknown):DiagnosticReportReading[];
export function diagnosticRecordExcerpt(text:unknown,limit?:number):string;
export const diagnosticReportPurpose:string;
