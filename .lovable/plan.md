# Re-revisión de vales con las dos nuevas reglas

## Las reglas que me diste

1. **El PDF manda.** Los 49 vales del PDF (120 páginas) son la verdad. Si en el sistema sobra algo que el PDF no tiene → se saca del sistema. Si al PDF le falta algo o está en blanco → igual se respeta (vale vacío = vale vacío).
2. **Materiales duplicados/no unificados se arreglan.** Antes de comparar, aplico la unificación que ya habíamos acordado (M0012→M0010, M0207→M0206, "gas butano" == "Gas butano", "GRAPAS 2" == "grapas 2", etc.). Así no marco como "falta" o "sobra" algo que en realidad es el mismo material con otro nombre.

## Lo que voy a hacer (sólo lectura, sin tocar la base aún)

### Paso 1 — Normalizar nombres del PDF

Aplico mi lista de unificaciones a las descripciones del PDF antes de buscarlas en el sistema:

- Normalizo mayúsculas/minúsculas, espacios y comillas.
- Mapeo duplicados conocidos (los 8 grupos del archivo `Materiales_Duplicados_Para_Revisar.xlsx` + los que ya unificamos antes).
- Si después de normalizar un material del PDF sigue sin existir en `materials_v2`, queda en la lista "hay que crearlo en el sistema".

### Paso 2 — Comparar PDF → Sistema (PDF como verdad)

Para cada una de las 120 páginas (vale + tipo casa + etapa):

- ¿Existe el vale en `vale_types_v2`? Si no → **CREAR vale**.
- ¿Existe la etapa? Si no → **CREAR etapa**.
- Para cada material del PDF en esa etapa/casa:
  - Si la cantidad y unidad coinciden → ✅ OK.
  - Si la cantidad o unidad difieren → **ACTUALIZAR** al valor del PDF.
  - Si no está en el sistema → **AGREGAR** al sistema.
- Para cada material que el sistema tiene en ese vale/etapa/casa y que **no** aparece en el PDF → **QUITAR** del sistema (porque el PDF es la verdad).
- Si una página del PDF está en blanco (sin materiales) → el vale/etapa queda vacío en el sistema también (se borran las filas que sobren).

### Paso 3 — Clasificar todo en categorías de acción

Cada diferencia cae en una de estas, ya pensadas como "qué hay que hacer":


| Acción                        | Significado                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| ➕ Agregar material al vale    | El PDF lo tiene, el sistema no                                                            |
| ➖ Quitar material del vale    | El sistema lo tiene, el PDF no                                                            |
| 🔧 Cambiar cantidad           | Mismo material, cantidad distinta — gana la del PDF                                       |
| 🔧 Cambiar unidad             | Mismo material, unidad distinta — gana la del PDF                                         |
| 🆕 Crear material en catálogo | El PDF nombra un material que no existe en `materials_v2` ni siquiera después de unificar |
| 🆕 Crear vale o etapa         | El PDF tiene un vale/etapa que el sistema no tiene                                        |
| 🔀 Unificar duplicado         | Dos códigos distintos en el sistema apuntan al mismo material — se conserva uno           |
| ✅ OK                          | Coincide perfecto                                                                         |


### Paso 4 — Entregables

1. `**comparacion_vales_v2.xlsx**` con 5 hojas:
  - **Resumen:** conteo de acciones por vale.
  - **Plan de cambios:** la lista accionable, fila por fila, lista para revisar antes de migrar.
  - **Materiales a crear:** los que el PDF nombra y no existen.
  - **Unificaciones aplicadas:** qué nombres del PDF mapeé a qué código.
  - **Todo (trazabilidad):** comparación completa.
2. `**vales_sistema_v2.pdf**` actualizado mostrando cómo quedaría el sistema **después** de aplicar el plan (para que lo compares visualmente con tu PDF original).

### Paso 5 — Lo que NO hago todavía

- **No toco la base de datos.** Esto sigue siendo sólo el reporte.
- Cuando me digas "OK, aplica", recién ahí preparo una migración con todos los cambios juntos (crear vales/etapas/materiales, ajustar cantidades, quitar lo que sobra, unificar duplicados).

## Supuestos que mantengo del análisis anterior

- "Tipo A" del PDF = A1 y A2 en el sistema. se dublica, es decir, TIPO A1 y TIPO A2
- Etapas sin número se elimina la palabra ETAPA O ETAPAS,
- Tornillos/materiales muy parecidos: si el PDF dice algo genérico y el sistema tiene varias variantes (rosca/punta), te lo marco aparte para que decidas tú cuál es — SI ASUMES, RECUERDA LO QUE TE EXPLIQUE DE LOS TORNILLOS Y SUS CARACTERISTICAS.  
RECUERDA QUE TODOS LOS MATERIALES DEBES ANALIZARLOS CON MAYUSCULAS

## Tiempo estimado

1–2 minutos de ejecución cuando pase a modo build.

¿Le doy con esto, o quieres ajustar alguna regla antes?