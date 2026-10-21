const bounded=(value,fallback)=>typeof value==='string'&&/^[1-6]$/.test(value)?Number(value):fallback;
/** Preserve deployed defaults. Higher limits require a deliberate server configuration change. */
export function preparationLimits(env=process.env){
 const concurrent=bounded(env.AYNI_PREPARATION_CONCURRENCY,2);
 return{concurrent,perTeacher:Math.min(concurrent,bounded(env.AYNI_PREPARATION_PER_TEACHER_CONCURRENCY,2))};
}
