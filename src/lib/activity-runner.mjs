export function normalizeStepIndex(stepIndex, totalSteps) {
  if (!Number.isInteger(totalSteps) || totalSteps <= 0) return 0;
  if (!Number.isInteger(stepIndex)) return 0;
  return Math.min(Math.max(stepIndex, 0), totalSteps - 1);
}

export function isValidStepIndex(stepIndex, totalSteps) {
  return Number.isInteger(stepIndex) && Number.isInteger(totalSteps) && totalSteps > 0 && stepIndex >= 0 && stepIndex < totalSteps;
}
import {activityPedagogicalBlocks} from './pedagogical-blocks.mjs';

export function activityMomentCount(details,steps=[]){return activityPedagogicalBlocks(details,steps).length;}
/** The existing execution checkpoint records the last reached moment, never a UI-only claim. */
export function assertActivityMomentAction({action,stepIndex,currentStep=0,totalSteps,status}){
  if(action==='set_step'&&(!isValidStepIndex(stepIndex,totalSteps)||stepIndex>currentStep+1||status!=='active'))
    throw new TypeError('Avanza por los momentos de la actividad en orden.');
  if(action==='complete'&&totalSteps>1&&(status!=='active'||currentStep<totalSteps-1))
    throw new TypeError('Llega al último momento antes de terminar la actividad.');
}
