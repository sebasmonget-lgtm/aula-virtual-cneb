/** A bounded paragraph must end as a sentence, not as a token-limit fragment. */
export const DOCUMENT_ANNUAL_ORGANIZATION_SCHEMA=Object.freeze({type:'string',minLength:1,maxLength:1200,pattern:'[.!?…][»”"\u0027)]*$'});
export function validateDocumentAnnualOrganization(value){
 if(typeof value!=='string'||!value.trim()||value.length>DOCUMENT_ANNUAL_ORGANIZATION_SCHEMA.maxLength||!new RegExp(DOCUMENT_ANNUAL_ORGANIZATION_SCHEMA.pattern,'u').test(value.trim()))throw new TypeError('La organización del año necesita un texto breve con oraciones completas.');
 return value;
}
