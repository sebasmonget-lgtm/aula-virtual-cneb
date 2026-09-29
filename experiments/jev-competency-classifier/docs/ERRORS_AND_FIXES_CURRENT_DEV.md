# Errores relevantes de CURRENT DEV

## Privacidad por mera mención familiar

- Síntoma: AG-02/MN-01 se bloquearon antes de Luna; dibujar a la familia y mencionar mamá en un cuento también activaban privacidad.
- Causa: `anonymousDecisionText` comprueba FAMILY antes/después de anonimizar; una palabra familiar completa basta para devolver null. El runner transforma null en bloqueo común y omite proveedores.
- Solución: nuevo filtro experimental contextual, común a las cuatro variantes. Retirar veto léxico familiar y conservar identificadores/anonimización; detectar dirección concreta, sin alterar clasificadores durante este paso.
- Validación: tres pruebas de privacidad pasan, incluidas ambas frases obligatorias, identificadores ficticios reales en formato y equivalencia con V1 para textos sin familia. No se reabrieron etiquetas del test final.
- Prevención: regresiones obligatorias; separar mejora común de privacidad de mejora V2 y conservar ruta histórica.

## Costo desconocido de Luna fallida

- Síntoma detectado al revisar el nuevo runner: un error de red sin `billing` podía confundirse con brazo sin Luna y sumar US$0.
- Causa: el valor null representaba tanto «no se intentó Luna» como «se intentó sin usage disponible».
- Solución: registrar intento con costo/usage desconocidos y latencia medida. Salida pagada inválida conserva billing conocido; HTTP 401/402/403/429 detiene solicitudes posteriores.
- Validación: prueba de HTTP402 confirma Luna INTERPRET no se intenta después, costo total null y una llamada sin costo conocido. La prueba de JSON inválido conserva tokens y cargo tarifario positivo.
- Prevención: contar intentos y procedencia por separado; nunca reemplazar costo desconocido por cero.
