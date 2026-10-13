/** Withdrawal is an owned revision event. Originals and private media remain available to their owner. */
export function guidedObservationActive(alias='diagnostic_experience_observations') {
  if(!/^[a-z_]+$/.test(alias))throw new Error('Invalid SQL alias');
  return `not exists(select 1 from profiles withdrawal_owner where withdrawal_owner.user_id=${alias}.created_by
    and withdrawal_owner.preferences->'guided_observation_revisions'->${alias}.id::text->-1->>'action'='withdraw')`;
}
