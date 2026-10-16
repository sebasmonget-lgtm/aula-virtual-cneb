export const DOCUMENT_FOLDERS=[
  {id:'diagnostic',title:'Evaluación diagnóstica',kinds:['diagnostic_summary']},
  {id:'annual',title:'Plan anual',kinds:['annual_plan']},
  {id:'experiences',title:'Proyectos y actividades',kinds:['experience','activity']},
  {id:'evaluation',title:'Evaluación',kinds:['family_report','period_closure']},
];
export function documentFolderKind(value){
  return DOCUMENT_FOLDERS.find(folder=>folder.id===value||folder.kinds.includes(value))?.id??value;
}
export function documentsInFolder(items,folderId){
  const folder=DOCUMENT_FOLDERS.find(folder=>folder.id===folderId);
  return folder?items.filter(item=>folder.kinds.includes(item.kind)):[];
}
export function documentFolderEntries(items){
  return DOCUMENT_FOLDERS.map(({id,title})=>({id,title,count:documentsInFolder(items,id).length}));
}
