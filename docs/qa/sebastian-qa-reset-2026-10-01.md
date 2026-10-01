# Reinicio de Sebastian QA · 2026-10-01

En el proyecto nuevo de staging `eetdkmmspicboijcmnzv` se verificó la identidad exacta de la cuenta Auth «Sebastian QA». El inventario transitorio por claves foráneas encontró 437 filas públicas dependientes de esa cuenta. Se retiraron por la API privada de Storage los dos objetos bajo su prefijo: un logo institucional y una evidencia fotográfica. Storage quedó sin objetos.

Una transacción con comprobación de identidad, rol docente, recuento esperado y Storage vacío eliminó las 437 filas dependientes, el refresh token y la sesión. La cuenta Auth se conservó para volver a iniciar QA. Una consulta independiente posterior devolvió: cuenta Auth 1; perfiles 0; años escolares 0; aulas 0; sesiones 0; objetos Storage 0. Un nuevo recorrido de las claves foráneas halló 0 filas dependientes.

El reinicio invalida la sesión anterior; la próxima entrada debe configurar el aula desde cero. No se tocaron cuentas ajenas ni el catálogo curricular compartido.
