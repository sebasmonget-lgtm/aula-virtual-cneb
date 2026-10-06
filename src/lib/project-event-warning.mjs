/** Literal event names and explicit metadata only; no model and no guessed event date. */
export function projectEventWarning(proposal,slot){
  const title=String(proposal.title??"").toLocaleLowerCase("es");
  const month=Number(proposal.event_month ?? (/navidad/.test(title)?12:/fiestas patrias/.test(title)?7:0));
  if(!month || Number(slot.starts_on.slice(5,7))===month || Number(slot.ends_on.slice(5,7))===month)return null;
  const months=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `Este proyecto fue planteado para ${months[month-1]}. Revisa si quieres trabajarlo del ${slot.starts_on} al ${slot.ends_on}.`;
}
