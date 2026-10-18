import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { loadDiagnosticCatalog, DEFAULT_DIAGNOSTIC_CATALOG_PATH } from "../src/lib/diagnostic-catalog-v4.mjs";
import { buildDiagnosticExperienceCatalog } from "../src/lib/diagnostic-experiences-v4.mjs";
import { cardIsApplicable } from "../src/lib/ai-context-builder-v4.mjs";

const path = process.argv[2] ?? DEFAULT_DIAGNOSTIC_CATALOG_PATH;
const kb = await loadKnowledgeBaseV4();
const catalog = await loadDiagnosticCatalog(kb.competencyCards, path);
console.log(`Catálogo válido: ${catalog.version} · ${catalog.experiences.length} experiencias · estado ${catalog.status}.`);
for(const age of [3,4,5])for(const castellanoL2Applicable of [false,true])for(const religionApplicable of [false,true]){
  const options={age,castellanoL2Applicable,religionApplicable};
  const experiences=buildDiagnosticExperienceCatalog(kb,options,catalog),covered=new Set(experiences.flatMap(row=>row.competencies.map(card=>card.id)));
  const missing=kb.competencyCards.filter(card=>card.runtime_selectable_by_age?.[String(age)]&&cardIsApplicable(card,options)&&!covered.has(card.id));
  if(missing.length)throw new Error(`Faltan oportunidades diagnósticas a los ${age} años: ${missing.map(card=>card.id).join(', ')}.`);
}
console.log('Cobertura de oportunidades válida para 3, 4 y 5 años y las cuatro combinaciones de aplicabilidad L2/Religión. No acredita ejecución ni logros.');
if (catalog.status === "development_fixture") console.log("Contenido de desarrollo: requiere revisión editorial antes de uso real.");
