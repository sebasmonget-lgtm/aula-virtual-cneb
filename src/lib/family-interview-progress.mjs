export const familyInterviewAnswerFields = {
  interests:["interest_tags","interests","other_interest_text"],
  social_context:["social_play_tags","social_context"],
  home_activity_example:["home_activity_tags","home_activity_example"],
  communication_context:["language_tags","language_context","communication_tags","communication_context","other_language_text"],
  family_community_context:["community_tags","family_community_context","family_community_enjoyed","other_community_text"],
  participation_support_context:["participation_support_tags","participation_support_context"],
};
export function countFamilyInterviewAnswers(details) {
  return Object.values(familyInterviewAnswerFields).filter(fields=>fields.some(field=>{
    const value=details?.[field];
    return typeof value==='string'?Boolean(value.trim()):Array.isArray(value)&&value.length>0;
  })).length;
}
