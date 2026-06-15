
# Comparar el PDF de vales con el sistema

## Lo que tenemos

- **PDF oficial:** `VALES_TIPO_SEPARADOS_ADONAY-2.pdf` con **120 páginas**, una página por (vale + tipo de casa + etapa). Cada página tiene una tabla con `Cantidad | Unidad | Descripción`.
- **Sistema:** 49 tipos de vales en la base de datos, con sus etapas, materiales y cantidades por tipo de casa (A1, A2, B, C).
- **Recordatorio del usuario:** el PDF tiene los materiales **duplicados** (M0012, M0207, etc. que ya unificamos). Cuando compare contra el sistema, tengo que mapear los duplicados al código bueno antes de marcar una diferencia.

## Paso 1: Extraer todos los vales del PDF

Leer las 120 páginas con `pdfplumber` y armar una lista de:
- Nombre del vale (ej: "VALE TIPO CANALIZACIONES MURO")
- Tipo de casa (A, A1, A2, B, C)
- Etapa (Etapa 1, 2, 3…)
- Lista de materiales con cantidad, unidad y descripción

Guardar en `/tmp/vales_pdf.json` para reusarlo sin re-procesar el PDF.

## Paso 2: Hacer match entre PDF y sistema

Por cada material del PDF:
1. Buscar el material en `materials_v2` por descripción (case-insensitive, ignorando espacios extra).
2. Si la descripción está en la lista de duplicados unificados (M0012→M0010, M0207→M0206, etc.), apuntar al código bueno.
3. Buscar el vale en `vale_types_v2` por nombre.
4. Buscar la etapa en `vale_stages` por número.
5. Buscar la cantidad esperada en `vale_reqs` para ese (vale + etapa + tipo de casa + material).

## Paso 3: Clasificar diferencias

Cada línea cae en una de estas categorías:

| Categoría | Significado |
|---|---|
| ✅ OK | Material existe, cantidad coincide |
| ⚠️ Cantidad distinta | El material está pero con otra cantidad |
| ⚠️ Unidad distinta | Está pero con otra unidad |
| ❌ Falta en sistema | El PDF lo tiene, el sistema no |
| ❌ Sobra en sistema | El sistema lo tiene, el PDF no |
| ❓ No reconocido | No encontré el material en el catálogo (typo, descripción nueva) |
| 🔀 Mapeo a unificado | Era un duplicado, se mapeó al código bueno |

## Paso 4: Entregar dos archivos

1. **Excel (`comparacion_vales.xlsx`)** con 4 hojas:
   - **Resumen:** conteo de cada categoría por vale.
   - **Diferencias críticas:** solo las filas con ❌ y ⚠️ (lo que hay que revisar).
   - **Todo:** la comparación completa fila por fila.
   - **No reconocidos:** materiales del PDF que no calzan con ningún código.

2. **PDF del sistema (`vales_sistema.pdf`)** con una página por vale, mostrando lo que el sistema cree que es cada vale (etapas, materiales, cantidades por tipo de casa) — para que puedas revisar visualmente lado a lado con tu PDF oficial.

## Cosas que voy a chequear con cuidado

- **Tipos de casa:** el PDF dice "Tipo A" (sin distinguir A1/A2). Voy a asumir que "Tipo A" del PDF = A1 + A2 en el sistema, salvo cuando el PDF diga explícitamente A1 o A2 (como en las puertas).
- **Etapas:** algunos vales en el PDF están sin número de etapa explícito. Los voy a emparejar por orden de aparición.
- **Tornillos y otras cosas que se parecen:** ya vimos que la medida + rosca + punta los hace distintos. Si el PDF dice `TORNILLO LENTEJA 8X3/4"` y el sistema tiene varios `LENTEJA 8X3/4` con distintas roscas/puntas, lo marco como ❓ y te lo paso para que decidas.
- **Materiales unificados:** llevo una lista interna (M0010←M0012, M0206←M0207, etc.) para no marcar como "falta" lo que en realidad ya quedó bajo otro código.

## Lo que NO voy a tocar

- Nada se modifica en la base de datos. Esto es solo un reporte de lectura.
- Después de revisar el reporte tú decides qué cambios aplicar y los hacemos en una migración aparte.

## Tiempo estimado

Procesar el PDF + comparar + generar Excel/PDF: alrededor de 1–2 minutos de ejecución una vez que pase a modo build.
