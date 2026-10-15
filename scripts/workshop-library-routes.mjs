import {loadWorkshopLibrary,scheduleLibraryWorkshop} from '../src/lib/workshop-library-service.mjs';
import {httpStatusForError,publicErrorMessage} from '../src/lib/version-integrity.mjs';
export async function handleWorkshopLibrary({request,url,response,origin,db,teacherId,readJson,send}){
  if(url.pathname!=='/api/workshop-library'||!['GET','POST'].includes(request.method))return false;
  try{
    let data;
    if(request.method==='GET')data=await loadWorkshopLibrary(db,{teacherId,classroomId:url.searchParams.get('classroomId')});
    else{
      const {classroomId,workshopId,occursOn,clientRequestId}=await readJson(request);
      data=await scheduleLibraryWorkshop(db,{teacherId,classroomId,workshopId,occursOn,clientRequestId});
    }
    send(response,200,data,origin);
  }catch(error){send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin);}
  return true;
}
