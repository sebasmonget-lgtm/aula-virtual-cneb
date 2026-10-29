// Persist only known diagnostic codes, never raw provider errors or user content.
const reasons=Object.freeze({
 timeout:'provider_uncertain',response_pending:'provider_uncertain',
 api_key_missing:'provider_unavailable',authentication_failed:'provider_unavailable',
 insufficient_quota:'provider_quota_exhausted',rate_limited:'provider_busy',
 provider_error:'provider_failed',response_failed:'provider_failed',
 response_incomplete:'provider_invalid_response',structured_output_invalid:'provider_invalid_response',
 response_refusal:'provider_invalid_response',model_mismatch:'provider_invalid_response',
 activity_references_mismatch:'provider_invalid_references',activity_route_mismatch:'provider_invalid_response',
 response_expired:'provider_response_expired',
});
export function multiAgeGenerationFailureCode(error){
 // A connection lost without an HTTP response may still have been processed.
 if(error?.reason==='provider_error'&&error.details?.status===null&&['TypeError','Error','SocketError','HeadersTimeoutError','BodyTimeoutError'].includes(error.details?.cause_name))return 'provider_uncertain';
 return Object.hasOwn(reasons,error?.reason)?reasons[error.reason]:'generation_failed';
}
export function multiAgeGenerationFailureMessage(code){
 const messages={
  provider_unavailable:'No se pudo acceder al servicio de IA. Tus respuestas están guardadas; revisaremos la conexión antes de volver a intentarlo.',
  provider_quota_exhausted:'El servicio de IA no tiene saldo disponible. Tus respuestas están guardadas.',
  provider_busy:'El servicio de IA está ocupado. Tus respuestas están guardadas; puedes volver a intentarlo más tarde.',
  provider_failed:'La conexión con el servicio de IA falló antes de recibir la propuesta completa. Tus respuestas están guardadas.',
  provider_invalid_response:'La IA no devolvió una propuesta completa y válida. Tus respuestas están guardadas; no se ha reemplazado ningún documento.',
  provider_invalid_references:'Una actividad no coincide con las competencias previstas en el proyecto. Lo preparado se conserva; puedes retomar lo pendiente.',
  provider_response_expired:'El servicio de IA ya no permite recuperar esta respuesta. Tus datos se conservan; puedes iniciar otro intento.',
  provider_uncertain:'La conexión se interrumpió antes de guardar el identificador de la respuesta. Tus datos se conservan; reintentar puede generar un nuevo consumo de IA.',
 };
 return Object.hasOwn(messages,code)?messages[code]:'No se pudo completar la propuesta. Tus respuestas y borradores se conservan.';
}
