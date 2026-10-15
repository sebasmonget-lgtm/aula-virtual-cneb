import {isDeepStrictEqual} from 'node:util';
import {libraryRow} from './annual-year-editor.mjs';
import {VersionConflictError} from './version-integrity.mjs';

/** Authorization comes from saved year versions and the outgoing library snapshot, never a browser ID. */
export function assertSavedSlotReplacement(next, previous, nextId, previousId) {
  const slot=next.resolved_calendar?.projects.find(item=>item.proposal_id===nextId);
  const oldSlot=previous.resolved_calendar?.projects.find(item=>item.proposal_id===previousId);
  const old=previous.proposed_experiences?.find(item=>item.proposal_id===previousId);
  const preserved=next.available_experiences?.find(item=>item.proposal_id===previousId);
  if(!slot||!oldSlot||!old||slot.slot_id!==oldSlot.slot_id||slot.starts_on!==oldSlot.starts_on||slot.ends_on!==oldSlot.ends_on||
    !isDeepStrictEqual(preserved,libraryRow(old)))throw new VersionConflictError('Este día pertenece a otro proyecto. Conservamos su programación.');
}
