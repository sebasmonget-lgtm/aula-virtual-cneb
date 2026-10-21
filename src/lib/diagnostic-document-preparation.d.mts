import type {DiagnosticGeneration,DiagnosticGroupDetails} from './local-database';
export function hasDiagnosticDocumentText(details:DiagnosticGroupDetails|null|undefined):boolean;
export function prepareDiagnosticDocumentDraft(api:{prepare:()=>Promise<{id:string;details:DiagnosticGroupDetails}>;load:(id:string)=>Promise<DiagnosticGeneration>;start:(id:string,acceptPotentialRepeat:boolean)=>Promise<DiagnosticGeneration>},options?:{allowRetry?:boolean;acceptPotentialRepeat?:boolean}):Promise<{draftId:string;details:DiagnosticGroupDetails|null;job:DiagnosticGeneration|null}>;
