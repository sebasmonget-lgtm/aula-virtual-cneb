export function evaluationNeedsEarlyWarning(today,endsOn){
  return !/^\d{4}-\d{2}-\d{2}$/.test(today??'')||!/^\d{4}-\d{2}-\d{2}$/.test(endsOn??'')||today<endsOn;
}
export function evaluationConfirmationSeconds(deadline,now=Date.now()){
  return Math.max(0,Math.ceil((deadline-now)/1000));
}
