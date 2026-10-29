import test from 'node:test';
import assert from 'node:assert/strict';
import {DOCUMENT_ANNUAL_ORGANIZATION_SCHEMA,validateDocumentAnnualOrganization} from './document-generator-annual-organization.mjs';
import {DOCUMENT_GENERATOR_ANNUAL_SCHEMA,MULTI_AGE_ANNUAL_SCHEMA} from './multi-age-planning-generation.mjs';
test('la organización nueva impide finales truncados y conserva intacto el esquema diario',()=>{
 for(const text of ['Agrupamientos flexibles para jugar y explorar.','¿Cómo podemos organizarnos?','Se recogerán las decisiones de los niños…'])assert.equal(validateDocumentAnnualOrganization(text),text);
 for(const text of ['El recorrido continúa con','Se prevé un dispositivo: no,','x'.repeat(1200)+'.','',null])assert.throws(()=>validateDocumentAnnualOrganization(text),/oraciones completas/);
 assert.deepEqual(DOCUMENT_GENERATOR_ANNUAL_SCHEMA.properties.organization,DOCUMENT_ANNUAL_ORGANIZATION_SCHEMA);
 assert.equal(MULTI_AGE_ANNUAL_SCHEMA.properties.organization.maxLength,2400);assert.equal(MULTI_AGE_ANNUAL_SCHEMA.properties.organization.pattern,undefined);
});
