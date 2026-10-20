import curatedSheets from '../../assets/workshop-resources/minedu/manifest.json' with {type:'json'};

export function isWorkshopPrintResource(resource){
  return Boolean(resource&&typeof resource.url==='string'&&(
    /^\/workshops\/[a-z0-9-]+\.png$/.test(resource.url)||
    /^\/api\/library\/resources\/[a-z0-9-]+\/download$/.test(resource.url)));
}

/** Same availability rule in the library, Hoy and the authenticated PDF route.
 * Teacher guidance stays in Hoy; only child resources belong in this download.
 * @param {{resources:unknown,workshopId?:string,age?:number}} options */
export function hasWorkshopPrintMaterial({resources,workshopId,age}){
  return (Array.isArray(resources)&&resources.some(isWorkshopPrintResource))||
    curatedWorkshopSheets(workshopId,age).length>0;
}

export function curatedWorkshopSheets(workshopId,age){
  return curatedSheets.filter(sheet=>sheet.workshop_id===workshopId&&sheet.age===age);
}
