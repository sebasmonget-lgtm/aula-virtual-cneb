import { officialPerformanceContext, validateOfficialPerformanceRefs, OFFICIAL_PERFORMANCE_VERSION } from './official-performance-references.mjs';
import { loadKnowledgeBaseV4 } from './knowledge-base-v4.mjs';
import { competencyApplicability } from './competency-applicability.mjs';
import { curriculumAges } from './classroom-curriculum-scope.mjs';

export const MULTI_AGE_PROMPT_VERSION='multi-age-local-v2';
export const MULTI_AGE_PLANNING_INSTRUCTIONS=`Prepara una experiencia compartida para los grupos autorizados. Conserva la competencia y edad de cada referente recibido. Distingue hechos observados, reportes familiares y decisiones docentes. No inventes recursos, actuaciones, dificultades, niveles ni apoyos realizados. Organiza momentos comunes y acompañamiento viable con la profesora disponible; no asignes a los mayores el cuidado de los pequeños. Cada variante tiene criterio, evidencia esperada y momento propios. Si no hay desempeño específico conserva el referente de ciclo sin copiar otra edad. Si recibes un proyecto confirmado, prepara solo la actividad de la posición y fecha recibidas: hereda exactamente sus referentes por competencia y edad, conserva el proyecto y considera las actividades anteriores para ofrecer continuidad sin repetirlas. Las indicaciones docentes confirmadas orientan la propuesta, nunca acreditan una actuación infantil. No conviertas órdenes de aplicación o preguntas en el tema de la actividad. Devuelve solo el contrato solicitado. Al reparar conserva la tarea, fechas, destinatarios y referentes; nunca elimines una edad para pasar la validación.`;

const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const keys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k));
export function validCurriculumDay(value) {
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
export async function validateMultiAgeBlueprint(value,scope) {
  if(!keys(value,['title','purpose','occursOn','participantAges','commonSequence','criteriaFamilies'])||!text(value.title,180)||!text(value.purpose,1000)||!validCurriculumDay(value.occursOn)
    ||value.occursOn<scope.starts_on||value.occursOn>scope.ends_on)throw new TypeError('Revisa título, propósito y fecha de la actividad.');
  const ages=curriculumAges(value.participantAges);
  if(ages.some(age=>!scope.ages.includes(age)))throw new TypeError('La actividad contiene un grupo que el aula no atiende.');
  if(!keys(value.commonSequence,['opening','development','closure'])||['opening','development','closure'].some(k=>!text(value.commonSequence[k],2400)))
    throw new TypeError('Completa los tres momentos compartidos.');
  const families=value.criteriaFamilies;
  if(!Array.isArray(families)||families.length<1||families.length>6||new Set(families.map(f=>f.competency_id)).size!==families.length)
    throw new TypeError('Selecciona entre una y seis familias de competencias distintas.');
  const kb=await loadKnowledgeBaseV4(),covered=new Set();
  for(const family of families){
    if(!keys(family,['competency_id','variants'])||!Array.isArray(family.variants)||!family.variants.length||family.variants.length>3)
      throw new TypeError('Cada competencia necesita variantes explícitas.');
    const card=kb.competencyCards.find(c=>c.id===family.competency_id),seen=new Set();
    for(const v of family.variants){
      if(!keys(v,['curricular_age','criterion_text','expected_evidence','observation_moments','official_performance_refs'])||!ages.includes(v.curricular_age)||seen.has(v.curricular_age)
        ||!text(v.criterion_text,1000)||!text(v.expected_evidence,1000)||!Array.isArray(v.observation_moments)||!v.observation_moments.length
        ||v.observation_moments.length>3||new Set(v.observation_moments).size!==v.observation_moments.length||v.observation_moments.some(m=>!['opening','development','closure'].includes(m)))
        throw new TypeError('Las variantes requieren edad, criterio, evidencia y momentos válidos.');
      if(!competencyApplicability(card,v.curricular_age,{castellanoL2Applicable:scope.castellano_l2_applicable,religionApplicable:scope.religion_applicable}).planning_available)
        throw new TypeError('La competencia no está habilitada en este contexto.');
      validateOfficialPerformanceRefs(v.official_performance_refs,family.competency_id,v.curricular_age,{required:true});
      seen.add(v.curricular_age);covered.add(v.curricular_age);
    }
  }
  if(ages.some(age=>!covered.has(age)))throw new TypeError('Falta una oportunidad observable para un grupo participante.');
  return {...value,participantAges:ages};
}

export async function multiAgePlanningContext(scope,competencyIds) {
  const kb=await loadKnowledgeBaseV4();
  return {contract:'AyniCurriculumContext/v2',scope:'classroom',curriculum_contract_version:2,
    prompt_version:MULTI_AGE_PROMPT_VERSION,instructions:MULTI_AGE_PLANNING_INSTRUCTIONS,
    classroom:{participant_age_groups:scope.ages,staffing:'one_teacher_confirmed'},
    curriculum:scope.ages.map(age=>({age,cards:competencyIds.map(id=>{
      const card=kb.competencyCards.find(c=>c.id===id);if(!card)throw new TypeError('Competencia desconocida.');
      return {id:card.id,official_name:card.official_name,capacities:card.capacities,cycle_standard_ai:card.cycle_ii_standard_ai,semantic_text_policy:card.text_policy,age_reference:card.ages[String(age)]};
    }),official_performance_catalog:officialPerformanceContext(competencyIds,age)})),official_performance_version:OFFICIAL_PERFORMANCE_VERSION};
}
