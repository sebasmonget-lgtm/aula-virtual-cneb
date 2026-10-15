import {isMaterialPlaceholder} from './annual-proposal-intent.mjs';
const concrete=value=>Array.isArray(value)?value.filter(item=>typeof item==='string'&&item.trim()&&!isMaterialPlaceholder(item)):[];
/** Read-only compatibility: use only literal resources from the saved project, never invented inventory. */
export function activityMaterials(materials,details={},project={}){
  const known=concrete(materials);
  if(Array.isArray(materials)&&!materials.some(isMaterialPlaceholder))return {materials:known,source:'activity'};
  const route=(project.activity_route??[]).find(item=>item.id===details.route_item_id);
  const routeMaterials=concrete(route?.materials);
  if(routeMaterials.length&&!route.materials.some(isMaterialPlaceholder))return {materials:[...new Set([...known,...routeMaterials])],source:'activity'};
  const resources=concrete(project.project_master?.resources??project.spaces_and_materials);
  return {materials:[...new Set([...known,...resources])],source:resources.length?'project':'incomplete'};
}
