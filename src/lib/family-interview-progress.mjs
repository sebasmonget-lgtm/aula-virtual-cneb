import {familyInterviewVersionFor} from './family-interview-contract.mjs';
export const familyInterviewAnswerFields = {
  interests:["interest_tags","interests","other_interest_text"],
  social_context:["social_play_tags","social_context"],
  home_activity_example:["home_activity_tags","home_activity_example"],
  communication_context:["language_tags","language_context","communication_tags","communication_context","other_language_text"],
  family_community_context:["community_tags","family_community_context","family_community_enjoyed","other_community_text"],
  participation_support_context:["participation_support_tags","participation_support_context"],
};
export const familyInterviewCurrentAnswerFields = {
  interests: familyInterviewAnswerFields.interests,
  identity_autonomy_context: ['identity_autonomy_context'],
  social_context: familyInterviewAnswerFields.social_context,
  communication_context: familyInterviewAnswerFields.communication_context,
  literacy_context: ['literacy_context'],
  mathematics_context: ['mathematics_context'],
  exploration_context: ['exploration_context'],
  family_context: ['family_context','family_expectation','family_expectations'],
};
export const familyInterviewAnswerFieldsFor = version => version === 3 ? familyInterviewCurrentAnswerFields : familyInterviewAnswerFields;
export function countFamilyInterviewAnswers(details, version = familyInterviewVersionFor(details)) {
  return Object.values(familyInterviewAnswerFieldsFor(version)).filter(fields=>fields.some(field=>{
    const value=details?.[field];
    return typeof value==='string'?Boolean(value.trim()):Array.isArray(value)&&value.length>0;
  })).length;
}
